import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";

const profileInput = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(400).nullable().optional(),
});

const profileShape = { select: { displayName: true, bio: true, updatedAt: true } } as const;

export async function GET() {
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();

  const profile = await database.profile.findUnique({ where: { userId: auth.user.id }, ...profileShape });
  return noStoreJson({ profile });
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = profileInput.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  const changes = {
    ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
    ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
  };
  const profile = await database.profile.upsert({
    where: { userId: auth.user.id },
    create: { userId: auth.user.id, ...changes },
    update: changes,
    ...profileShape,
  });
  return noStoreJson({ profile });
}
