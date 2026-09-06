import React from 'react';
import { useMigrationStore, OrgConfig } from '../store/migrationStore';

interface Step3TargetOrgsProps {
  onComplete: () => void;
}

const Step3TargetOrgs: React.FC<Step3TargetOrgsProps> = ({ onComplete }) => {
  const { migrationConfig, addTargetOrg, removeTargetOrg, setDefaultTargetOrg } = useMigrationStore();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgUsername, setNewOrgUsername] = React.useState('');

  const handleAddTargetOrg = () => {
    if (!newOrgName || !newOrgUsername) return;

    const newOrg: OrgConfig = {
      orgId: `target_${Date.now()}`,
      orgName: newOrgName,
      authType: 'oauth',
      credentials: {},
      isConnected: false,
      isDefault: migrationConfig.targetOrgs.length === 0,
    };

    addTargetOrg(newOrg);
    setNewOrgName('');
    setNewOrgUsername('');
    setShowAddForm(false);
    onComplete();
  };

  const handleSetDefault = (orgId: string) => {
    setDefaultTargetOrg(orgId);
    onComplete();
  };

  const handleRemove = (orgId: string) => {
    removeTargetOrg(orgId);
    if (migrationConfig.targetOrgs.length <= 1) {
      onComplete();
    }
  };

  const handleConnectOrg = async (orgId: string) => {
    // Simulate connection - in real implementation would open OAuth flow
    await new Promise(resolve => setTimeout(resolve, 500));
    onComplete();
  };

  return (
    <div className="step-content">
      <h2>Target Org Configuration</h2>
      
      <div className="alert alert-info">
        Configure one or more Target Orgs where data will be loaded. You can add multiple orgs 
        and select a default target for the migration.
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Target Org'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Add New Target Org</h3>
          
          <div className="form-group">
            <label htmlFor="targetOrgName">Org Name</label>
            <input
              type="text"
              id="targetOrgName"
              className="form-control"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g., Sandbox Full, Dev Org"
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetOrgUsername">Username</label>
            <input
              type="email"
              id="targetOrgUsername"
              className="form-control"
              value={newOrgUsername}
              onChange={(e) => setNewOrgUsername(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-success"
              onClick={handleAddTargetOrg}
              disabled={!newOrgName || !newOrgUsername}
            >
              Add Org
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewOrgName('');
                setNewOrgUsername('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {migrationConfig.targetOrgs.length === 0 ? (
        <div className="alert alert-warning">
          No target orgs configured. Please add at least one target org to proceed.
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Configured Target Orgs</h3>
          
          {migrationConfig.targetOrgs.map((org) => (
            <div key={org.orgId} className="card">
              <div className="card-header">
                <div>
                  <span className="card-title">{org.orgName}</span>
                  {org.isDefault && (
                    <span
                      className="status-indicator status-connected"
                      style={{ marginLeft: '8px' }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!org.isDefault && migrationConfig.targetOrgs.length > 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleSetDefault(org.orgId)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => handleConnectOrg(org.orgId)}
                    disabled={org.isConnected}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    {org.isConnected ? 'Connected' : 'Connect'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRemove(org.orgId)}
                    style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Username: {org.username || 'Not configured'}
              </div>
              
              <div style={{ marginTop: '8px' }}>
                <span
                  className={`status-indicator ${
                    org.isConnected ? 'status-connected' : 'status-disconnected'
                  }`}
                >
                  <span className="status-dot"></span>
                  {org.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {migrationConfig.targetOrgs.length > 0 && (
        <div className="alert alert-info" style={{ marginTop: '20px' }}>
          <strong>Note:</strong> At least one target org must be connected before proceeding to the next step.
        </div>
      )}
    </div>
  );
};

export default Step3TargetOrgs;
