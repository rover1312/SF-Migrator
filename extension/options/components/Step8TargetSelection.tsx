import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step8TargetSelectionProps {
  onComplete: () => void;
}

const Step8TargetSelection: React.FC<Step8TargetSelectionProps> = ({ onComplete }) => {
  const { migrationConfig } = useMigrationStore();
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>('');

  React.useEffect(() => {
    const defaultOrg = migrationConfig.targetOrgs.find(org => org.isDefault);
    if (defaultOrg) {
      setSelectedTargetId(defaultOrg.orgId);
    } else if (migrationConfig.targetOrgs.length > 0) {
      setSelectedTargetId(migrationConfig.targetOrgs[0].orgId);
    }
  }, [migrationConfig.targetOrgs]);

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="step-content">
      <h2>Target Org Selection</h2>
      
      <div className="alert alert-info">
        Select which Target Org you want to load the data into. You can go back and configure 
        additional target orgs if needed.
      </div>

      {migrationConfig.targetOrgs.length === 0 ? (
        <div className="alert alert-error">
          No target orgs configured. Please go back to Step 3 to add target orgs.
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Available Target Orgs</h3>
          
          {migrationConfig.targetOrgs.map((org) => (
            <div
              key={org.orgId}
              className="card"
              style={{
                cursor: 'pointer',
                border: selectedTargetId === org.orgId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                background: selectedTargetId === org.orgId ? '#eff6ff' : 'white',
              }}
              onClick={() => setSelectedTargetId(org.orgId)}
            >
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="radio"
                    name="targetOrg"
                    checked={selectedTargetId === org.orgId}
                    onChange={() => setSelectedTargetId(org.orgId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="card-title">{org.orgName}</span>
                  {org.isDefault && (
                    <span className="status-indicator status-connected">
                      Default
                    </span>
                  )}
                </div>
                
                <span
                  className={`status-indicator ${
                    org.isConnected ? 'status-connected' : 'status-disconnected'
                  }`}
                >
                  <span className="status-dot"></span>
                  {org.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Username: {org.credentials?.username || 'Not configured'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!selectedTargetId}
        >
          Continue to Validation
        </button>
      </div>
    </div>
  );
};

export default Step8TargetSelection;
