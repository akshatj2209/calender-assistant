import { PrismaClient } from '@prisma/client';
import { config } from '@/utils/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create or find default user based on config
    const defaultUser = await prisma.user.upsert({
      where: { email: config.email.salesEmail },
      update: {
        name: config.email.salesName
      },
      create: {
        email: config.email.salesEmail,
        name: config.email.salesName,
        userConfig: {
          create: {
            businessHoursStart: config.businessRules.businessHours.start,
            businessHoursEnd: config.businessRules.businessHours.end,
            workingDays: config.businessRules.workingDays,
            timezone: config.businessRules.timezone,
            meetingDuration: config.businessRules.meetingDuration,
            bufferTime: config.businessRules.bufferTime,
            travelBufferTime: config.businessRules.travelBufferTime,
            maxLookaheadDays: config.businessRules.maxLookaheadDays,
            minAdvanceNotice: config.businessRules.minAdvanceNotice,
            salesName: config.email.salesName,
            companyName: config.email.companyName,
            emailSignature: config.email.signatureTemplate,
            autoRespond: true,
            checkIntervalMinutes: config.monitoring.checkIntervalMinutes,
            maxEmailsPerCheck: config.monitoring.maxEmailsPerCheck
          }
        }
      },
      include: {
        userConfig: true
      }
    });

    console.log(`✅ Default user created/updated: ${defaultUser.email}`);

    // Create system configuration entries
    const systemConfigs = [
      {
        key: 'email_templates.demo_response',
        value: {
          subject: 'Demo Scheduling Options',
          template: `Hi {recipientName},

Thank you for your interest in {companyName}! I'd be happy to schedule a demo for you.

Based on my current availability, here are a few times that work well:

{proposedTimes}

Please let me know which option works best for you, and I'll send over a calendar invite with the meeting details.

Looking forward to showing you what we've built!

Best regards,
{senderName}`
        },
        description: 'Default template for demo response emails'
      },
      {
        key: 'ai_prompts.intent_analysis',
        value: {
          system: 'You are an AI assistant that analyzes business emails to identify demo requests and sales inquiries.',
          template: `Analyze this email and determine if it's requesting a product demonstration, sales meeting, or similar business meeting.

Consider these factors:
- Explicit requests ("can we schedule a demo", "interested in a meeting")
- Implicit interest ("would like to learn more", "tell me about your product")  
- Business context and professional language
- Urgency indicators

Email: {emailContent}

Respond with JSON: {"isDemoRequest": boolean, "confidence": number, "intentType": string, "urgency": string, "reasoning": string, "keywords": array}`
        },
        description: 'AI prompt template for email intent analysis'
      },
      {
        key: 'business_rules.default',
        value: {
          businessHours: { start: '09:00', end: '17:00' },
          workingDays: [1, 2, 3, 4, 5],
          meetingDuration: 30,
          bufferTime: 30,
          travelBufferTime: 60,
          maxLookaheadDays: 5,
          minAdvanceNotice: 2
        },
        description: 'Default business rules for new users'
      }
    ];

    for (const configItem of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: configItem.key },
        update: {
          value: configItem.value,
          description: configItem.description
        },
        create: {
          key: configItem.key,
          value: configItem.value,
          description: configItem.description,
          isActive: true
        }
      });
    }

    console.log(`✅ System configuration updated (${systemConfigs.length} entries)`);

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
          intentAnalysis: {
            isDemoRequest: true,
            confidence: 0.95,
            intentType: 'demo',
            urgency: 'medium',
            keywords: ['demo', 'learn more', 'interested']
          },
          contactInfo: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            company: 'Example Corp'
          }
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
          description: 'Demo meeting with John from Example Corp',
          startTime: tomorrow,
          endTime: endTime,
          timezone: config.businessRules.timezone,
          attendeeEmail: 'john.doe@example.com',
          attendeeName: 'John Doe',
          isDemo: true,
          meetingType: 'demo',
          status: 'CONFIRMED'
        }
      });

      // Create sample metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.processingMetrics.upsert({
        where: {
          userId_date: {
            userId: defaultUser.id,
            date: today
          }
        },
        update: {},
        create: {
          userId: defaultUser.id,
          date: today,
          emailsProcessed: 15,
          demoRequestsDetected: 3,
          responsesGenerated: 3,
          responsesSent: 2,
          successfulProcessing: 14,
          failedProcessing: 1,
          aiAnalysisCalls: 15,
          aiAnalysisSuccessful: 14,
          eventsCreated: 2,
          eventsConfirmed: 1,
          averageProcessingTime: 1250.5,
          totalProcessingTime: 18757.5
        }
      });

      console.log('✅ Sample development data created');
    }

    // Create activity log entry for seeding
    await prisma.activityLog.create({
      data: {
        action: 'CONFIG_UPDATED',
        resource: 'database',
        description: 'Database seeded successfully',
        status: 'SUCCESS',
        metadata: {
          seedTimestamp: new Date(),
          environment: process.env.NODE_ENV || 'development',
          userEmail: config.email.salesEmail
        }
      }
    });

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📧 Default user: ${defaultUser.email}`);
    console.log(`🏢 Company: ${config.email.companyName}`);
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