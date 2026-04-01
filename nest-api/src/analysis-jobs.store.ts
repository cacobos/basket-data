import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

type DbJsonValue =
  | string
  | number
  | boolean
  | null
  | DbJsonObject
  | DbJsonValue[];

export interface DbJsonObject {
  [key: string]: DbJsonValue;
}

export interface StoredAnalysisJob {
  id: string;
  status: string;
  request: DbJsonObject;
  result: DbJsonValue | null;
  error: string | null;
  launchedBy: DbJsonObject | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AnalysisJobsStore implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool | null;
  private readonly memoryJobs = new Map<string, StoredAnalysisJob>();

  constructor() {
    const connectionString = (process.env.DATABASE_URL || '').trim();
    this.pool = connectionString
      ? new Pool({
          connectionString,
          max: 5,
          ssl:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : undefined,
        })
      : null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        request JSONB NOT NULL,
        result JSONB,
        error TEXT,
        launched_by JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      ALTER TABLE analysis_jobs
      ADD COLUMN IF NOT EXISTS launched_by JSONB;
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS analysis_jobs_created_at_idx
      ON analysis_jobs (created_at DESC);
    `);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async createJob(
    id: string,
    status: string,
    request: DbJsonObject,
    launchedBy: DbJsonObject | null,
  ): Promise<StoredAnalysisJob> {
    const now = new Date();
    if (!this.pool) {
      const job: StoredAnalysisJob = {
        id,
        status,
        request,
        result: null,
        error: null,
        launchedBy,
        createdAt: now,
        updatedAt: now,
      };
      this.memoryJobs.set(id, job);
      return job;
    }

    const result = await this.pool.query(
      `
      INSERT INTO analysis_jobs (id, status, request, launched_by)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
      RETURNING id, status, request, result, error, launched_by, created_at, updated_at;
      `,
      [id, status, JSON.stringify(request), JSON.stringify(launchedBy)],
    );

    return this.mapRow(result.rows[0]);
  }

  async listJobsSince(cutoff: Date): Promise<StoredAnalysisJob[]> {
    if (!this.pool) {
      return Array.from(this.memoryJobs.values())
        .filter((job) => job.createdAt >= cutoff)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const result = await this.pool.query(
      `
      SELECT id, status, request, result, error, created_at, updated_at
      FROM analysis_jobs
      WHERE created_at >= $1
      ORDER BY created_at DESC;
      `,
      [cutoff.toISOString()],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async getJobById(id: string): Promise<StoredAnalysisJob | null> {
    if (!this.pool) {
      return this.memoryJobs.get(id) ?? null;
    }

    const result = await this.pool.query(
      `
      SELECT id, status, request, result, error, created_at, updated_at
      FROM analysis_jobs
      WHERE id = $1
      LIMIT 1;
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async deleteBefore(cutoff: Date): Promise<string[]> {
    if (!this.pool) {
      const deletedIds: string[] = [];
      for (const [jobId, job] of this.memoryJobs.entries()) {
        if (job.createdAt < cutoff) {
          deletedIds.push(jobId);
          this.memoryJobs.delete(jobId);
        }
      }

      return deletedIds;
    }

    const result = await this.pool.query(
      `
      DELETE FROM analysis_jobs
      WHERE created_at < $1
      RETURNING id;
      `,
      [cutoff.toISOString()],
    );

    return result.rows.map((row) => String(row.id));
  }

  async updateStatus(id: string, status: string): Promise<StoredAnalysisJob> {
    if (!this.pool) {
      const current = this.memoryJobs.get(id);
      if (!current) {
        throw new Error(`Job ${id} no encontrado`);
      }

      const updated: StoredAnalysisJob = {
        ...current,
        status,
        updatedAt: new Date(),
      };
      this.memoryJobs.set(id, updated);
      return updated;
    }

    const result = await this.pool.query(
      `
      UPDATE analysis_jobs
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, request, result, error, launched_by, created_at, updated_at;
      `,
      [id, status],
    );

    return this.mapRow(result.rows[0]);
  }

  async updateRequest(id: string, request: unknown): Promise<void> {
    if (!this.pool) {
      const current = this.memoryJobs.get(id);
      if (current) {
        this.memoryJobs.set(id, {
          ...current,
          request: this.ensureObject(request),
          updatedAt: new Date(),
        });
      }

      return;
    }

    await this.pool.query(
      `
      UPDATE analysis_jobs
      SET request = $2::jsonb, updated_at = NOW()
      WHERE id = $1;
      `,
      [id, JSON.stringify(request)],
    );
  }

  async completeJob(
    id: string,
    resultPayload: unknown,
  ): Promise<StoredAnalysisJob> {
    if (!this.pool) {
      const current = this.memoryJobs.get(id);
      if (!current) {
        throw new Error(`Job ${id} no encontrado`);
      }

      const updated: StoredAnalysisJob = {
        ...current,
        status: 'completed',
        result: this.ensureJsonValue(resultPayload),
        error: null,
        updatedAt: new Date(),
      };
      this.memoryJobs.set(id, updated);
      return updated;
    }

    const result = await this.pool.query(
      `
      UPDATE analysis_jobs
      SET status = 'completed', result = $2::jsonb, error = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, request, result, error, launched_by, created_at, updated_at;
      `,
      [id, JSON.stringify(resultPayload)],
    );

    return this.mapRow(result.rows[0]);
  }

  async failJob(id: string, errorMessage: string): Promise<StoredAnalysisJob> {
    if (!this.pool) {
      const current = this.memoryJobs.get(id);
      if (!current) {
        throw new Error(`Job ${id} no encontrado`);
      }

      const updated: StoredAnalysisJob = {
        ...current,
        status: 'failed',
        error: errorMessage,
        updatedAt: new Date(),
      };
      this.memoryJobs.set(id, updated);
      return updated;
    }

    const result = await this.pool.query(
      `
      UPDATE analysis_jobs
      SET status = 'failed', error = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, request, result, error, launched_by, created_at, updated_at;
      `,
      [id, errorMessage],
    );

    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): StoredAnalysisJob {
    return {
      id: String(row.id),
      status: String(row.status),
      request: this.ensureObject(row.request),
      result: this.ensureJsonValue(row.result),
      error: row.error == null ? null : String(row.error),
      launchedBy: row.launched_by ? this.ensureObject(row.launched_by) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private ensureObject(value: unknown): DbJsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as DbJsonObject;
  }

  private ensureJsonValue(value: unknown): DbJsonValue | null {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value ?? null;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.ensureJsonValue(item));
    }

    if (typeof value === 'object') {
      const result: DbJsonObject = {};
      for (const [key, entry] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const normalized = this.ensureJsonValue(entry);
        if (normalized !== null) {
          result[key] = normalized;
        }
      }

      return result;
    }

    return String(value);
  }
}
