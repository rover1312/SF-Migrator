import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step10DataLoadingProps {
  onComplete: () => void;
}

const Step10DataLoading: React.FC<Step10DataLoadingProps> = ({ onComplete }) => {
  const { migrationConfig, setLoading } = useMigrationStore();
  const [loadingStatus, setLoadingStatus] = React.useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [loadedRecords, setLoadedRecords] = React.useState<Record<string, number>>({});
  const [migrationComplete, setMigrationComplete] = React.useState(false);

  const handleStartLoading = async () => {
    setLoading(true);
    setLoadingStatus('loading');
    setProgress(0);

    try {
      // Simulate data loading process
      for (let i = 0; i < migrationConfig.objects.length; i++) {
        const obj = migrationConfig.objects[i];
        
        // Simulate API call delay for each object
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock loaded record count
        const mockCount = Math.floor(Math.random() * 500) + 50;
        setLoadedRecords(prev => ({ ...prev, [obj.objectApiName]: mockCount }));
        
        setProgress(((i + 1) / migrationConfig.objects.length) * 100);
      }

      setLoadingStatus('completed');
      setMigrationComplete(true);
      
      // Update migration count in storage
      chrome.storage.local.get(['migrationCount'], (result) => {
        const count = (result.migrationCount || 0) + 1;
        chrome.storage.local.set({ migrationCount: count });
      });
      
      onComplete();
    } catch (err) {
      setLoadingStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = () => {
    const config = useMigrationStore.getState().exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sf-migration-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="step-content">
      <h2>Data Loading</h2>
      
      <div className="alert alert-info">
        Load the extracted data into the selected Target Org. This is the final step of the 
        migration process.
      </div>

      {loadingStatus === 'idle' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Migration Summary</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>Source Org:</strong><br />
                {migrationConfig.sourceOrg?.orgName || 'Not configured'}
              </div>
              <div>
                <strong>Target Org:</strong><br />
                {migrationConfig.targetOrgs.find(o => o.isDefault)?.orgName || 
                 migrationConfig.targetOrgs[0]?.orgName || 'Not configured'}
              </div>
              <div>
                <strong>Objects:</strong><br />
                {migrationConfig.objects.length}
              </div>
              <div>
                <strong>Total Fields:</strong><br />
                {migrationConfig.objects.reduce((acc, obj) => acc + (obj.fields?.filter(f => f.selected).length || 0), 0)}
              </div>
            </div>
          </div>

          <button className="btn btn-success" onClick={handleStartLoading}>
            Start Data Loading
          </button>
        </div>
      )}

      {loadingStatus === 'loading' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Loading Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#22c55e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            <span>Loading data into Target Org...</span>
          </div>

          <div style={{ marginTop: '20px' }}>
            {migrationConfig.objects.map((obj) => (
              <div key={obj.objectApiName} className="card" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{obj.label}</span>
                  <span>
                    {loadedRecords[obj.objectApiName] ? (
                      <strong>{loadedRecords[obj.objectApiName].toLocaleString()} records loaded</strong>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Pending...</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingStatus === 'completed' && (
        <div>
          <div className="alert alert-success" style={{ textAlign: 'center', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>🎉 Migration Complete!</h3>
            <p style={{ margin: 0, color: '#166534' }}>
              All data has been successfully loaded into the Target Org.
            </p>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px', marginTop: '20px' }}>Final Results</h3>
          
          {migrationConfig.objects.map((obj) => (
            <div key={obj.objectApiName} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{obj.label}</span>
                <strong>{loadedRecords[obj.objectApiName]?.toLocaleString() || 0} records</strong>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleExportConfig}>
              Export Configuration
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                useMigrationStore.getState().resetWizard();
                window.location.reload();
              }}
            >
              Start New Migration
            </button>
          </div>
        </div>
      )}

      {loadingStatus === 'error' && (
        <div>
          <div className="alert alert-error">
            <strong>Loading Failed</strong>
            <p>An error occurred while loading data. Please check your connection and try again.</p>
          </div>
          
          <button className="btn btn-primary" onClick={handleStartLoading}>
            Retry Loading
          </button>
        </div>
      )}
    </div>
  );
};

export default Step10DataLoading;
