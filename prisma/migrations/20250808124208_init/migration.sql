-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED', 'FAILED', 'EDITING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salesName" TEXT,
    "salesEmail" TEXT,
    "companyName" TEXT,
    "emailSignature" TEXT,
    "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "businessHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "meetingDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferTime" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "messageIdHeader" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "isDemoRequest" BOOLEAN,
    "responseGenerated" BOOLEAN NOT NULL DEFAULT false,
    "responseSent" BOOLEAN NOT NULL DEFAULT false,
    "responseMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "calendar_event_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailRecordId" TEXT,
    "googleEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "summary" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "attendeeName" TEXT,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "google_tokens_userId_key" ON "google_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_records_gmailMessageId_key" ON "email_records"("gmailMessageId");

-- CreateIndex
CREATE INDEX "email_records_userId_processedAt_idx" ON "email_records"("userId", "processedAt");

-- CreateIndex
CREATE INDEX "email_records_gmailMessageId_idx" ON "email_records"("gmailMessageId");

-- CreateIndex
CREATE INDEX "email_records_processingStatus_idx" ON "email_records"("processingStatus");

-- CreateIndex
CREATE INDEX "email_records_messageIdHeader_idx" ON "email_records"("messageIdHeader");

-- CreateIndex
CREATE INDEX "scheduled_responses_userId_scheduledAt_idx" ON "scheduled_responses"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_responses_status_scheduledAt_idx" ON "scheduled_responses"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "calendar_event_records_userId_startTime_idx" ON "calendar_event_records"("userId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_event_records_attendeeEmail_idx" ON "calendar_event_records"("attendeeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_records_googleEventId_calendarId_key" ON "calendar_event_records"("googleEventId", "calendarId");

-- AddForeignKey
ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_responses" ADD CONSTRAINT "scheduled_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_responses" ADD CONSTRAINT "scheduled_responses_emailRecordId_fkey" FOREIGN KEY ("emailRecordId") REFERENCES "email_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_records" ADD CONSTRAINT "calendar_event_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_records" ADD CONSTRAINT "calendar_event_records_emailRecordId_fkey" FOREIGN KEY ("emailRecordId") REFERENCES "email_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
