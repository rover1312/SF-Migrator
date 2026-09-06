import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMigrationStore } from '../store/migrationStore';
const Step5FieldSelection = ({ onComplete }) => {
    const { migrationConfig, setFieldsForObject, setFieldSelection } = useMigrationStore();
    // Mock fields for demonstration - in real implementation would fetch from API
    const mockFields = {
        Account: [
            { name: 'Name', label: 'Account Name', type: 'string', length: 255, nillable: false, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'Industry', label: 'Industry', type: 'picklist', length: 255, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'Phone', label: 'Phone', type: 'phone', length: 40, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'Website', label: 'Website', type: 'url', length: 255, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: false },
            { name: 'AnnualRevenue', label: 'Annual Revenue', type: 'currency', length: 18, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: false },
            { name: 'NumberOfEmployees', label: 'Number of Employees', type: 'int', length: 10, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: false },
        ],
        Contact: [
            { name: 'FirstName', label: 'First Name', type: 'string', length: 40, nillable: false, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'LastName', label: 'Last Name', type: 'string', length: 80, nillable: false, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'Email', label: 'Email', type: 'email', length: 80, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: true },
            { name: 'Phone', label: 'Phone', type: 'phone', length: 40, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: false },
            { name: 'Title', label: 'Title', type: 'string', length: 128, nillable: true, permissions: { Create: true, Read: true, Update: true, Delete: false }, selected: false },
        ],
    };
    const handleSelectAllFields = (objectName) => {
        const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
        if (!object)
            return;
        const fields = mockFields[objectName] || [];
        const allSelected = fields.every(f => f.selected);
        const updatedFields = fields.map(f => ({ ...f, selected: !allSelected }));
        setFieldsForObject(objectName, updatedFields);
    };
    const handleToggleField = (objectName, fieldName) => {
        const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
        if (!object || !object.fields)
            return;
        const field = object.fields.find(f => f.name === fieldName);
        if (field) {
            setFieldSelection(objectName, fieldName, !field.selected);
        }
    };
    const getSelectedCount = (objectName) => {
        const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
        if (!object || !object.fields)
            return 0;
        return object.fields.filter(f => f.selected).length;
    };
    const getTotalCount = (objectName) => {
        return mockFields[objectName]?.length || 0;
    };
    const renderCrudIndicator = (permissions) => {
        return (_jsxs("div", { className: "crud-indicator", children: [_jsx("span", { className: `crud-char ${permissions.Create ? 'crud-allowed' : 'crud-denied'}`, title: `Create: ${permissions.Create ? 'Allowed' : 'Denied'}`, children: "C" }), _jsx("span", { className: `crud-char ${permissions.Read ? 'crud-allowed' : 'crud-denied'}`, title: `Read: ${permissions.Read ? 'Allowed' : 'Denied'}`, children: "R" }), _jsx("span", { className: `crud-char ${permissions.Update ? 'crud-allowed' : 'crud-denied'}`, title: `Update: ${permissions.Update ? 'Allowed' : 'Denied'}`, children: "U" }), _jsx("span", { className: `crud-char ${permissions.Delete ? 'crud-allowed' : 'crud-denied'}`, title: `Delete: ${permissions.Delete ? 'Allowed' : 'Denied'}`, children: "D" })] }));
    };
    const handleContinue = () => {
        onComplete();
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Field Selection" }), _jsx("div", { className: "alert alert-info", children: "Select which fields to migrate for each object. The CRUD column shows your permissions for each field (Green = Allowed, Red = Denied)." }), migrationConfig.objects.map((obj) => {
                const fields = mockFields[obj.objectApiName] || [];
                const selectedCount = getSelectedCount(obj.objectApiName);
                const totalCount = getTotalCount(obj.objectApiName);
                return (_jsxs("div", { style: { marginBottom: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }, children: [_jsxs("h3", { style: { fontSize: '16px', margin: 0 }, children: [obj.label, " (", obj.objectApiName, ")"] }), _jsxs("span", { style: { fontSize: '13px', color: '#6b7280' }, children: ["Selected: ", selectedCount, "/", totalCount] })] }), _jsx("div", { style: { marginBottom: '8px' }, children: _jsxs("label", { style: { fontSize: '13px' }, children: [_jsx("input", { type: "checkbox", checked: selectedCount === totalCount && totalCount > 0, onChange: () => handleSelectAllFields(obj.objectApiName), style: { marginRight: '6px' } }), "Select All Fields"] }) }), _jsx("div", { style: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }, children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '40px' }, children: "\u2610" }), _jsx("th", { children: "Field Name" }), _jsx("th", { style: { width: '100px' }, children: "Type" }), _jsx("th", { style: { width: '120px' }, children: "CRUD" }), _jsx("th", { style: { width: '80px' }, children: "Length" })] }) }), _jsx("tbody", { children: fields.map((field) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: field.selected, onChange: () => handleToggleField(obj.objectApiName, field.name) }) }), _jsx("td", { children: field.label }), _jsx("td", { children: _jsx("code", { style: { fontSize: '12px' }, children: field.type }) }), _jsx("td", { children: renderCrudIndicator(field.permissions) }), _jsx("td", { children: field.length })] }, field.name))) })] }) })] }, obj.objectApiName));
            }), _jsx("div", { style: { marginTop: '20px' }, children: _jsx("button", { className: "btn btn-primary", onClick: handleContinue, children: "Continue" }) })] }));
};
export default Step5FieldSelection;
//# sourceMappingURL=Step5FieldSelection.js.map