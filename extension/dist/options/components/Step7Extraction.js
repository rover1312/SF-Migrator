import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step7Extraction = ({ onComplete }) => {
    const { migrationConfig, setLoading, setError } = useMigrationStore();
    const [extractionStatus, setExtractionStatus] = React.useState('idle');
    const [progress, setProgress] = React.useState(0);
    const [extractedRecords, setExtractedRecords] = React.useState({});
    const handleStartExtraction = async () => {
        setLoading(true);
        setExtractionStatus('extracting');
        setProgress(0);
        try {
            // Simulate extraction process
            for (let i = 0; i < migrationConfig.objects.length; i++) {
                const obj = migrationConfig.objects[i];
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Mock extracted record count
                const mockCount = Math.floor(Math.random() * 1000) + 100;
                setExtractedRecords(prev => ({ ...prev, [obj.objectApiName]: mockCount }));
                setProgress(((i + 1) / migrationConfig.objects.length) * 100);
            }
            setExtractionStatus('completed');
            onComplete();
        }
        catch (err) {
            setExtractionStatus('error');
            setError(err instanceof Error ? err.message : 'Extraction failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Data Extraction" }), _jsx("div", { className: "alert alert-info", children: "Extract data from the Source Org based on your configuration. This may take some time depending on the amount of data." }), extractionStatus === 'idle' && (_jsxs("div", { children: [_jsxs("p", { style: { marginBottom: '16px' }, children: ["Ready to extract data for ", migrationConfig.objects.length, " object(s)."] }), _jsx("button", { className: "btn btn-primary", onClick: handleStartExtraction, children: "Start Extraction" })] })), extractionStatus === 'extracting' && (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }, children: [_jsx("span", { children: "Extraction Progress" }), _jsxs("span", { children: [Math.round(progress), "%"] })] }), _jsx("div", { style: { width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }, children: _jsx("div", { style: {
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: '#3b82f6',
                                        transition: 'width 0.3s ease',
                                    } }) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Extracting data from Source Org..." })] })] })), extractionStatus === 'completed' && (_jsxs("div", { children: [_jsx("div", { className: "alert alert-success", children: _jsx("strong", { children: "Extraction Complete!" }) }), _jsx("h3", { style: { fontSize: '16px', marginBottom: '12px' }, children: "Extracted Records" }), migrationConfig.objects.map((obj) => (_jsx("div", { className: "card", style: { marginBottom: '8px' }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: obj.label }), _jsxs("strong", { children: [extractedRecords[obj.objectApiName]?.toLocaleString() || 0, " records"] })] }) }, obj.objectApiName))), _jsx("div", { style: { marginTop: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: onComplete, children: "Continue to Target Selection" }) })] })), extractionStatus === 'error' && (_jsxs("div", { children: [_jsxs("div", { className: "alert alert-error", children: [_jsx("strong", { children: "Extraction Failed" }), _jsx("p", { children: "Please check your connection and try again." })] }), _jsx("button", { className: "btn btn-primary", onClick: handleStartExtraction, children: "Retry Extraction" })] }))] }));
};
export default Step7Extraction;
//# sourceMappingURL=Step7Extraction.js.map