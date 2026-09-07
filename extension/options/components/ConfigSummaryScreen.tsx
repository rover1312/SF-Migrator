import React, { useState } from 'react';
import { useMigrationStore, MigrationConfig } from '../store/migrationStore';

interface ConfigSummaryScreenProps {
  config: MigrationConfig;
  onConfirm: () => void;
  onEdit: (step: number) => void;
  onCancel: () => void;
}

const ConfigSummaryScreen: React.FC<ConfigSummaryScreenProps> = ({
  config,
  onConfirm,
  onEdit,
  onCancel
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = {
    sourceOrgName: config.sourceOrg?.orgName || 'Not configured',
    sourceOrgAuth: config.sourceOrg?.authType || 'N/A',
    targetOrgsCount: config.targetOrgs.length,
    objectsCount: config.objects.length,
    totalFieldsSelected: config.objects.reduce((acc, obj) => 
      acc + (obj.fields?.filter(f => f.selected).length || 0), 0),
    objectsWithFilters: config.objects.filter(obj => obj.filter).length
  };

  return (
    <div className="config-summary-screen">
      <h2>Configuration Summary</h2>
      
      <div className="alert alert-info" style={{ marginBottom: '24px' }}>
        Please review your configuration before proceeding to extraction. 
        You can edit any step by clicking the Edit button next to each section.
      </div>

      {/* Source Organization */}
      <div className="summary-section">
        <div className="summary-header">
          <h3>Source Organization</h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(2)}
          >
            Edit
          </button>
        </div>
        <div className="summary-content">
          <p><strong>Organization:</strong> {summary.sourceOrgName}</p>
          <p><strong>Authentication:</strong> {summary.sourceOrgAuth.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Target Organizations */}
      <div className="summary-section">
        <div className="summary-header">
          <h3>Target Organizations</h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(3)}
          >
            Edit
          </button>
        </div>
        <div className="summary-content">
          <p><strong>Count:</strong> {summary.targetOrgsCount} organization(s)</p>
          {config.targetOrgs.length > 0 && (
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {config.targetOrgs.map((org, index) => (
                <li key={org.orgId || index}>
                  {org.orgName} {org.isDefault && <span className="badge badge-success">Default</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Objects and Fields */}
      <div className="summary-section">
        <div className="summary-header">
          <h3>Objects & Fields</h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(4)}
          >
            Edit
          </button>
        </div>
        <div className="summary-content">
          <p><strong>Total Objects:</strong> {summary.objectsCount}</p>
          <p><strong>Total Fields Selected:</strong> {summary.totalFieldsSelected}</p>
          <p><strong>Objects with Filters:</strong> {summary.objectsWithFilters}</p>
          
          {config.objects.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <button
                className="btn btn-link"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ padding: 0, fontSize: '13px' }}
              >
                {isExpanded ? 'Hide' : 'Show'} object details
              </button>
              
              {isExpanded && (
                <table className="table table-sm" style={{ marginTop: '12px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object Name</th>
                      <th>Fields</th>
                      <th>Filter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.objects.map((obj, index) => (
                      <tr key={obj.objectApiName}>
                        <td>{obj.order}</td>
                        <td>{obj.objectApiName}</td>
                        <td>{obj.fields?.filter(f => f.selected).length || 0} fields</td>
                        <td>{obj.filter ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="summary-section" style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          <strong>Config Version:</strong> {config.version}<br/>
          <strong>Created:</strong> {new Date(config.createdAt).toLocaleString()}<br/>
          <strong>Last Updated:</strong> {new Date(config.updatedAt).toLocaleString()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="summary-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
        >
          Confirm & Proceed to Extraction
        </button>
      </div>
    </div>
  );
};

export default ConfigSummaryScreen;
