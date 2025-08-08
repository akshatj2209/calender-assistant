import { PrismaClient } from '@prisma/client';
import { config } from '@/utils/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create or find default user (using env vars if available, otherwise defaults)
    const defaultEmail = process.env.SALES_EMAIL || 'demo@example.com';
    const defaultName = process.env.SALES_NAME || 'Demo User';
    const defaultCompany = process.env.COMPANY_NAME || 'Demo Company';

    const defaultUser = await prisma.user.upsert({
      where: { email: defaultEmail },
      update: {
        name: defaultName
      },
      create: {
        email: defaultEmail,
        name: defaultName,
        salesName: defaultName,
        salesEmail: defaultEmail,
        companyName: defaultCompany,
        emailSignature: `Best regards,\n${defaultName}\n${defaultCompany}\n\nThis email was sent automatically by our scheduling assistant.`,
        businessHoursStart: config.businessRules.businessHours.start,
        businessHoursEnd: config.businessRules.businessHours.end,
        workingDays: config.businessRules.workingDays,
        timezone: config.businessRules.timezone,
        meetingDuration: config.businessRules.meetingDuration,
        bufferTime: config.businessRules.bufferTime
      }
    });

    console.log(`✅ Default user created/updated: ${defaultUser.email}`);

    // System configuration now handled per-user in the user record
    console.log(`✅ User configuration stored in user record`);

    // In development, create some sample data
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Creating development sample data...');

      // Create sample email records
      const sampleEmails = [
        {
          userId: defaultUser.id,
          gmailMessageId: 'sample-msg-001',
          gmailThreadId: 'sample-thread-001',
          from: 'john.doe@example.com',
          to: defaultUser.email,
          subject: 'Interested in a demo',
          body: 'Hi there, I saw your product on LinkedIn and would love to learn more. Are you free for a quick demo sometime early next week?',
          receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          isDemoRequest: true,
          processingStatus: 'COMPLETED' as const,
          processedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
          responseGenerated: true,
          responseSent: true
        },
        {
          userId: defaultUser.id,
          gmailMessageId: 'sample-msg-002',
          gmailThreadId: 'sample-thread-002',
          from: 'sarah.smith@techstart.io',
          to: defaultUser.email,
          subject: 'Product inquiry',
          body: 'Hello, I represent TechStart and we are looking for solutions like yours. Could we schedule a call this week?',
          receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isDemoRequest: true,
          processingStatus: 'PENDING' as const
        }
      ];

      for (const emailData of sampleEmails) {
        await prisma.emailRecord.upsert({
          where: { gmailMessageId: emailData.gmailMessageId },
          update: emailData,
          create: emailData
        });
      }

      // Create sample calendar event
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30);

      await prisma.calendarEventRecord.upsert({
        where: {
          googleEventId_calendarId: {
            googleEventId: 'sample-event-001',
            calendarId: 'primary'
          }
        },
        update: {},
        create: {
          userId: defaultUser.id,
          googleEventId: 'sample-event-001',
          calendarId: 'primary',
          summary: 'Product Demo - John Doe',
          startTime: tomorrow,
          endTime: endTime,
          timezone: config.businessRules.timezone,
          attendeeEmail: 'john.doe@example.com',
          attendeeName: 'John Doe',
          status: 'CONFIRMED'
        }
      });

      console.log('✅ Sample development data created');
    }

    // Create activity log entry for seeding
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📧 Default user: ${defaultUser.email}`);
    console.log(`🏢 Company: ${defaultCompany}`);
    console.log(`⏰ Business hours: ${config.businessRules.businessHours.start} - ${config.businessRules.businessHours.end}`);

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle different execution contexts
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export default main;