import logger from '../utils/logger';
import { salesforceService, SalesforceService, QueryResult } from './salesforce.service';
import { PythonBridgeService } from './python-bridge.service';
import { SObjectSelection, FieldSelection } from '../types';

export interface ExtractionOptions {
  batchSize?: number;
  useBulkApi?: boolean;
  includeRelationships?: boolean;
  maxRecords?: number;
  outputFormat?: 'json' | 'csv' | 'parquet';
}

export interface ExtractionJob {
  id: string;
  orgId: string;
  objects: string[];
  fieldMap: Record<string, string[]>;
  status: ExtractionStatus;
  createdAt: Date;
  updatedAt: Date;
  options: ExtractionOptions;
  progress: ExtractionProgress;
  results: ExtractionResults;
}

export type ExtractionStatus = 'pending' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';

export interface ExtractionProgress {
  currentBatch: number;
  totalBatches: number;
  recordsExtracted: number;
  status: ExtractionStatus;
  message?: string;
}

export interface ExtractionResults {
  totalRecords: number;
  files: string[];
  errors: string[];
}

export interface ExtractionResult {
  jobId: string;
  status: ExtractionStatus;
  totalRecords: number;
  records: any[];
  files: string[];
  errors: string[];
  completedAt: Date;
}

export class ExtractionService {
  private sfService: SalesforceService;
  private pythonBridge: PythonBridgeService;

  constructor(salesforceService: SalesforceService, pythonBridge: PythonBridgeService) {
    this.sfService = salesforceService;
    this.pythonBridge = pythonBridge;
  }

  /**
   * Create an extraction job for the given objects and fields
   */
  async createExtractionJob(
    orgId: string,
    objects: SObjectSelection[],
    fields: Map<string, FieldSelection[]>,
    options: ExtractionOptions = {}
  ): Promise<ExtractionJob> {
    logger.info(`Creating extraction job for ${objects.length} objects`, { orgId });

    const jobId = `ext_${orgId}_${Date.now()}`;
    
    const job: ExtractionJob = {
      id: jobId,
      orgId,
      objects: objects.map(obj => obj.name),
      fieldMap: Object.fromEntries(
        Array.from(fields.entries()).map(([key, value]) => [key, value.map(f => f.fieldName)])
      ),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      options: {
        batchSize: options.batchSize || 2000,
        useBulkApi: options.useBulkApi ?? true,
        includeRelationships: options.includeRelationships ?? false,
        maxRecords: options.maxRecords,
        outputFormat: options.outputFormat || 'json'
      },
      progress: {
        currentBatch: 0,
        totalBatches: 0,
        recordsExtracted: 0,
        status: 'pending'
      },
      results: {
        totalRecords: 0,
        files: [],
        errors: []
      }
    };

    // Store job in temporary storage (in production, use Redis/DB)
    await this.storeJob(job);

    logger.info(`Extraction job created: ${jobId}`);
    return job;
  }

  /**
   * Execute the extraction job
   */
  async executeExtraction(job: ExtractionJob): Promise<ExtractionResult> {
    logger.info(`Starting extraction job: ${job.id}`);
    
    try {
      await this.updateJobStatus(job.id, 'running', {
        currentBatch: 0,
        totalBatches: 0,
        recordsExtracted: 0,
        status: 'running',
        message: 'Initializing extraction...'
      });

      const allResults: any[] = [];
      const errors: string[] = [];
      let totalRecords = 0;

      // Process each object
      for (const objectName of job.objects) {
        logger.info(`Extracting object: ${objectName}`, { jobId: job.id });

        try {
          const objectFields = job.fieldMap[objectName] || [];
          
          if (objectFields.length === 0) {
            logger.warn(`No fields specified for ${objectName}, skipping`);
            continue;
          }

          // Get record count for progress tracking
          const countQuery = `SELECT COUNT() FROM ${objectName}`;
          const countResult = await this.sfService.query(countQuery, job.orgId);
          const totalRecordsForObj = countResult.totalSize || 0;

          if (totalRecordsForObj === 0) {
            logger.info(`No records found for ${objectName}`);
            continue;
          }

          // Check if we should use Python bridge for large datasets
          const usePythonBridge = totalRecordsForObj > 10000 && job.options.useBulkApi;

          if (usePythonBridge) {
            // Use Python bridge for efficient large-scale extraction
            logger.info(`Using Python bridge for large dataset: ${totalRecordsForObj} records`);
            
            const pythonResult = await this.extractWithPythonBridge(
              job.id,
              job.orgId,
              objectName,
              objectFields,
              job.options
            );

            allResults.push(...pythonResult.records);
            totalRecords += pythonResult.records.length;

            if (pythonResult.errors) {
              errors.push(...pythonResult.errors);
            }
          } else {
            // Use standard Salesforce API extraction
            const standardResult = await this.extractWithStandardApi(
              job.id,
              job.orgId,
              objectName,
              objectFields,
              job.options,
              totalRecordsForObj
            );

            allResults.push(...standardResult.records);
            totalRecords += standardResult.records.length;

            if (standardResult.errors) {
              errors.push(...standardResult.errors);
            }
          }

          await this.updateJobStatus(job.id, 'running', {
            currentBatch: job.objects.indexOf(objectName) + 1,
            totalBatches: job.objects.length,
            recordsExtracted: totalRecords,
            status: 'running',
            message: `Completed ${objectName}`
          });

        } catch (error) {
          const errorMsg = `Error extracting ${objectName}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(errorMsg, { jobId: job.id, objectName });
          errors.push(errorMsg);
        }
      }

      const finalStatus: ExtractionStatus = errors.length > 0 ? 'completed_with_errors' : 'completed';

      const result: ExtractionResult = {
        jobId: job.id,
        status: finalStatus,
        totalRecords,
        records: allResults,
        files: [], // Files will be generated by Python bridge or saved separately
        errors,
        completedAt: new Date()
      };

      await this.updateJobStatus(job.id, finalStatus, {
        currentBatch: job.objects.length,
        totalBatches: job.objects.length,
        recordsExtracted: totalRecords,
        status: finalStatus,
        message: `Extraction completed: ${totalRecords} records`
      });

      // Store results
      await this.storeResults(job.id, result);

      logger.info(`Extraction job completed: ${job.id}`, { 
        totalRecords, 
        errors: errors.length 
      });

      return result;

    } catch (error) {
      const errorMsg = `Extraction job failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMsg, { jobId: job.id });
      
      await this.updateJobStatus(job.id, 'failed', {
        currentBatch: 0,
        totalBatches: 0,
        recordsExtracted: 0,
        status: 'failed',
        message: errorMsg
      });

      throw error;
    }
  }

  /**
   * Extract data using standard Salesforce API (for smaller datasets)
   */
  private async extractWithStandardApi(
    jobId: string,
    orgId: string,
    objectName: string,
    fields: string[],
    options: ExtractionOptions,
    totalRecords: number
  ): Promise<{ records: any[]; errors: string[] }> {
    const records: any[] = [];
    const errors: string[] = [];
    
    const fieldList = fields.join(', ');
    let query = `SELECT ${fieldList} FROM ${objectName}`;
    
    if (options.maxRecords) {
      query += ` LIMIT ${options.maxRecords}`;
    }

    logger.debug(`Executing query: ${query}`, { jobId });

    try {
      // Execute query with pagination
      let nextUrl: string | null = null;
      let batchCount = 0;
      const batchSize = options.batchSize || 2000;

      do {
        batchCount++;
        await this.updateJobStatus(jobId, 'running', {
          currentBatch: batchCount,
          totalBatches: Math.ceil(totalRecords / batchSize),
          recordsExtracted: records.length,
          status: 'running',
          message: `Processing batch ${batchCount}...`
        });

        const result: QueryResult<any> = nextUrl 
          ? await this.sfService.queryMore(nextUrl, orgId)
          : await this.sfService.query(query, orgId);

        if (result.records) {
          records.push(...result.records);
        }

        nextUrl = result.nextRecordsUrl || null;

        // Respect maxRecords limit
        if (options.maxRecords && records.length >= options.maxRecords) {
          break;
        }

      } while (nextUrl);

      logger.info(`Standard API extraction complete: ${records.length} records`, { 
        jobId, 
        objectName 
      });

      return { records, errors };

    } catch (error) {
      const errorMsg = `Standard API extraction failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      return { records, errors };
    }
  }

  /**
   * Extract data using Python bridge (for large datasets)
   */
  private async extractWithPythonBridge(
    jobId: string,
    orgId: string,
    objectName: string,
    fields: string[],
    options: ExtractionOptions
  ): Promise<{ records: any[]; errors: string[] }> {
    const records: any[] = [];
    const errors: string[] = [];

    try {
      // Prepare extraction parameters for Python
      const extractionParams = {
        job_id: jobId,
        org_id: orgId,
        object_name: objectName,
        fields: fields,
        batch_size: options.batchSize || 5000,
        max_records: options.maxRecords,
        output_format: options.outputFormat || 'json',
        use_bulk_api: options.useBulkApi ?? true
      };

      logger.info(`Invoking Python bridge for extraction`, { 
        jobId, 
        objectName,
        params: extractionParams 
      });

      // Call Python bridge service
      const pythonResult = await this.pythonBridge.executeExtraction(extractionParams);

      if (pythonResult.success) {
        records.push(...pythonResult.data || []);
        
        if (pythonResult.output_file) {
          logger.info(`Python bridge created output file: ${pythonResult.output_file}`);
        }
      } else {
        errors.push(pythonResult.error || 'Python bridge execution failed');
      }

      return { records, errors };

    } catch (error) {
      const errorMsg = `Python bridge extraction failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error(errorMsg, { jobId, objectName });
      return { records, errors };
    }
  }

  /**
   * Cancel an ongoing extraction job
   */
  async cancelExtraction(jobId: string): Promise<void> {
    logger.info(`Cancelling extraction job: ${jobId}`);
    
    await this.updateJobStatus(jobId, 'cancelled', {
      currentBatch: 0,
      totalBatches: 0,
      recordsExtracted: 0,
      status: 'cancelled',
      message: 'Job cancelled by user'
    });

    // Notify Python bridge to cancel if running
    await this.pythonBridge.cancelExtraction(jobId);
  }

  /**
   * Get extraction job status
   */
  async getJobStatus(jobId: string): Promise<ExtractionJob | null> {
    // Retrieve job from storage (in production, use Redis/DB)
    const job = await this.retrieveJob(jobId);
    return job;
  }

  /**
   * Get extraction results
   */
  async getJobResults(jobId: string): Promise<ExtractionResult | null> {
    // Retrieve results from storage
    const result = await this.retrieveResults(jobId);
    return result;
  }

  /**
   * Update job status in storage
   */
  private async updateJobStatus(
    jobId: string, 
    status: ExtractionStatus, 
    progress: Partial<ExtractionProgress>
  ): Promise<void> {
    const job = await this.retrieveJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.status = status;
    job.updatedAt = new Date();
    job.progress = { ...job.progress, ...progress };

    await this.storeJob(job);
  }

  /**
   * Store job in temporary storage
   * In production, replace with Redis or database
   */
  private async storeJob(job: ExtractionJob): Promise<void> {
    // Placeholder: In production, use Redis or database
    (globalThis as any)[`job_${job.id}`] = job;
  }

  /**
   * Retrieve job from storage
   */
  private async retrieveJob(jobId: string): Promise<ExtractionJob | null> {
    // Placeholder: In production, use Redis or database
    return (globalThis as any)[`job_${jobId}`] || null;
  }

  /**
   * Store results in temporary storage
   */
  private async storeResults(jobId: string, result: ExtractionResult): Promise<void> {
    // Placeholder: In production, use Redis or database
    (globalThis as any)[`results_${jobId}`] = result;
  }

  /**
   * Retrieve results from storage
   */
  private async retrieveResults(jobId: string): Promise<ExtractionResult | null> {
    // Placeholder: In production, use Redis or database
    return (globalThis as any)[`results_${jobId}`] || null;
  }
}
