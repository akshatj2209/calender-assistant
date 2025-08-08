-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "email_records" ADD COLUMN     "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND';
