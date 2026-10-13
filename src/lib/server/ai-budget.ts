import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { TutorUsage } from "@/lib/server/ai-tutor";

export const DAILY_AI_REQUEST_LIMIT = 10;
export const MONTHLY_AI_CAP_MICROS = 30_000_000;
export const TUTOR_MAX_REQUEST_BYTES = 16_000;
const PROVIDER_INPUT_OVERHEAD_TOKENS = 4_096;
const INPUT_MICROS_PER_TOKEN = 2;
const OUTPUT_MICROS_PER_TOKEN = 12;

export function reservedTutorCostMicros() {
  // UTF-8 request bytes bound token count; extra headroom covers API framing.
  const inputTokens = TUTOR_MAX_REQUEST_BYTES + PROVIDER_INPUT_OVERHEAD_TOKENS;
  return inputTokens * INPUT_MICROS_PER_TOKEN + 128 * OUTPUT_MICROS_PER_TOKEN;
}

export function actualTutorCostMicros(usage: TutorUsage) {
  if (typeof usage.costMicros === "number" && Number.isSafeInteger(usage.costMicros) && usage.costMicros >= 0) {
    return usage.costMicros;
  }
  return usage.inputTokens * INPUT_MICROS_PER_TOKEN + usage.outputTokens * OUTPUT_MICROS_PER_TOKEN;
}

export function tutorUsageSettlement(actualMicros: number) {
  // The schema stores money in an Int and the product cap is much smaller.
  // Saturating at the cap records enough to stop future calls without integer overflow.
  const cappedMicros = Math.min(actualMicros, MONTHLY_AI_CAP_MICROS);
  return {
    accountingMicros: cappedMicros,
    status: actualMicros >= MONTHLY_AI_CAP_MICROS ? "retained" as const : "settled" as const,
  };
}

export function tutorReservationDenial(dailyLimit: number, monthlyCapMicros: number, reservedMicros: number) {
  if (dailyLimit < 1) return "daily_limit" as const;
  if (monthlyCapMicros < reservedMicros) return "monthly_limit" as const;
  return null;
}

export function utcBillingPeriod(date: Date) {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { month, day };
}

function configuredMonthlyCapMicros() {
  const raw = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "30");
  if (!Number.isFinite(raw) || raw < 0) return MONTHLY_AI_CAP_MICROS;
  return Math.min(MONTHLY_AI_CAP_MICROS, Math.floor(raw * 1_000_000));
}

function configuredDailyLimit() {
  const raw = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? String(DAILY_AI_REQUEST_LIMIT));
  if (!Number.isFinite(raw) || raw < 0) return DAILY_AI_REQUEST_LIMIT;
  return Math.min(DAILY_AI_REQUEST_LIMIT, Math.floor(raw));
}

export async function expireOldReservations(database: PrismaClient, now: Date) {
  const expiredBefore = new Date(now.getTime() - 2 * 60_000);
  const abandoned = await database.aiUsageReservation.findMany({
    where: { status: "reserved", expiresAt: { lt: expiredBefore } },
    take: 100,
    select: { id: true, periodMonth: true, reservedMicros: true },
  });
  for (const reservation of abandoned) {
    await database.$transaction(async (transaction) => {
      const changed = await transaction.aiUsageReservation.updateMany({
        where: { id: reservation.id, status: "reserved" },
        data: { status: "expired", reconciledAt: now },
      });
      if (changed.count === 1) {
        await transaction.aiBudgetPeriod.update({
          where: { month: reservation.periodMonth },
          data: { reservedMicros: { decrement: reservation.reservedMicros } },
        });
      }
    });
  }

  const uncertain = await database.aiUsageReservation.findMany({
    where: { status: "in_flight", expiresAt: { lt: expiredBefore } },
    take: 100,
    select: { id: true },
  });
  if (uncertain.length > 0) {
    await database.aiUsageReservation.updateMany({
      where: { id: { in: uncertain.map(({ id }) => id) }, status: "in_flight" },
      data: { status: "retained", reconciledAt: now },
    });
  }
}

export async function reserveTutorCall(
  transaction: Prisma.TransactionClient,
  input: { userId: string; model: string; now: Date },
) {
  const { month, day } = utcBillingPeriod(input.now);
  const reservedMicros = reservedTutorCostMicros();
  const dailyLimit = configuredDailyLimit();
  const monthlyCapMicros = configuredMonthlyCapMicros();
  const denied = tutorReservationDenial(dailyLimit, monthlyCapMicros, reservedMicros);
  if (denied) return { kind: denied };
  const daily = await transaction.$queryRaw<Array<{ requestCount: number }>>`
    INSERT INTO "app"."AiRequestQuota" AS quota ("userId", "utcDay", "requestCount", "updatedAt")
    VALUES (${input.userId}, ${day}::date, 1, NOW())
    ON CONFLICT ("userId", "utcDay") DO UPDATE
      SET "requestCount" = quota."requestCount" + 1, "updatedAt" = NOW()
      WHERE quota."requestCount" < ${dailyLimit}
    RETURNING "requestCount"
  `;
  if (daily.length === 0) return { kind: "daily_limit" as const };

  const budget = await transaction.$queryRaw<Array<{ reservedMicros: number; spentMicros: number }>>`
    INSERT INTO "app"."AiBudgetPeriod" AS budget ("month", "capMicros", "reservedMicros", "spentMicros", "updatedAt")
    VALUES (${month}, ${monthlyCapMicros}, ${reservedMicros}, 0, NOW())
    ON CONFLICT ("month") DO UPDATE
      SET "capMicros" = LEAST(budget."capMicros", EXCLUDED."capMicros"),
          "reservedMicros" = budget."reservedMicros" + EXCLUDED."reservedMicros",
          "updatedAt" = NOW()
      WHERE budget."spentMicros" + budget."reservedMicros" + EXCLUDED."reservedMicros"
        <= LEAST(budget."capMicros", EXCLUDED."capMicros")
    RETURNING "reservedMicros", "spentMicros"
  `;
  if (budget.length === 0) {
    await transaction.$executeRaw`
      UPDATE "app"."AiRequestQuota"
      SET "requestCount" = GREATEST("requestCount" - 1, 0), "updatedAt" = NOW()
      WHERE "userId" = ${input.userId} AND "utcDay" = ${day}::date
    `;
    return { kind: "monthly_limit" as const };
  }

  const reservation = await transaction.aiUsageReservation.create({
    data: {
      userId: input.userId,
      periodMonth: month,
      model: input.model,
      reservedMicros,
      status: "reserved",
      expiresAt: new Date(input.now.getTime() + 2 * 60_000),
    },
    select: { id: true },
  });
  return {
    kind: "reserved" as const,
    id: reservation.id,
    remainingToday: dailyLimit - daily[0].requestCount,
  };
}

export async function markTutorCallInFlight(database: PrismaClient, reservationId: string) {
  const changed = await database.aiUsageReservation.updateMany({
    where: { id: reservationId, status: "reserved" },
    data: { status: "in_flight" },
  });
  return changed.count === 1;
}

export async function reconcileTutorCall(database: PrismaClient, reservationId: string, usage: TutorUsage, now: Date) {
  const actualMicros = actualTutorCostMicros(usage);
  await database.$transaction(async (transaction) => {
    const reservation = await transaction.aiUsageReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== "in_flight") return;
    const settlement = tutorUsageSettlement(actualMicros);
    // Claim settlement before adjusting the shared ledger. Concurrent replays
    // may both read in_flight; PostgreSQL rechecks this conditional update after
    // waiting on the row lock, so only one transaction can charge its usage.
    // Both writes commit together, and expiration uses the same lock order.
    const claimed = await transaction.aiUsageReservation.updateMany({
      where: { id: reservationId, status: "in_flight" },
      data: {
        status: settlement.status,
        actualMicros: settlement.accountingMicros,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        providerRequestId: usage.providerRequestId,
        reconciledAt: now,
      },
    });
    if (claimed.count !== 1) return;
    await transaction.$executeRaw`
      UPDATE "app"."AiBudgetPeriod"
      SET "reservedMicros" = GREATEST("reservedMicros" - ${reservation.reservedMicros}, 0),
          "spentMicros" = LEAST("capMicros", "spentMicros" + ${settlement.accountingMicros}),
          "updatedAt" = NOW()
      WHERE "month" = ${reservation.periodMonth}
    `;
  });
}

export async function retainTutorCall(database: PrismaClient, reservationId: string, now: Date, usage?: TutorUsage | null) {
  await database.aiUsageReservation.updateMany({
    where: { id: reservationId, status: "in_flight" },
    data: {
      status: "retained",
      ...(usage ? {
        actualMicros: actualTutorCostMicros(usage),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        providerRequestId: usage.providerRequestId,
      } : {}),
      reconciledAt: now,
    },
  });
}
