-- CreateEnum
CREATE TYPE "RevokeReason" AS ENUM ('manual', 'forwarded');

-- AlterTable
ALTER TABLE "magic_links" ADD COLUMN     "revokedReason" "RevokeReason";
