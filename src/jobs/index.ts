import { emailProcessingJob } from './EmailProcessingJob';
import { responseSenderJob } from './ResponseSenderJob';

export class JobManager {
  private jobs = {
    emailProcessing: emailProcessingJob, // Combined sync + processing
    responseSender: responseSenderJob
  };

  startAll(): void {
    console.log('🚀 Starting all jobs...');
    
    Object.entries(this.jobs).forEach(([name, job]) => {
      try {
        job.start();
        console.log(`✅ Started ${name} job`);
      } catch (error) {
        console.error(`❌ Failed to start ${name} job:`, error);
      }
    });

    console.log('🚀 All jobs started');
  }

  stopAll(): void {
    console.log('🛑 Stopping all jobs...');
    
    Object.entries(this.jobs).forEach(([name, job]) => {
      try {
        job.stop();
        console.log(`✅ Stopped ${name} job`);
      } catch (error) {
        console.error(`❌ Failed to stop ${name} job:`, error);
      }
    });

    console.log('🛑 All jobs stopped');
  }

  getStatus(): Record<string, any> {
    return Object.fromEntries(
      Object.entries(this.jobs).map(([name, job]) => [
        name,
        job.getStatus()
      ])
    );
  }

  // Manual triggers for testing
  async triggerEmailProcessing(): Promise<void> {
    return this.jobs.emailProcessing.triggerProcessing();
  }

  async triggerResponseSending(): Promise<void> {
    return this.jobs.responseSender.triggerSending();
  }
}

export const jobManager = new JobManager();