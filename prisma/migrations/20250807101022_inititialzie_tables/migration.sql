-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeResponse" AS ENUM ('NEEDS_ACTION', 'DECLINED', 'TENTATIVE', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL_RECEIVED', 'EMAIL_PROCESSED', 'DEMO_DETECTED', 'RESPONSE_SENT', 'CALENDAR_EVENT_CREATED', 'USER_AUTHENTICATED', 'CONFIG_UPDATED', 'ERROR_OCCURRED');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "isDemoRequest" BOOLEAN,
    "intentAnalysis" JSONB,
    "timePreferences" JSONB,
    "contactInfo" JSONB,
    "responseGenerated" BOOLEAN NOT NULL DEFAULT false,
    "responseSent" BOOLEAN NOT NULL DEFAULT false,
    "responseMessageId" TEXT,
    "errors" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailRecordId" TEXT,
    "googleEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "location" TEXT,
    "attendeeEmail" TEXT NOT NULL,
    "attendeeName" TEXT,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "attendeeResponse" "AttendeeResponse" NOT NULL DEFAULT 'NEEDS_ACTION',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "meetingType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "businessHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "meetingDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferTime" INTEGER NOT NULL DEFAULT 30,
    "travelBufferTime" INTEGER NOT NULL DEFAULT 60,
    "maxLookaheadDays" INTEGER NOT NULL DEFAULT 5,
    "minAdvanceNotice" INTEGER NOT NULL DEFAULT 2,
    "salesName" TEXT,
    "companyName" TEXT,
    "emailSignature" TEXT,
    "autoRespond" BOOLEAN NOT NULL DEFAULT true,
    "checkIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "maxEmailsPerCheck" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "emailsProcessed" INTEGER NOT NULL DEFAULT 0,
    "demoRequestsDetected" INTEGER NOT NULL DEFAULT 0,
    "responsesGenerated" INTEGER NOT NULL DEFAULT 0,
    "responsesSent" INTEGER NOT NULL DEFAULT 0,
    "successfulProcessing" INTEGER NOT NULL DEFAULT 0,
    "failedProcessing" INTEGER NOT NULL DEFAULT 0,
    "aiAnalysisCalls" INTEGER NOT NULL DEFAULT 0,
    "aiAnalysisSuccessful" INTEGER NOT NULL DEFAULT 0,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "eventsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "averageProcessingTime" DOUBLE PRECISION,
    "totalProcessingTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ActivityType" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "LogStatus" NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "calendar_event_records_userId_startTime_idx" ON "calendar_event_records"("userId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_event_records_attendeeEmail_idx" ON "calendar_event_records"("attendeeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_records_googleEventId_calendarId_key" ON "calendar_event_records"("googleEventId", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "user_configs_userId_key" ON "user_configs"("userId");

-- CreateIndex
CREATE INDEX "processing_metrics_date_idx" ON "processing_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "processing_metrics_userId_date_key" ON "processing_metrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_createdAt_idx" ON "activity_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_records" ADD CONSTRAINT "calendar_event_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_records" ADD CONSTRAINT "calendar_event_records_emailRecordId_fkey" FOREIGN KEY ("emailRecordId") REFERENCES "email_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_configs" ADD CONSTRAINT "user_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_metrics" ADD CONSTRAINT "processing_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
