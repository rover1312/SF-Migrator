import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step3TargetOrgs = ({ onComplete }) => {
    const { migrationConfig, addTargetOrg, removeTargetOrg, setDefaultTargetOrg } = useMigrationStore();
    const [showAddForm, setShowAddForm] = React.useState(false);
    const [newOrgName, setNewOrgName] = React.useState('');
    const [newOrgUsername, setNewOrgUsername] = React.useState('');
    const handleAddTargetOrg = () => {
        if (!newOrgName || !newOrgUsername)
            return;
        const newOrg = {
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
    const handleSetDefault = (orgId) => {
        setDefaultTargetOrg(orgId);
        onComplete();
    };
    const handleRemove = (orgId) => {
        removeTargetOrg(orgId);
        if (migrationConfig.targetOrgs.length <= 1) {
            onComplete();
        }
    };
    const handleConnectOrg = async (orgId) => {
        // Simulate connection - in real implementation would open OAuth flow
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete();
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Target Org Configuration" }), _jsx("div", { className: "alert alert-info", children: "Configure one or more Target Orgs where data will be loaded. You can add multiple orgs and select a default target for the migration." }), _jsx("div", { style: { marginBottom: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: () => setShowAddForm(!showAddForm), children: showAddForm ? 'Cancel' : '+ Add Target Org' }) }), showAddForm && (_jsxs("div", { className: "card", style: { marginBottom: '20px' }, children: [_jsx("h3", { style: { fontSize: '16px', marginBottom: '12px' }, children: "Add New Target Org" }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "targetOrgName", children: "Org Name" }), _jsx("input", { type: "text", id: "targetOrgName", className: "form-control", value: newOrgName, onChange: (e) => setNewOrgName(e.target.value), placeholder: "e.g., Sandbox Full, Dev Org" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "targetOrgUsername", children: "Username" }), _jsx("input", { type: "email", id: "targetOrgUsername", className: "form-control", value: newOrgUsername, onChange: (e) => setNewOrgUsername(e.target.value), placeholder: "admin@example.com" })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("button", { className: "btn btn-success", onClick: handleAddTargetOrg, disabled: !newOrgName || !newOrgUsername, children: "Add Org" }), _jsx("button", { className: "btn btn-secondary", onClick: () => {
                                    setShowAddForm(false);
                                    setNewOrgName('');
                                    setNewOrgUsername('');
                                }, children: "Cancel" })] })] })), migrationConfig.targetOrgs.length === 0 ? (_jsx("div", { className: "alert alert-warning", children: "No target orgs configured. Please add at least one target org to proceed." })) : (_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '16px', marginBottom: '12px' }, children: "Configured Target Orgs" }), migrationConfig.targetOrgs.map((org) => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", children: [_jsxs("div", { children: [_jsx("span", { className: "card-title", children: org.orgName }), org.isDefault && (_jsx("span", { className: "status-indicator status-connected", style: { marginLeft: '8px' }, children: "Default" }))] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [!org.isDefault && migrationConfig.targetOrgs.length > 1 && (_jsx("button", { className: "btn btn-secondary", onClick: () => handleSetDefault(org.orgId), style: { padding: '6px 12px', fontSize: '12px' }, children: "Set as Default" })), _jsx("button", { className: "btn btn-primary", onClick: () => handleConnectOrg(org.orgId), disabled: org.isConnected, style: { padding: '6px 12px', fontSize: '12px' }, children: org.isConnected ? 'Connected' : 'Connect' }), _jsx("button", { className: "btn btn-secondary", onClick: () => handleRemove(org.orgId), style: { padding: '6px 12px', fontSize: '12px', color: '#ef4444' }, children: "Remove" })] })] }), _jsxs("div", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Username: ", org.username || 'Not configured'] }), _jsx("div", { style: { marginTop: '8px' }, children: _jsxs("span", { className: `status-indicator ${org.isConnected ? 'status-connected' : 'status-disconnected'}`, children: [_jsx("span", { className: "status-dot" }), org.isConnected ? 'Connected' : 'Disconnected'] }) })] }, org.orgId)))] })), migrationConfig.targetOrgs.length > 0 && (_jsxs("div", { className: "alert alert-info", style: { marginTop: '20px' }, children: [_jsx("strong", { children: "Note:" }), " At least one target org must be connected before proceeding to the next step."] }))] }));
};
export default Step3TargetOrgs;
//# sourceMappingURL=Step3TargetOrgs.js.map