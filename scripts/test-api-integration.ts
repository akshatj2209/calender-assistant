#!/usr/bin/env tsx

/**
 * API Integration Test Script
 * 
 * Tests the complete API integration with database
 */

import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';

const BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration?: number;
  response?: any;
}

class APIIntegrationTester {
  private results: TestResult[] = [];
  private serverProcess: ChildProcess | null = null;

  getResults(): TestResult[] {
    return this.results;
  }

  async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    console.log(`🧪 Testing: ${name}`);
    const startTime = Date.now();
    
    try {
      const response = await testFn();
      const duration = Date.now() - startTime;
      const result: TestResult = { name, success: true, duration, response };
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

  async startServer(): Promise<void> {
    console.log('🚀 Starting test server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev:backend'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 10000);

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('📋 Server:', output.trim());
        
        if (output.includes('Server running on')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Test server started');
          setTimeout(resolve, 2000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error('🔴 Server Error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping test server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  async testHealthEndpoint(): Promise<any> {
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.status || response.data.status !== 'healthy') {
      throw new Error('Health check failed');
    }
    
    console.log(`   💚 Server health: ${response.data.status}`);
    return response.data;
  }

  async testSystemStatus(): Promise<any> {
    const response = await axios.get(`${BASE_URL}/api/status`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const status = response.data.status;
    console.log(`   📊 System status: ${status.overall}`);
    console.log(`   💾 Database connection: ${status.system ? 'OK' : 'ERROR'}`);
    
    return response.data;
  }

  async testUserAPI(): Promise<any> {
    // Create user
    const createResponse = await axios.post(`${BASE_URL}/api/users`, {
      email: `test-${Date.now()}@example.com`,
      name: 'API Test User'
    });
    
    if (createResponse.status !== 201) {
      throw new Error(`Failed to create user: ${createResponse.status}`);
    }
    
    const userId = createResponse.data.user.id;
    console.log(`   👤 Created user: ${userId}`);
    
    // Get user
    const getResponse = await axios.get(`${BASE_URL}/api/users/${userId}`);
    
    if (getResponse.status !== 200) {
      throw new Error(`Failed to get user: ${getResponse.status}`);
    }
    
    console.log(`   📖 Retrieved user: ${getResponse.data.user.email}`);
    
    // Update user config
    const configResponse = await axios.put(`${BASE_URL}/api/users/${userId}/config`, {
      salesName: 'Test API Sales',
      companyName: 'Test API Company',
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00'
    });
    
    if (configResponse.status !== 200) {
      throw new Error(`Failed to update config: ${configResponse.status}`);
    }
    
    console.log(`   ⚙️ Updated user config`);
    
    // Get user stats
    const statsResponse = await axios.get(`${BASE_URL}/api/users/${userId}/stats?days=30`);
    
    if (statsResponse.status !== 200) {
      throw new Error(`Failed to get stats: ${statsResponse.status}`);
    }
    
    console.log(`   📊 Retrieved user stats`);
    
    // Cleanup - Delete user
    const deleteResponse = await axios.delete(`${BASE_URL}/api/users/${userId}`);
    
    if (deleteResponse.status !== 200) {
      throw new Error(`Failed to delete user: ${deleteResponse.status}`);
    }
    
    console.log(`   🧹 Cleaned up user`);
    
    return { userId, email: createResponse.data.user.email };
  }

  async testEmailAPI(): Promise<any> {
    // First create a user
    const userResponse = await axios.post(`${BASE_URL}/api/users`, {
      email: `email-test-${Date.now()}@example.com`,
      name: 'Email Test User'
    });
    
    const userId = userResponse.data.user.id;
    console.log(`   👤 Created test user for email testing`);
    
    // Create email record
    const createResponse = await axios.post(`${BASE_URL}/api/emails`, {
      userId: userId,
      gmailMessageId: `api-test-msg-${Date.now()}`,
      gmailThreadId: `api-test-thread-${Date.now()}`,
      from: 'sender@example.com',
      to: userResponse.data.user.email,
      subject: 'API Test Email',
      body: 'This is an API integration test email',
      receivedAt: new Date().toISOString()
    });
    
    if (createResponse.status !== 201) {
      throw new Error(`Failed to create email: ${createResponse.status}`);
    }
    
    const emailId = createResponse.data.email.id;
    console.log(`   📧 Created email record: ${emailId}`);
    
    // Mark as processed
    const processResponse = await axios.post(`${BASE_URL}/api/emails/${emailId}/mark-processed`, {
      isDemoRequest: true,
      intentAnalysis: {
        confidence: 0.95,
        isDemoRequest: true,
        intentType: 'demo'
      },
      contactInfo: {
        name: 'Test Contact',
        email: 'sender@example.com'
      }
    });
    
    if (processResponse.status !== 200) {
      throw new Error(`Failed to mark as processed: ${processResponse.status}`);
    }
    
    console.log(`   📝 Marked email as processed`);
    
    // Search emails
    const searchResponse = await axios.get(`${BASE_URL}/api/emails?userId=${userId}&isDemoRequest=true`);
    
    if (searchResponse.status !== 200) {
      throw new Error(`Failed to search emails: ${searchResponse.status}`);
    }
    
    console.log(`   🔍 Found ${searchResponse.data.emails.length} demo requests`);
    
    // Get email stats
    const statsResponse = await axios.get(`${BASE_URL}/api/emails/stats?userId=${userId}&days=1`);
    
    if (statsResponse.status !== 200) {
      throw new Error(`Failed to get email stats: ${statsResponse.status}`);
    }
    
    console.log(`   📊 Retrieved email statistics`);
    
    // Cleanup
    await axios.delete(`${BASE_URL}/api/emails/${emailId}`);
    await axios.delete(`${BASE_URL}/api/users/${userId}`);
    console.log(`   🧹 Cleaned up test data`);
    
    return { userId, emailId };
  }

  async testCalendarAPI(): Promise<any> {
    // Create a user first
    const userResponse = await axios.post(`${BASE_URL}/api/users`, {
      email: `calendar-test-${Date.now()}@example.com`,
      name: 'Calendar Test User'
    });
    
    const userId = userResponse.data.user.id;
    console.log(`   👤 Created test user for calendar testing`);
    
    // Create calendar event
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    const createResponse = await axios.post(`${BASE_URL}/api/calendar-events`, {
      userId: userId,
      googleEventId: `api-test-event-${Date.now()}`,
      summary: 'API Test Meeting',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone: 'America/Los_Angeles',
      attendeeEmail: 'attendee@example.com',
      attendeeName: 'Test Attendee',
      isDemo: true,
      meetingType: 'demo'
    });
    
    if (createResponse.status !== 201) {
      throw new Error(`Failed to create calendar event: ${createResponse.status}`);
    }
    
    const eventId = createResponse.data.event.id;
    console.log(`   📅 Created calendar event: ${eventId}`);
    
    // Confirm event
    const confirmResponse = await axios.post(`${BASE_URL}/api/calendar-events/${eventId}/confirm`);
    
    if (confirmResponse.status !== 200) {
      throw new Error(`Failed to confirm event: ${confirmResponse.status}`);
    }
    
    console.log(`   ✅ Confirmed calendar event`);
    
    // Get upcoming events
    const upcomingResponse = await axios.get(`${BASE_URL}/api/calendar-events/upcoming?userId=${userId}&days=7`);
    
    if (upcomingResponse.status !== 200) {
      throw new Error(`Failed to get upcoming events: ${upcomingResponse.status}`);
    }
    
    console.log(`   📆 Found ${upcomingResponse.data.events.length} upcoming events`);
    
    // Get calendar stats
    const statsResponse = await axios.get(`${BASE_URL}/api/calendar-events/stats?userId=${userId}&days=1`);
    
    if (statsResponse.status !== 200) {
      throw new Error(`Failed to get calendar stats: ${statsResponse.status}`);
    }
    
    console.log(`   📊 Retrieved calendar statistics`);
    
    // Cleanup
    await axios.delete(`${BASE_URL}/api/calendar-events/${eventId}`);
    await axios.delete(`${BASE_URL}/api/users/${userId}`);
    console.log(`   🧹 Cleaned up test data`);
    
    return { userId, eventId };
  }

  async testEndToEndWorkflow(): Promise<any> {
    console.log(`   🔄 Testing complete email-to-calendar workflow`);
    
    // Create user
    const userResponse = await axios.post(`${BASE_URL}/api/users`, {
      email: `workflow-test-${Date.now()}@example.com`,
      name: 'Workflow Test User'
    });
    
    const userId = userResponse.data.user.id;
    
    // Create email
    const emailResponse = await axios.post(`${BASE_URL}/api/emails`, {
      userId: userId,
      gmailMessageId: `workflow-msg-${Date.now()}`,
      gmailThreadId: `workflow-thread-${Date.now()}`,
      from: 'prospect@company.com',
      to: userResponse.data.user.email,
      subject: 'Demo Request - Workflow Test',
      body: 'Hi, I would like to schedule a demo for next week. Are you available Tuesday afternoon?',
      receivedAt: new Date().toISOString()
    });
    
    const emailId = emailResponse.data.email.id;
    
    // Mark as demo request
    await axios.post(`${BASE_URL}/api/emails/${emailId}/mark-processed`, {
      isDemoRequest: true,
      intentAnalysis: {
        confidence: 0.98,
        isDemoRequest: true,
        intentType: 'demo',
        urgency: 'medium'
      },
      timePreferences: {
        preferredDays: ['tuesday'],
        timeRange: 'afternoon',
        flexibility: 'somewhat_flexible'
      },
      contactInfo: {
        name: 'Prospect User',
        email: 'prospect@company.com',
        company: 'Prospect Company'
      }
    });
    
    // Create related calendar event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2 PM
    const eventEnd = new Date(tomorrow);
    eventEnd.setMinutes(eventEnd.getMinutes() + 30);
    
    const calendarResponse = await axios.post(`${BASE_URL}/api/calendar-events`, {
      userId: userId,
      emailRecordId: emailId, // Link to email
      googleEventId: `workflow-event-${Date.now()}`,
      summary: 'Demo - Prospect Company',
      description: 'Product demonstration requested via email',
      startTime: tomorrow.toISOString(),
      endTime: eventEnd.toISOString(),
      timezone: 'America/Los_Angeles',
      attendeeEmail: 'prospect@company.com',
      attendeeName: 'Prospect User',
      isDemo: true,
      meetingType: 'demo'
    });
    
    const eventId = calendarResponse.data.event.id;
    
    // Mark response sent
    await axios.post(`${BASE_URL}/api/emails/${emailId}/mark-response-sent`, {
      responseMessageId: `response-msg-${Date.now()}`
    });
    
    // Verify relationships
    const emailWithEvents = await axios.get(`${BASE_URL}/api/emails/${emailId}`);
    const eventWithEmail = await axios.get(`${BASE_URL}/api/calendar-events/${eventId}`);
    
    if (!emailWithEvents.data.email.calendarEvents || emailWithEvents.data.email.calendarEvents.length === 0) {
      throw new Error('Email to calendar relationship not working');
    }
    
    if (!eventWithEmail.data.event.emailRecord || eventWithEmail.data.event.emailRecord.id !== emailId) {
      throw new Error('Calendar to email relationship not working');
    }
    
    console.log(`   🔗 Verified data relationships`);
    console.log(`   📧 Email processed and linked to calendar event`);
    console.log(`   📅 Calendar event created with proper attendee info`);
    console.log(`   ✅ Response marked as sent`);
    
    // Cleanup
    await axios.delete(`${BASE_URL}/api/calendar-events/${eventId}`);
    await axios.delete(`${BASE_URL}/api/emails/${emailId}`);
    await axios.delete(`${BASE_URL}/api/users/${userId}`);
    
    return { userId, emailId, eventId, workflow: 'complete' };
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 API INTEGRATION TEST SUMMARY');
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
    
    console.log('\n' + (failedTests === 0 ? '🎉 ALL API TESTS PASSED!' : '⚠️  SOME API TESTS FAILED'));
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Starting API Integration Tests\n');
  
  const tester = new APIIntegrationTester();
  
  try {
    // Start server
    await tester.startServer();
    
    // Wait a moment for server to fully start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run tests
    await tester.runTest('Health Endpoint', () => tester.testHealthEndpoint());
    await tester.runTest('System Status', () => tester.testSystemStatus());
    await tester.runTest('User API', () => tester.testUserAPI());
    await tester.runTest('Email API', () => tester.testEmailAPI());
    await tester.runTest('Calendar API', () => tester.testCalendarAPI());
    await tester.runTest('End-to-End Workflow', () => tester.testEndToEndWorkflow());
    
    // Print results
    tester.printSummary();
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  } finally {
    await tester.stopServer();
  }
  
  // Exit with appropriate code
  const hasFailures = tester.getResults().some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;