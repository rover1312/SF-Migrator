import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step9PermissionValidation = ({ onComplete }) => {
    const { migrationConfig, setLoading } = useMigrationStore();
    const [validationStatus, setValidationStatus] = React.useState('idle');
    const [validationResults, setValidationResults] = React.useState({});
    const handleValidatePermissions = async () => {
        setLoading(true);
        setValidationStatus('validating');
        try {
            // Simulate validation process
            await new Promise(resolve => setTimeout(resolve, 2000));
            const results = {};
            migrationConfig.objects.forEach(obj => {
                const errors = [];
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
        }
        catch (err) {
            setValidationStatus('error');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Permission Validation" }), _jsx("div", { className: "alert alert-info", children: "Validate that the Target Org has the necessary permissions to create and update records with the selected fields." }), validationStatus === 'idle' && (_jsxs("div", { children: [_jsx("p", { style: { marginBottom: '16px' }, children: "Click the button below to validate permissions in the Target Org." }), _jsx("button", { className: "btn btn-primary", onClick: handleValidatePermissions, children: "Validate Permissions" })] })), validationStatus === 'validating' && (_jsx("div", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Validating permissions in Target Org..." })] }) })), validationStatus === 'completed' && (_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '16px', marginBottom: '16px' }, children: "Validation Results" }), migrationConfig.objects.map((obj) => {
                        const result = validationResults[obj.objectApiName];
                        if (!result)
                            return null;
                        return (_jsxs("div", { className: `card ${result.valid ? '' : 'alert-error'}`, style: {
                                marginBottom: '12px',
                                borderColor: result.valid ? '#22c55e' : '#ef4444',
                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { className: "card-title", children: obj.label }), _jsxs("span", { className: `status-indicator ${result.valid ? 'status-connected' : 'status-disconnected'}`, children: [_jsx("span", { className: "status-dot" }), result.valid ? 'Valid' : 'Issues Found'] })] }), !result.valid && result.errors.length > 0 && (_jsx("ul", { style: { marginTop: '8px', paddingLeft: '20px', fontSize: '13px', color: '#991b1b' }, children: result.errors.map((error, idx) => (_jsx("li", { children: error }, idx))) }))] }, obj.objectApiName));
                    }), _jsx("div", { style: { marginTop: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: onComplete, disabled: Object.values(validationResults).some(r => !r.valid), children: "Continue to Data Loading" }) })] })), validationStatus === 'error' && (_jsxs("div", { children: [_jsxs("div", { className: "alert alert-error", children: [_jsx("strong", { children: "Validation Failed" }), _jsx("p", { children: "Could not connect to Target Org. Please check your connection." })] }), _jsx("button", { className: "btn btn-primary", onClick: handleValidatePermissions, children: "Retry Validation" })] }))] }));
};
export default Step9PermissionValidation;
//# sourceMappingURL=Step9PermissionValidation.js.map