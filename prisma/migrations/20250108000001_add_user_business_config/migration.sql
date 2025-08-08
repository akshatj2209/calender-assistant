-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bufferTime" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "businessHoursEnd" TEXT NOT NULL DEFAULT '17:00',
ADD COLUMN     "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "emailSignature" TEXT,
ADD COLUMN     "meetingDuration" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "salesEmail" TEXT,
ADD COLUMN     "salesName" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];