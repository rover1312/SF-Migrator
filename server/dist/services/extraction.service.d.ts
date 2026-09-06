import { SalesforceService } from './salesforce.service';
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
export declare class ExtractionService {
    private sfService;
    private pythonBridge;
    constructor(salesforceService: SalesforceService, pythonBridge: PythonBridgeService);
    /**
     * Create an extraction job for the given objects and fields
     */
    createExtractionJob(orgId: string, objects: SObjectSelection[], fields: Map<string, FieldSelection[]>, options?: ExtractionOptions): Promise<ExtractionJob>;
    /**
     * Execute the extraction job
     */
    executeExtraction(job: ExtractionJob): Promise<ExtractionResult>;
    /**
     * Extract data using standard Salesforce API (for smaller datasets)
     */
    private extractWithStandardApi;
    /**
     * Extract data using Python bridge (for large datasets)
     */
    private extractWithPythonBridge;
    /**
     * Cancel an ongoing extraction job
     */
    cancelExtraction(jobId: string): Promise<void>;
    /**
     * Get extraction job status
     */
    getJobStatus(jobId: string): Promise<ExtractionJob | null>;
    /**
     * Get extraction results
     */
    getJobResults(jobId: string): Promise<ExtractionResult | null>;
    /**
     * Update job status in storage
     */
    private updateJobStatus;
    /**
     * Store job in temporary storage
     * In production, replace with Redis or database
     */
    private storeJob;
    /**
     * Retrieve job from storage
     */
    private retrieveJob;
    /**
     * Store results in temporary storage
     */
    private storeResults;
    /**
     * Retrieve results from storage
     */
    private retrieveResults;
}
//# sourceMappingURL=extraction.service.d.ts.map