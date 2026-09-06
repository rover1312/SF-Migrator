import React from 'react';
import { useMigrationStore, Field } from '../store/migrationStore';

interface Step5FieldSelectionProps {
  onComplete: () => void;
}

const Step5FieldSelection: React.FC<Step5FieldSelectionProps> = ({ onComplete }) => {
  const { migrationConfig, setFieldsForObject, setFieldSelection } = useMigrationStore();

  // Mock fields for demonstration - in real implementation would fetch from API
  const mockFields: Record<string, Field[]> = {
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

  const handleSelectAllFields = (objectName: string) => {
    const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
    if (!object) return;

    const fields = mockFields[objectName] || [];
    const allSelected = fields.every(f => f.selected);
    
    const updatedFields = fields.map(f => ({ ...f, selected: !allSelected }));
    setFieldsForObject(objectName, updatedFields);
  };

  const handleToggleField = (objectName: string, fieldName: string) => {
    const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
    if (!object || !object.fields) return;

    const field = object.fields.find(f => f.name === fieldName);
    if (field) {
      setFieldSelection(objectName, fieldName, !field.selected);
    }
  };

  const getSelectedCount = (objectName: string) => {
    const object = migrationConfig.objects.find(obj => obj.objectApiName === objectName);
    if (!object || !object.fields) return 0;
    return object.fields.filter(f => f.selected).length;
  };

  const getTotalCount = (objectName: string) => {
    return mockFields[objectName]?.length || 0;
  };

  const renderCrudIndicator = (permissions: Field['permissions']) => {
    return (
      <div className="crud-indicator">
        <span
          className={`crud-char ${permissions.Create ? 'crud-allowed' : 'crud-denied'}`}
          title={`Create: ${permissions.Create ? 'Allowed' : 'Denied'}`}
        >
          C
        </span>
        <span
          className={`crud-char ${permissions.Read ? 'crud-allowed' : 'crud-denied'}`}
          title={`Read: ${permissions.Read ? 'Allowed' : 'Denied'}`}
        >
          R
        </span>
        <span
          className={`crud-char ${permissions.Update ? 'crud-allowed' : 'crud-denied'}`}
          title={`Update: ${permissions.Update ? 'Allowed' : 'Denied'}`}
        >
          U
        </span>
        <span
          className={`crud-char ${permissions.Delete ? 'crud-allowed' : 'crud-denied'}`}
          title={`Delete: ${permissions.Delete ? 'Allowed' : 'Denied'}`}
        >
          D
        </span>
      </div>
    );
  };

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="step-content">
      <h2>Field Selection</h2>
      
      <div className="alert alert-info">
        Select which fields to migrate for each object. The CRUD column shows your permissions 
        for each field (Green = Allowed, Red = Denied).
      </div>

      {migrationConfig.objects.map((obj) => {
        const fields = mockFields[obj.objectApiName] || [];
        const selectedCount = getSelectedCount(obj.objectApiName);
        const totalCount = getTotalCount(obj.objectApiName);

        return (
          <div key={obj.objectApiName} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{obj.label} ({obj.objectApiName})</h3>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Selected: {selectedCount}/{totalCount}
              </span>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={selectedCount === totalCount && totalCount > 0}
                  onChange={() => handleSelectAllFields(obj.objectApiName)}
                  style={{ marginRight: '6px' }}
                />
                Select All Fields
              </label>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>☐</th>
                    <th>Field Name</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th style={{ width: '120px' }}>CRUD</th>
                    <th style={{ width: '80px' }}>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <input
                          type="checkbox"
                          checked={field.selected}
                          onChange={() => handleToggleField(obj.objectApiName, field.name)}
                        />
                      </td>
                      <td>{field.label}</td>
                      <td><code style={{ fontSize: '12px' }}>{field.type}</code></td>
                      <td>{renderCrudIndicator(field.permissions)}</td>
                      <td>{field.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: '20px' }}>
        <button className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default Step5FieldSelection;
