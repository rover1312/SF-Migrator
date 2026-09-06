import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step9PermissionValidationProps {
  onComplete: () => void;
}

const Step9PermissionValidation: React.FC<Step9PermissionValidationProps> = ({ onComplete }) => {
  const { migrationConfig, setLoading } = useMigrationStore();
  const [validationStatus, setValidationStatus] = React.useState<'idle' | 'validating' | 'completed' | 'error'>('idle');
  const [validationResults, setValidationResults] = React.useState<Record<string, { valid: boolean; errors: string[] }>>({});

  const handleValidatePermissions = async () => {
    setLoading(true);
    setValidationStatus('validating');

    try {
      // Simulate validation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const results: Record<string, { valid: boolean; errors: string[] }> = {};
      
      migrationConfig.objects.forEach(obj => {
        const errors: string[] = [];
        
        // Check CRUD permissions
        if (obj.fields) {
          const missingCreate = obj.fields.filter(f => f.selected && !f.permissions.Create);
          const missingUpdate = obj.fields.filter(f => f.selected && !f.permissions.Update);
          
          if (missingCreate.length > 0) {
            errors.push(`Missing Create permission for: ${missingCreate.map(f => f.label).join(', ')}`);
          }
          if (missingUpdate.length > 0) {
            errors.push(`Missing Update permission for: ${missingUpdate.map(f => f.label).join(', ')}`);
          }
        }
        
        results[obj.objectApiName] = {
          valid: errors.length === 0,
          errors,
        };
      });

      setValidationResults(results);
      setValidationStatus('completed');
      
      const hasErrors = Object.values(results).some(r => !r.valid);
      if (!hasErrors) {
        onComplete();
      }
    } catch (err) {
      setValidationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-content">
      <h2>Permission Validation</h2>
      
      <div className="alert alert-info">
        Validate that the Target Org has the necessary permissions to create and update records
        with the selected fields.
      </div>

      {validationStatus === 'idle' && (
        <div>
          <p style={{ marginBottom: '16px' }}>
            Click the button below to validate permissions in the Target Org.
          </p>
          <button className="btn btn-primary" onClick={handleValidatePermissions}>
            Validate Permissions
          </button>
        </div>
      )}

      {validationStatus === 'validating' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            <span>Validating permissions in Target Org...</span>
          </div>
        </div>
      )}

      {validationStatus === 'completed' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Validation Results</h3>
          
          {migrationConfig.objects.map((obj) => {
            const result = validationResults[obj.objectApiName];
            if (!result) return null;

            return (
              <div
                key={obj.objectApiName}
                className={`card ${result.valid ? '' : 'alert-error'}`}
                style={{
                  marginBottom: '12px',
                  borderColor: result.valid ? '#22c55e' : '#ef4444',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">{obj.label}</span>
                  <span
                    className={`status-indicator ${
                      result.valid ? 'status-connected' : 'status-disconnected'
                    }`}
                  >
                    <span className="status-dot"></span>
                    {result.valid ? 'Valid' : 'Issues Found'}
                  </span>
                </div>
                
                {!result.valid && result.errors.length > 0 && (
                  <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '13px', color: '#991b1b' }}>
                    {result.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={onComplete}
              disabled={Object.values(validationResults).some(r => !r.valid)}
            >
              Continue to Data Loading
            </button>
          </div>
        </div>
      )}

      {validationStatus === 'error' && (
        <div>
          <div className="alert alert-error">
            <strong>Validation Failed</strong>
            <p>Could not connect to Target Org. Please check your connection.</p>
          </div>
          
          <button className="btn btn-primary" onClick={handleValidatePermissions}>
            Retry Validation
          </button>
        </div>
      )}
    </div>
  );
};

export default Step9PermissionValidation;
