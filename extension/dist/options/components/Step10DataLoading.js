import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step10DataLoading = ({ onComplete }) => {
    const { migrationConfig, setLoading } = useMigrationStore();
    const [loadingStatus, setLoadingStatus] = React.useState('idle');
    const [progress, setProgress] = React.useState(0);
    const [loadedRecords, setLoadedRecords] = React.useState({});
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
        }
        catch (err) {
            setLoadingStatus('error');
        }
        finally {
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
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Data Loading" }), _jsx("div", { className: "alert alert-info", children: "Load the extracted data into the selected Target Org. This is the final step of the migration process." }), loadingStatus === 'idle' && (_jsxs("div", { children: [_jsxs("div", { className: "card", style: { marginBottom: '20px' }, children: [_jsx("h3", { style: { fontSize: '16px', marginBottom: '12px' }, children: "Migration Summary" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Source Org:" }), _jsx("br", {}), migrationConfig.sourceOrg?.orgName || 'Not configured'] }), _jsxs("div", { children: [_jsx("strong", { children: "Target Org:" }), _jsx("br", {}), migrationConfig.targetOrgs.find(o => o.isDefault)?.orgName ||
                                                migrationConfig.targetOrgs[0]?.orgName || 'Not configured'] }), _jsxs("div", { children: [_jsx("strong", { children: "Objects:" }), _jsx("br", {}), migrationConfig.objects.length] }), _jsxs("div", { children: [_jsx("strong", { children: "Total Fields:" }), _jsx("br", {}), migrationConfig.objects.reduce((acc, obj) => acc + (obj.fields?.filter(f => f.selected).length || 0), 0)] })] })] }), _jsx("button", { className: "btn btn-success", onClick: handleStartLoading, children: "Start Data Loading" })] })), loadingStatus === 'loading' && (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }, children: [_jsx("span", { children: "Loading Progress" }), _jsxs("span", { children: [Math.round(progress), "%"] })] }), _jsx("div", { style: { width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }, children: _jsx("div", { style: {
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: '#22c55e',
                                        transition: 'width 0.3s ease',
                                    } }) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Loading data into Target Org..." })] }), _jsx("div", { style: { marginTop: '20px' }, children: migrationConfig.objects.map((obj) => (_jsx("div", { className: "card", style: { marginBottom: '8px' }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: obj.label }), _jsx("span", { children: loadedRecords[obj.objectApiName] ? (_jsxs("strong", { children: [loadedRecords[obj.objectApiName].toLocaleString(), " records loaded"] })) : (_jsx("span", { style: { color: '#9ca3af' }, children: "Pending..." })) })] }) }, obj.objectApiName))) })] })), loadingStatus === 'completed' && (_jsxs("div", { children: [_jsxs("div", { className: "alert alert-success", style: { textAlign: 'center', padding: '24px' }, children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: '20px' }, children: "\uD83C\uDF89 Migration Complete!" }), _jsx("p", { style: { margin: 0, color: '#166534' }, children: "All data has been successfully loaded into the Target Org." })] }), _jsx("h3", { style: { fontSize: '16px', marginBottom: '12px', marginTop: '20px' }, children: "Final Results" }), migrationConfig.objects.map((obj) => (_jsx("div", { className: "card", style: { marginBottom: '8px' }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: obj.label }), _jsxs("strong", { children: [loadedRecords[obj.objectApiName]?.toLocaleString() || 0, " records"] })] }) }, obj.objectApiName))), _jsxs("div", { style: { marginTop: '20px', display: 'flex', gap: '12px' }, children: [_jsx("button", { className: "btn btn-primary", onClick: handleExportConfig, children: "Export Configuration" }), _jsx("button", { className: "btn btn-secondary", onClick: () => {
                                    useMigrationStore.getState().resetWizard();
                                    window.location.reload();
                                }, children: "Start New Migration" })] })] })), loadingStatus === 'error' && (_jsxs("div", { children: [_jsxs("div", { className: "alert alert-error", children: [_jsx("strong", { children: "Loading Failed" }), _jsx("p", { children: "An error occurred while loading data. Please check your connection and try again." })] }), _jsx("button", { className: "btn btn-primary", onClick: handleStartLoading, children: "Retry Loading" })] }))] }));
};
export default Step10DataLoading;
//# sourceMappingURL=Step10DataLoading.js.map