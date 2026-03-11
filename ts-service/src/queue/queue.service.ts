import { randomUUID } from "crypto";

import { Injectable, Logger } from "@nestjs/common";

export interface EnqueuedJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  enqueuedAt: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly jobs: EnqueuedJob[] = [];

  enqueue<TPayload>(name: string, payload: TPayload): EnqueuedJob<TPayload> {
    const job: EnqueuedJob<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      enqueuedAt: new Date().toISOString(),
    };

    this.jobs.push(job);
    this.logger.log(`Job ${job.id} enqueued: ${name}`);
    return job;
  }

  dequeue(name: string): EnqueuedJob | undefined {
    const index = this.jobs.findIndex((j) => j.name === name);
    if (index === -1) return undefined;
    return this.jobs.splice(index, 1)[0];
  }

  getQueuedJobs(): readonly EnqueuedJob[] {
    return this.jobs;
  }
}
