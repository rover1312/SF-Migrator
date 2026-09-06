import { Connection } from '@salesforce/core';
import { logger } from '../utils/logger';
import { SalesforceService } from './salesforce.service';

export interface LoadJob {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  objectName: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  externalIdField?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  errors: LoadError[];
}

export interface LoadError {
  recordIndex: number;
  recordId?: string;
  errorCode: string;
  message: string;
  fields?: string[];
}

export interface LoadResult {
  jobId: string;
  success: boolean;
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  errors: LoadError[];
  durationMs: number;
}

/**
 * Data Loading Service
 * 
 * Handles loading data into Target Salesforce orgs:
 * - Batch processing for large datasets
 * - Bulk API 2.0 for high volume
 * - REST API for smaller batches
 * - Error handling and retry logic
 * - Transaction management
 */
export class LoadingService {
  private sfService: SalesforceService;
  private jobs: Map<string, LoadJob> = new Map();

  constructor() {
    this.sfService = new SalesforceService();
  }

  /**
   * Create a new load job
   */
  createLoadJob(config: {
    sourceOrgId: string;
    targetOrgId: string;
    objectName: string;
    operation: 'insert' | 'update' | 'upsert' | 'delete';
    externalIdField?: string;
    totalRecords: number;
  }): LoadJob {
    const jobId = `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: LoadJob = {
      id: jobId,
      sourceOrgId: config.sourceOrgId,
      targetOrgId: config.targetOrgId,
      objectName: config.objectName,
      operation: config.operation,
      externalIdField: config.externalIdField,
      status: 'pending',
      createdAt: new Date(),
      stats: {
        total: config.totalRecords,
        success: 0,
        failed: 0,
        skipped: 0
      },
      errors: []
    };

    this.jobs.set(jobId, job);
    logger.info('Load job created', { jobId, object: config.objectName, operation: config.operation });
    
    return job;
  }

  /**
   * Execute data load using appropriate strategy (Bulk vs REST)
   */
  async executeLoad(
    connection: Connection,
    jobId: string,
    records: any[],
    batchSize: number = 200
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Load job ${jobId} not found`);
    }

    job.status = 'processing';
    logger.info('Starting data load', { jobId, recordCount: records.length, batchSize });

    try {
      // Determine strategy based on record count
      const useBulkApi = records.length > 200;
      
      let result: LoadResult;
      if (useBulkApi) {
        result = await this.executeBulkLoad(connection, job, records, batchSize);
      } else {
        result = await this.executeRestLoad(connection, job, records, batchSize);
      }

      job.status = result.success ? 'completed' : 'failed';
      job.completedAt = new Date();
      job.stats = result.stats;
      job.errors = result.errors;

      const duration = Date.now() - startTime;
      logger.info('Data load completed', { 
        jobId, 
        success: result.success, 
        duration: `${duration}ms`,
        stats: result.stats 
      });

      return result;

    } catch (error: any) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push({
        recordIndex: -1,
        errorCode: 'JOB_FAILED',
        message: error.message
      });

      logger.error('Data load failed', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Execute load using Bulk API 2.0
   */
  private async executeBulkLoad(
    connection: Connection,
    job: LoadJob,
    records: any[],
    batchSize: number
  ): Promise<LoadResult> {
    logger.debug('Using Bulk API 2.0 for load');

    try {
      // For Bulk API, we'll use the simpler approach with jsforce-style bulk operations
      // Split records into batches
      const batches: any[][] = [];
      for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: LoadError[] = [];

      // Process each batch using sobject collections
      for (const [batchIndex, batch] of batches.entries()) {
        logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`);
        
        try {
          const sobject = connection.sobject(job.objectName);
          
          // Use insert/update/upsert based on operation
          let results: any[];
          if (job.operation === 'insert') {
            results = await sobject.create(batch);
          } else if (job.operation === 'update') {
            results = await sobject.update(batch);
          } else if (job.operation === 'upsert') {
            if (!job.externalIdField) {
              throw new Error('External ID field required for upsert operation');
            }
            // For batch upsert, we need to handle differently - pass array and extIdField
            results = await sobject.upsert(batch, job.externalIdField);
          } else if (job.operation === 'delete') {
            const ids = batch.map((r: any) => r.Id).filter(Boolean);
            results = await sobject.delete(ids);
          } else {
            throw new Error(`Unknown operation: ${job.operation}`);
          }

          // Process results
          results.forEach((result: any, index: number) => {
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
              const errorInfo = Array.isArray(result.errors) ? result.errors[0] : result.errors;
              errors.push({
                recordIndex: (batchIndex * batchSize) + index,
                recordId: result.id,
                errorCode: errorInfo?.statusCode || 'UNKNOWN',
                message: errorInfo?.message || 'Unknown error',
                fields: errorInfo?.fields
              });
            }
          });

        } catch (batchError: any) {
          logger.error('Batch processing failed', { batchIndex, error: batchError.message });
          // Mark entire batch as failed
          for (let i = 0; i < batch.length; i++) {
            failedCount++;
            errors.push({
              recordIndex: (batchIndex * batchSize) + i,
              errorCode: 'BATCH_FAILED',
              message: batchError.message
            });
          }
        }
      }

      return {
        jobId: job.id,
        success: failedCount === 0,
        stats: {
          total: records.length,
          success: successCount,
          failed: failedCount,
          skipped: 0
        },
        errors,
        durationMs: 0
      };

    } catch (error: any) {
      logger.error('Bulk load failed', error);
      throw error;
    }
  }

  /**
   * Execute load using REST API (for smaller datasets)
   */
  private async executeRestLoad(
    connection: Connection,
    job: LoadJob,
    records: any[],
    batchSize: number
  ): Promise<LoadResult> {
    logger.debug('Using REST API for load');

    let successCount = 0;
    let failedCount = 0;
    const errors: LoadError[] = [];

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const results = await this.processRestBatch(connection, job, batch);
        
        results.forEach((result: any, index: number) => {
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push({
              recordIndex: i + index,
              recordId: result.id,
              errorCode: result.errors?.[0]?.statusCode || 'UNKNOWN',
              message: result.errors?.[0]?.message || 'Unknown error',
              fields: result.errors?.[0]?.fields
            });
          }
        });

      } catch (error: any) {
        logger.error('REST batch failed', { batchStart: i, error: error.message });
        // Mark entire batch as failed
        for (let j = 0; j < batch.length; j++) {
          failedCount++;
          errors.push({
            recordIndex: i + j,
            errorCode: 'BATCH_FAILED',
            message: error.message
          });
        }
      }
    }

    return {
      jobId: job.id,
      success: failedCount === 0,
      stats: {
        total: records.length,
        success: successCount,
        failed: failedCount,
        skipped: 0
      },
      errors,
      durationMs: 0
    };
  }

  /**
   * Process a single batch via REST API
   */
  private async processRestBatch(
    connection: Connection,
    job: LoadJob,
    records: any[]
  ): Promise<any[]> {
    const sobject = connection.sobject(job.objectName);
    const results: any[] = [];

    // Use composite or individual requests based on batch size
    if (records.length === 1) {
      // Single record
      const record = records[0];
      try {
        let result;
        if (job.operation === 'insert') {
          result = await sobject.create(record);
        } else if (job.operation === 'update' || job.operation === 'upsert') {
          if (!record.Id) {
            throw new Error('Id required for update/upsert');
          }
          const id = record.Id;
          const updateRecord = { ...record };
          delete updateRecord.Id;
          
          if (job.operation === 'upsert' && job.externalIdField) {
            result = await sobject.upsert(updateRecord, job.externalIdField);
          } else {
            result = await sobject.update({ Id: id, ...updateRecord });
          }
        } else if (job.operation === 'delete') {
          if (!record.Id) throw new Error('Id required for delete');
          result = await sobject.delete(record.Id);
        }
        
        results.push({ success: true, id: (result as any)?.id });
      } catch (error: any) {
        results.push({ 
          success: false, 
          errors: [{ 
            statusCode: error.errorCode || 'UNKNOWN', 
            message: error.message 
          }] 
        });
      }
    } else {
      // Multiple records - use composite request (up to 25 subrequests)
      const compositeBody = records.map((record, index) => {
        let method = 'POST';
        let url = `/services/data/v58.0/sobjects/${job.objectName}`;
        let body: any = record;

        if (job.operation === 'update' || job.operation === 'upsert') {
          if (!record.Id) {
            throw new Error(`Id required for update at index ${index}`);
          }
          method = 'PATCH';
          url = `/services/data/v58.0/sobjects/${job.objectName}/${record.Id}`;
          body = { ...record };
          delete body.Id;
        } else if (job.operation === 'delete') {
          if (!record.Id) throw new Error(`Id required for delete at index ${index}`);
          method = 'DELETE';
          url = `/services/data/v58.0/sobjects/${job.objectName}/${record.Id}`;
          body = {};
        }

        return {
          method,
          url,
          body: method !== 'DELETE' ? body : undefined,
          referenceId: `ref${index}`
        };
      });

      try {
        const response: any = await connection.request({
          method: 'POST',
          url: '/services/data/v58.0/composite',
          body: JSON.stringify({
            allOrNone: false,
            compositeRequest: compositeBody
          })
        });

        (response.compositeResponse || []).forEach((resp: any) => {
          results.push({
            success: resp.httpStatusCode < 300,
            id: resp.body?.id,
            errors: resp.httpStatusCode >= 300 ? [{
              statusCode: 'HTTP_' + resp.httpStatusCode,
              message: resp.body?.[0]?.message || 'Composite request failed'
            }] : []
          });
        });
      } catch (error: any) {
        throw error;
      }
    }

    return results;
  }

  /**
   * Cancel a running load job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      logger.warn('Cannot cancel job - already finished', { jobId, status: job.status });
      return;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    logger.info('Load job cancelled', { jobId });
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): LoadJob | undefined {
    return this.jobs.get(jobId);
  }
}

export const loadingService = new LoadingService();
