import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step7ExtractionProps {
  onComplete: () => void;
}

const Step7Extraction: React.FC<Step7ExtractionProps> = ({ onComplete }) => {
  const { migrationConfig, setLoading, setError } = useMigrationStore();
  const [extractionStatus, setExtractionStatus] = React.useState<'idle' | 'extracting' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [extractedRecords, setExtractedRecords] = React.useState<Record<string, number>>({});

  const handleStartExtraction = async () => {
    setLoading(true);
    setExtractionStatus('extracting');
    setProgress(0);

    try {
      // Simulate extraction process
      for (let i = 0; i < migrationConfig.objects.length; i++) {
        const obj = migrationConfig.objects[i];
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock extracted record count
        const mockCount = Math.floor(Math.random() * 1000) + 100;
        setExtractedRecords(prev => ({ ...prev, [obj.objectApiName]: mockCount }));
        
        setProgress(((i + 1) / migrationConfig.objects.length) * 100);
      }

      setExtractionStatus('completed');
      onComplete();
    } catch (err) {
      setExtractionStatus('error');
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-content">
      <h2>Data Extraction</h2>
      
      <div className="alert alert-info">
        Extract data from the Source Org based on your configuration. This may take some time 
        depending on the amount of data.
      </div>

      {extractionStatus === 'idle' && (
        <div>
          <p style={{ marginBottom: '16px' }}>
            Ready to extract data for {migrationConfig.objects.length} object(s).
          </p>
          <button className="btn btn-primary" onClick={handleStartExtraction}>
            Start Extraction
          </button>
        </div>
      )}

      {extractionStatus === 'extracting' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Extraction Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            <span>Extracting data from Source Org...</span>
          </div>
        </div>
      )}

      {extractionStatus === 'completed' && (
        <div>
          <div className="alert alert-success">
            <strong>Extraction Complete!</strong>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Extracted Records</h3>
          
          {migrationConfig.objects.map((obj) => (
            <div key={obj.objectApiName} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{obj.label}</span>
                <strong>{extractedRecords[obj.objectApiName]?.toLocaleString() || 0} records</strong>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={onComplete}>
              Continue to Target Selection
            </button>
          </div>
        </div>
      )}

      {extractionStatus === 'error' && (
        <div>
          <div className="alert alert-error">
            <strong>Extraction Failed</strong>
            <p>Please check your connection and try again.</p>
          </div>
          
          <button className="btn btn-primary" onClick={handleStartExtraction}>
            Retry Extraction
          </button>
        </div>
      )}
    </div>
  );
};

export default Step7Extraction;
