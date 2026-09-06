import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step4ObjectSelectionProps {
  onComplete: () => void;
}

const Step4ObjectSelection: React.FC<Step4ObjectSelectionProps> = ({ onComplete }) => {
  const { setObjects, migrationConfig } = useMigrationStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'standard' | 'custom'>('all');
  const [selectedObjectNames, setSelectedObjectNames] = React.useState<string[]>([]);

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
    } else {
      setSelectedObjectNames(filteredObjects.map(obj => obj.name));
    }
  };

  const handleToggleObject = (objectName: string) => {
    if (selectedObjectNames.includes(objectName)) {
      setSelectedObjectNames(selectedObjectNames.filter(name => name !== objectName));
    } else {
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

  return (
    <div className="step-content">
      <h2>Object Selection</h2>
      
      <div className="alert alert-info">
        Select the Salesforce objects you want to migrate. Only objects with Read permission are shown.
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search objects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        
        <select
          className="form-control"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          style={{ width: '150px' }}
        >
          <option value="all">All Objects</option>
          <option value="standard">Standard</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Found {filteredObjects.length} objects</span>
        <button className="btn btn-secondary" onClick={handleSelectAll} style={{ padding: '6px 12px', fontSize: '12px' }}>
          {selectedObjectNames.length === filteredObjects.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Select</th>
              <th>Object Name</th>
              <th>API Name</th>
              <th>Type</th>
              <th>Records</th>
            </tr>
          </thead>
          <tbody>
            {filteredObjects.map((obj) => (
              <tr key={obj.name}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedObjectNames.includes(obj.name)}
                    onChange={() => handleToggleObject(obj.name)}
                  />
                </td>
                <td>{obj.label}</td>
                <td><code>{obj.name}</code></td>
                <td>
                  <span className={`status-indicator ${obj.custom ? 'status-disconnected' : 'status-connected'}`}>
                    {obj.custom ? 'Custom' : 'Standard'}
                  </span>
                </td>
                <td>{obj.recordCount?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedObjectNames.length === 0 && (
        <div className="alert alert-warning" style={{ marginTop: '16px' }}>
          Please select at least one object to proceed.
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={selectedObjectNames.length === 0}
        >
          Continue ({selectedObjectNames.length} selected)
        </button>
      </div>
    </div>
  );
};

export default Step4ObjectSelection;
