import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step6FilterConfig = ({ onComplete }) => {
    const { migrationConfig, setFilterForObject } = useMigrationStore();
    const [filters, setFilters] = React.useState({});
    const handleFilterChange = (objectName, filter) => {
        setFilters({ ...filters, [objectName]: filter });
    };
    const handleApplyFilter = (objectName) => {
        setFilterForObject(objectName, filters[objectName] || '');
    };
    const handleContinue = () => {
        onComplete();
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Filter Configuration" }), _jsx("div", { className: "alert alert-info", children: "Configure WHERE clauses to filter which records are extracted for each object. Leave empty to extract all records." }), migrationConfig.objects.map((obj) => (_jsxs("div", { className: "card", style: { marginBottom: '16px' }, children: [_jsxs("div", { className: "card-header", children: [_jsxs("span", { className: "card-title", children: [obj.label, " (", obj.objectApiName, ")"] }), _jsxs("span", { style: { fontSize: '13px', color: '#6b7280' }, children: ["~", obj.recordCount?.toLocaleString(), " records"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: `filter-${obj.objectApiName}`, children: "WHERE Clause (SOQL)" }), _jsx("input", { type: "text", id: `filter-${obj.objectApiName}`, className: "form-control", value: filters[obj.objectApiName] || obj.filter || '', onChange: (e) => handleFilterChange(obj.objectApiName, e.target.value), placeholder: "e.g., Industry = 'Technology' AND AnnualRevenue > 1000000" }), _jsx("small", { style: { color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }, children: "Use standard SOQL syntax. Example: Name LIKE 'Acme%' OR CreatedDate = LAST_N_DAYS:30" })] }), _jsx("button", { className: "btn btn-secondary", onClick: () => handleApplyFilter(obj.objectApiName), style: { padding: '6px 12px', fontSize: '12px' }, children: "Apply Filter" })] }, obj.objectApiName))), _jsxs("div", { className: "alert alert-warning", style: { marginTop: '20px' }, children: [_jsx("strong", { children: "Tip:" }), " Filters reduce the amount of data extracted. Test your filters carefully before proceeding to extraction."] }), _jsx("div", { style: { marginTop: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: handleContinue, children: "Continue" }) })] }));
};
export default Step6FilterConfig;
//# sourceMappingURL=Step6FilterConfig.js.map