#!/usr/bin/env tsx

/**
 * Database Integration Test Script
 * 
 * This script tests all database functionality before integrating with APIs
 */

import { PrismaClient } from '@prisma/client';
import { userRepository, emailRepository, calendarRepository } from '@/database/repositories';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration?: number;
}

class DatabaseTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
    console.log(`🧪 Testing: ${name}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      const result: TestResult = { name, success: true, duration };
      this.results.push(result);
      console.log(`✅ ${name} - ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = { 
        name, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      };
      this.results.push(result);
      console.log(`❌ ${name} - ${error instanceof Error ? error.message : error}`);
      return result;
    }
  }

  async testDatabaseConnection(): Promise<void> {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   📡 Database connection successful');
  }

  async testPrismaClient(): Promise<void> {
    // Test basic Prisma operations
    const userCount = await prisma.user.count();
    const emailCount = await prisma.emailRecord.count();
    const eventCount = await prisma.calendarEventRecord.count();
    
    console.log(`   📊 Current data: Users(${userCount}), Emails(${emailCount}), Events(${eventCount})`);
  }

  async testUserRepository(): Promise<void> {
    // Test user creation
    const testEmail = `test-${Date.now()}@example.com`;
    const user = await userRepository.create({
      email: testEmail,
      name: 'Test User'
    });
    
    console.log(`   👤 Created user: ${user.id}`);
    
    // Test user lookup
    const foundUser = await userRepository.findByEmail(testEmail);
    if (!foundUser || foundUser.email !== testEmail) {
      throw new Error('User lookup failed');
    }
    
    // Test user config
    const config = await userRepository.updateUserConfig(user.id, {
      salesName: 'Test Sales Person',
      companyName: 'Test Company'
    });
    
    console.log(`   ⚙️ Updated user config: ${config.id}`);
    
    // Test cleanup
    await userRepository.delete(user.id);
    console.log(`   🧹 Cleaned up test user`);
  }

  async testEmailRepository(): Promise<void> {
    // Create a test user first
    const testUser = await userRepository.create({
      email: `email-test-${Date.now()}@example.com`,
      name: 'Email Test User'
    });
    
    // Test email creation
    const email = await emailRepository.create({
      userId: testUser.id,
      gmailMessageId: `test-msg-${Date.now()}`,
      gmailThreadId: `test-thread-${Date.now()}`,
      from: 'sender@example.com',
      to: testUser.email,
      subject: 'Test Email',
      body: 'This is a test email body',
      receivedAt: new Date()
    });
    
    console.log(`   📧 Created email: ${email.id}`);
    
    // Test email updates
    const updatedEmail = await emailRepository.markAsProcessed(email.id, {
      isDemoRequest: true,
      intentAnalysis: {
        confidence: 0.95,
        isDemoRequest: true,
        intentType: 'demo'
      }
    });
    
    console.log(`   📝 Updated email processing status`);
    
    // Test email search
    const emails = await emailRepository.findMany({
      userId: testUser.id,
      isDemoRequest: true
    });
    
    if (emails.length === 0) {
      throw new Error('Email search failed');
    }
    
    console.log(`   🔍 Found ${emails.length} demo request(s)`);
    
    // Cleanup
    await emailRepository.delete(email.id);
    await userRepository.delete(testUser.id);
    console.log(`   🧹 Cleaned up test data`);
  }

  async testCalendarRepository(): Promise<void> {
    // Create a test user first
    const testUser = await userRepository.create({
      email: `calendar-test-${Date.now()}@example.com`,
      name: 'Calendar Test User'
    });
    
    // Test calendar event creation
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    const event = await calendarRepository.create({
      userId: testUser.id,
      googleEventId: `test-event-${Date.now()}`,
      summary: 'Test Meeting',
      startTime,
      endTime,
      timezone: 'America/Los_Angeles',
      attendeeEmail: 'attendee@example.com',
      attendeeName: 'Test Attendee',
      isDemo: true
    });
    
    console.log(`   📅 Created calendar event: ${event.id}`);
    
    // Test event search
    const events = await calendarRepository.findMany({
      userId: testUser.id,
      isDemo: true
    });
    
    if (events.length === 0) {
      throw new Error('Calendar event search failed');
    }
    
    console.log(`   🔍 Found ${events.length} demo event(s)`);
    
    // Test event update
    await calendarRepository.markEventConfirmed(event.id);
    console.log(`   ✅ Marked event as confirmed`);
    
    // Cleanup
    await calendarRepository.delete(event.id);
    await userRepository.delete(testUser.id);
    console.log(`   🧹 Cleaned up test data`);
  }

  async testRelationships(): Promise<void> {
    // Create test user
    const testUser = await userRepository.create({
      email: `relations-test-${Date.now()}@example.com`,
      name: 'Relations Test User'
    });
    
    // Create email
    const email = await emailRepository.create({
      userId: testUser.id,
      gmailMessageId: `rel-msg-${Date.now()}`,
      gmailThreadId: `rel-thread-${Date.now()}`,
      from: 'sender@example.com',
      to: testUser.email,
      subject: 'Relationship Test',
      body: 'Testing relationships',
      receivedAt: new Date()
    });
    
    // Create calendar event linked to email
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    const event = await calendarRepository.create({
      userId: testUser.id,
      emailRecordId: email.id,
      googleEventId: `rel-event-${Date.now()}`,
      summary: 'Relationship Test Meeting',
      startTime,
      endTime,
      timezone: 'America/Los_Angeles',
      attendeeEmail: 'attendee@example.com',
      isDemo: true
    });
    
    // Test fetching with relationships
    const emailWithEvents = await emailRepository.findById(email.id);
    const eventWithEmail = await calendarRepository.findById(event.id);
    
    if (!emailWithEvents?.calendarEvents || emailWithEvents.calendarEvents.length === 0) {
      throw new Error('Email to calendar relationship failed');
    }
    
    if (!eventWithEmail?.emailRecord || eventWithEmail.emailRecord.id !== email.id) {
      throw new Error('Calendar to email relationship failed');
    }
    
    console.log(`   🔗 Relationships working correctly`);
    
    // Cleanup
    await calendarRepository.delete(event.id);
    await emailRepository.delete(email.id);
    await userRepository.delete(testUser.id);
    console.log(`   🧹 Cleaned up relationship test data`);
  }

  async testPerformance(): Promise<void> {
    // Test bulk operations
    const testUser = await userRepository.create({
      email: `perf-test-${Date.now()}@example.com`,
      name: 'Performance Test User'
    });
    
    // Create multiple emails
    const emails = [];
    for (let i = 0; i < 10; i++) {
      emails.push({
        userId: testUser.id,
        gmailMessageId: `perf-msg-${Date.now()}-${i}`,
        gmailThreadId: `perf-thread-${Date.now()}-${i}`,
        from: `sender${i}@example.com`,
        to: testUser.email,
        subject: `Performance Test ${i}`,
        body: `This is performance test email ${i}`,
        receivedAt: new Date()
      });
    }
    
    const startTime = Date.now();
    const createCount = await emailRepository.bulkCreate(emails);
    const bulkDuration = Date.now() - startTime;
    
    console.log(`   🚀 Bulk created ${createCount} emails in ${bulkDuration}ms`);
    
    // Test search performance
    const searchStart = Date.now();
    const foundEmails = await emailRepository.findMany({
      userId: testUser.id,
      limit: 20
    });
    const searchDuration = Date.now() - searchStart;
    
    console.log(`   🔍 Search found ${foundEmails.length} emails in ${searchDuration}ms`);
    
    // Cleanup
    for (const email of foundEmails) {
      await emailRepository.delete(email.id);
    }
    await userRepository.delete(testUser.id);
    console.log(`   🧹 Cleaned up performance test data`);
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
    }
    
    console.log('\n' + (failedTests === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    console.log('='.repeat(60));
  }

  async cleanup(): Promise<void> {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting Database Integration Tests\n');
  
  const tester = new DatabaseTester();
  
  try {
    // Core connectivity tests
    await tester.runTest('Database Connection', () => tester.testDatabaseConnection());
    await tester.runTest('Prisma Client Operations', () => tester.testPrismaClient());
    
    // Repository tests
    await tester.runTest('User Repository', () => tester.testUserRepository());
    await tester.runTest('Email Repository', () => tester.testEmailRepository());
    await tester.runTest('Calendar Repository', () => tester.testCalendarRepository());
    
    // Advanced tests
    await tester.runTest('Database Relationships', () => tester.testRelationships());
    await tester.runTest('Performance Tests', () => tester.testPerformance());
    
    // Print results
    tester.printSummary();
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
  
  // Exit with appropriate code
  const hasFailures = tester.results.some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;