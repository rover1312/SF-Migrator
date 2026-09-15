/** Extraction job orchestration. Heavy lifting delegates to Python via the bridge. */
export interface ExtractionJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class ExtractionService {
  async start(): Promise<ExtractionJob> {
    // TODO: spawn Python extraction (CHECKLIST §5, §13)
    return { id: `extract-${Date.now()}`, status: 'pending' };
  }
}

export const extractionService = new ExtractionService();
