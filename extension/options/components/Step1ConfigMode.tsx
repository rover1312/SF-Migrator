import React, { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import ConfigSummaryScreen from './ConfigSummaryScreen';

interface Step1ConfigModeProps {
  onComplete: () => void;
  onGoToStep?: (step: number) => void;
}

const Step1ConfigMode: React.FC<Step1ConfigModeProps> = ({ onComplete, onGoToStep }) => {
  const { configMode, setConfigMode, importConfig, setError, migrationConfig } = useMigrationStore();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [importedConfig, setImportedConfig] = useState<any>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.json', '.yaml', '.yml'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension || '')) {
      setUploadError('Please upload a valid JSON or YAML file');
      return;
    }

    setUploadedFile(file);
    setUploadError(null);
  };

  const validateAndPreviewConfig = async () => {
    if (!uploadedFile) return;

    try {
      const content = await uploadedFile.text();
      let config;
      const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'json') {
        config = JSON.parse(content);
      } else if (['yaml', 'yml'].includes(fileExtension || '')) {
        // Try to use js-yaml if available, otherwise show error
        try {
          const yaml = await import('js-yaml');
          config = yaml.load(content);
        } catch {
          setUploadError('YAML parsing requires js-yaml library. Please use JSON format or install dependencies.');
          return;
        }
      }

      // Basic schema validation
      if (!config.version || !config.sourceOrg || !config.objects) {
        setUploadError('Invalid configuration file structure. Missing required fields: version, sourceOrg, or objects.');
        return;
      }

      // Store the imported config for preview
      setImportedConfig(config);
      setShowSummary(true);
      setUploadError(null);
    } catch (err) {
      setUploadError(`Failed to parse configuration file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleImportConfirm = () => {
    if (importedConfig) {
      importConfig(importedConfig);
      setShowSummary(false);
      setUploadedFile(null);
      setImportedConfig(null);
      onComplete();
    }
  };

  const handleImportCancel = () => {
    setShowSummary(false);
    setUploadedFile(null);
    setImportedConfig(null);
  };

  const handleEditFromSummary = (step: number) => {
    setShowSummary(false);
    if (onGoToStep) {
      onGoToStep(step);
    }
  };

  const handleContinue = () => {
    if (configMode === 'simple') {
      onComplete();
    }
  };

  // Show summary screen if config is uploaded and validated
  if (showSummary && importedConfig) {
    return (
      <ConfigSummaryScreen
        config={importedConfig}
        onConfirm={handleImportConfirm}
        onEdit={handleEditFromSummary}
        onCancel={handleImportCancel}
      />
    );
  }

  return (
    <div className="step-content">
      <h2>Configuration Mode</h2>
      
      <div className="alert alert-info">
        Choose how you want to configure your migration. You can either use the step-by-step wizard 
        or upload an existing configuration file.
      </div>

      <div className="form-group">
        <label>
          <input
            type="radio"
            name="configMode"
            value="simple"
            checked={configMode === 'simple'}
            onChange={() => setConfigMode('simple')}
            style={{ marginRight: '8px' }}
          />
          <strong>Simple Mode</strong> - Step-by-step wizard (Recommended)
        </label>
        <p style={{ marginLeft: '24px', color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
          Configure your migration through an interactive wizard that guides you through each step.
        </p>
      </div>

      <div className="form-group">
        <label>
          <input
            type="radio"
            name="configMode"
            value="upload"
            checked={configMode === 'upload'}
            onChange={() => setConfigMode('upload')}
            style={{ marginRight: '8px' }}
          />
          <strong>Upload Configuration</strong> - Import existing config
        </label>
        <p style={{ marginLeft: '24px', color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
          Upload a previously exported JSON or YAML configuration file to pre-populate all settings.
        </p>

        {configMode === 'upload' && (
          <div style={{ marginTop: '12px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              style={{ marginBottom: '12px' }}
            />
            
            {uploadedFile && (
              <div className="alert alert-success">
                Selected file: {uploadedFile.name}
                <button
                  className="btn btn-primary"
                  onClick={validateAndPreviewConfig}
                  style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
                >
                  Preview Configuration
                </button>
              </div>
            )}

            {uploadError && (
              <div className="alert alert-error">{uploadError}</div>
            )}
          </div>
        )}
      </div>

      {configMode === 'upload' && !uploadedFile && (
        <div className="alert alert-warning">
          Please select a configuration file to upload, or switch back to Simple Mode to continue with the wizard.
        </div>
      )}

      {configMode === 'simple' && (
        <div style={{ marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={handleContinue}
          >
            Continue to Source Org Configuration
          </button>
        </div>
      )}
    </div>
  );
};

export default Step1ConfigMode;
