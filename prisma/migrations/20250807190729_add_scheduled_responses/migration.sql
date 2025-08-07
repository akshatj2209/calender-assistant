-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED', 'FAILED', 'EDITING');

-- CreateTable
CREATE TABLE "scheduled_responses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailRecordId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "proposedTimeSlots" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "sentMessageId" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "editedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_responses_userId_scheduledAt_idx" ON "scheduled_responses"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_responses_status_scheduledAt_idx" ON "scheduled_responses"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "scheduled_responses" ADD CONSTRAINT "scheduled_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_responses" ADD CONSTRAINT "scheduled_responses_emailRecordId_fkey" FOREIGN KEY ("emailRecordId") REFERENCES "email_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
