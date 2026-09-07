import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
import ConfigSummaryScreen from './ConfigSummaryScreen';
const Step1ConfigMode = ({ onComplete, onGoToStep }) => {
    const { configMode, setConfigMode, importConfig, setError, migrationConfig } = useMigrationStore();
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [importedConfig, setImportedConfig] = useState(null);
    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
        if (!uploadedFile)
            return;
        try {
            const content = await uploadedFile.text();
            let config;
            const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
            if (fileExtension === 'json') {
                config = JSON.parse(content);
            }
            else if (['yaml', 'yml'].includes(fileExtension || '')) {
                // Try to use js-yaml if available, otherwise show error
                try {
                    const yaml = await import('js-yaml');
                    config = yaml.load(content);
                }
                catch {
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
        }
        catch (err) {
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
    const handleEditFromSummary = (step) => {
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
        return (_jsx(ConfigSummaryScreen, { config: importedConfig, onConfirm: handleImportConfirm, onEdit: handleEditFromSummary, onCancel: handleImportCancel }));
    }
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Configuration Mode" }), _jsx("div", { className: "alert alert-info", children: "Choose how you want to configure your migration. You can either use the step-by-step wizard or upload an existing configuration file." }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "configMode", value: "simple", checked: configMode === 'simple', onChange: () => setConfigMode('simple'), style: { marginRight: '8px' } }), _jsx("strong", { children: "Simple Mode" }), " - Step-by-step wizard (Recommended)"] }), _jsx("p", { style: { marginLeft: '24px', color: '#6b7280', fontSize: '13px', marginTop: '4px' }, children: "Configure your migration through an interactive wizard that guides you through each step." })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "configMode", value: "upload", checked: configMode === 'upload', onChange: () => setConfigMode('upload'), style: { marginRight: '8px' } }), _jsx("strong", { children: "Upload Configuration" }), " - Import existing config"] }), _jsx("p", { style: { marginLeft: '24px', color: '#6b7280', fontSize: '13px', marginTop: '4px' }, children: "Upload a previously exported JSON or YAML configuration file to pre-populate all settings." }), configMode === 'upload' && (_jsxs("div", { style: { marginTop: '12px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }, children: [_jsx("input", { type: "file", accept: ".json,.yaml,.yml", onChange: handleFileUpload, style: { marginBottom: '12px' } }), uploadedFile && (_jsxs("div", { className: "alert alert-success", children: ["Selected file: ", uploadedFile.name, _jsx("button", { className: "btn btn-primary", onClick: validateAndPreviewConfig, style: { marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }, children: "Preview Configuration" })] })), uploadError && (_jsx("div", { className: "alert alert-error", children: uploadError }))] }))] }), configMode === 'upload' && !uploadedFile && (_jsx("div", { className: "alert alert-warning", children: "Please select a configuration file to upload, or switch back to Simple Mode to continue with the wizard." })), configMode === 'simple' && (_jsx("div", { style: { marginTop: '24px' }, children: _jsx("button", { className: "btn btn-primary", onClick: handleContinue, children: "Continue to Source Org Configuration" }) }))] }));
};
export default Step1ConfigMode;
//# sourceMappingURL=Step1ConfigMode.js.map