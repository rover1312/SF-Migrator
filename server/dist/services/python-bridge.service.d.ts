export interface PythonBridgeResult {
    success: boolean;
    data?: any[];
    error?: string;
    output_file?: string;
}
export interface ExtractionParams {
    job_id: string;
    org_id: string;
    object_name: string;
    fields: string[];
    batch_size: number;
    max_records?: number;
    output_format: 'json' | 'csv' | 'parquet';
    use_bulk_api: boolean;
}
/**
 * PythonBridgeService - Handles communication with Python scripts for large-scale data operations
 */
export declare class PythonBridgeService {
    private pythonProcess;
    private baseUrl;
    /**
     * Initialize the Python bridge service
     */
    initialize(): Promise<void>;
    /**
     * Execute extraction using Python scripts
     */
    executeExtraction(params: ExtractionParams): Promise<PythonBridgeResult>;
    /**
     * Cancel an ongoing extraction
     */
    cancelExtraction(jobId: string): Promise<void>;
    /**
     * Execute data loading using Python scripts
     */
    executeLoad(params: any): Promise<PythonBridgeResult>;
    /**
     * Validate data using Python scripts
     */
    validateData(params: any): Promise<PythonBridgeResult>;
    /**
     * Shutdown the Python bridge service
     */
    shutdown(): Promise<void>;
}
declare const _default: PythonBridgeService;
export default _default;
//# sourceMappingURL=python-bridge.service.d.ts.map