import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step4ObjectSelection = ({ onComplete }) => {
    const { setObjects, migrationConfig } = useMigrationStore();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState('all');
    const [selectedObjectNames, setSelectedObjectNames] = React.useState([]);
    // Mock objects - in real implementation would fetch from API
    const mockObjects = [
        { name: 'Account', label: 'Account', custom: false, queryable: true, retrieveable: true, recordCount: 15000 },
        { name: 'Contact', label: 'Contact', custom: false, queryable: true, retrieveable: true, recordCount: 25000 },
        { name: 'Opportunity', label: 'Opportunity', custom: false, queryable: true, retrieveable: true, recordCount: 8000 },
        { name: 'Case', label: 'Case', custom: false, queryable: true, retrieveable: true, recordCount: 12000 },
        { name: 'Custom_Object__c', label: 'Custom Object', custom: true, queryable: true, retrieveable: true, recordCount: 500 },
    ];
    const filteredObjects = mockObjects.filter(obj => {
        const matchesSearch = obj.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obj.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' ||
            (filterType === 'standard' && !obj.custom) ||
            (filterType === 'custom' && obj.custom);
        return matchesSearch && matchesType;
    });
    const handleSelectAll = () => {
        if (selectedObjectNames.length === filteredObjects.length) {
            setSelectedObjectNames([]);
        }
        else {
            setSelectedObjectNames(filteredObjects.map(obj => obj.name));
        }
    };
    const handleToggleObject = (objectName) => {
        if (selectedObjectNames.includes(objectName)) {
            setSelectedObjectNames(selectedObjectNames.filter(name => name !== objectName));
        }
        else {
            setSelectedObjectNames([...selectedObjectNames, objectName]);
        }
    };
    const handleContinue = () => {
        const selectedObjects = filteredObjects
            .filter(obj => selectedObjectNames.includes(obj.name))
            .map((obj, index) => ({
            objectApiName: obj.name,
            label: obj.label,
            custom: obj.custom,
            queryable: obj.queryable,
            retrieveable: obj.retrieveable,
            recordCount: obj.recordCount,
            order: index + 1,
        }));
        setObjects(selectedObjects);
        onComplete();
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Object Selection" }), _jsx("div", { className: "alert alert-info", children: "Select the Salesforce objects you want to migrate. Only objects with Read permission are shown." }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginBottom: '16px' }, children: [_jsx("input", { type: "text", className: "form-control", placeholder: "Search objects...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), style: { flex: 1 } }), _jsxs("select", { className: "form-control", value: filterType, onChange: (e) => setFilterType(e.target.value), style: { width: '150px' }, children: [_jsx("option", { value: "all", children: "All Objects" }), _jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "custom", children: "Custom" })] })] }), _jsxs("div", { style: { marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("span", { children: ["Found ", filteredObjects.length, " objects"] }), _jsx("button", { className: "btn btn-secondary", onClick: handleSelectAll, style: { padding: '6px 12px', fontSize: '12px' }, children: selectedObjectNames.length === filteredObjects.length ? 'Deselect All' : 'Select All' })] }), _jsx("div", { style: { maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }, children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '40px' }, children: "Select" }), _jsx("th", { children: "Object Name" }), _jsx("th", { children: "API Name" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Records" })] }) }), _jsx("tbody", { children: filteredObjects.map((obj) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selectedObjectNames.includes(obj.name), onChange: () => handleToggleObject(obj.name) }) }), _jsx("td", { children: obj.label }), _jsx("td", { children: _jsx("code", { children: obj.name }) }), _jsx("td", { children: _jsx("span", { className: `status-indicator ${obj.custom ? 'status-disconnected' : 'status-connected'}`, children: obj.custom ? 'Custom' : 'Standard' }) }), _jsx("td", { children: obj.recordCount?.toLocaleString() })] }, obj.name))) })] }) }), selectedObjectNames.length === 0 && (_jsx("div", { className: "alert alert-warning", style: { marginTop: '16px' }, children: "Please select at least one object to proceed." })), _jsx("div", { style: { marginTop: '20px' }, children: _jsxs("button", { className: "btn btn-primary", onClick: handleContinue, disabled: selectedObjectNames.length === 0, children: ["Continue (", selectedObjectNames.length, " selected)"] }) })] }));
};
export default Step4ObjectSelection;
//# sourceMappingURL=Step4ObjectSelection.js.map