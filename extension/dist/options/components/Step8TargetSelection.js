import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step8TargetSelection = ({ onComplete }) => {
    const { migrationConfig } = useMigrationStore();
    const [selectedTargetId, setSelectedTargetId] = React.useState('');
    React.useEffect(() => {
        const defaultOrg = migrationConfig.targetOrgs.find(org => org.isDefault);
        if (defaultOrg) {
            setSelectedTargetId(defaultOrg.orgId);
        }
        else if (migrationConfig.targetOrgs.length > 0) {
            setSelectedTargetId(migrationConfig.targetOrgs[0].orgId);
        }
    }, [migrationConfig.targetOrgs]);
    const handleContinue = () => {
        onComplete();
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Target Org Selection" }), _jsx("div", { className: "alert alert-info", children: "Select which Target Org you want to load the data into. You can go back and configure additional target orgs if needed." }), migrationConfig.targetOrgs.length === 0 ? (_jsx("div", { className: "alert alert-error", children: "No target orgs configured. Please go back to Step 3 to add target orgs." })) : (_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '16px', marginBottom: '16px' }, children: "Available Target Orgs" }), migrationConfig.targetOrgs.map((org) => (_jsxs("div", { className: "card", style: {
                            cursor: 'pointer',
                            border: selectedTargetId === org.orgId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            background: selectedTargetId === org.orgId ? '#eff6ff' : 'white',
                        }, onClick: () => setSelectedTargetId(org.orgId), children: [_jsxs("div", { className: "card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("input", { type: "radio", name: "targetOrg", checked: selectedTargetId === org.orgId, onChange: () => setSelectedTargetId(org.orgId), onClick: (e) => e.stopPropagation() }), _jsx("span", { className: "card-title", children: org.orgName }), org.isDefault && (_jsx("span", { className: "status-indicator status-connected", children: "Default" }))] }), _jsxs("span", { className: `status-indicator ${org.isConnected ? 'status-connected' : 'status-disconnected'}`, children: [_jsx("span", { className: "status-dot" }), org.isConnected ? 'Connected' : 'Disconnected'] })] }), _jsxs("div", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Username: ", org.credentials?.username || 'Not configured'] })] }, org.orgId)))] })), _jsx("div", { style: { marginTop: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: handleContinue, disabled: !selectedTargetId, children: "Continue to Validation" }) })] }));
};
export default Step8TargetSelection;
//# sourceMappingURL=Step8TargetSelection.js.map