-- Existing requests predate observation binding and cannot be safely replayed.
-- An empty fingerprint makes them return a conflict while new rows require a hash.
ALTER TABLE "app"."TutorRequest" ADD COLUMN "requestFingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "app"."TutorRequest" ALTER COLUMN "requestFingerprint" DROP DEFAULT;
