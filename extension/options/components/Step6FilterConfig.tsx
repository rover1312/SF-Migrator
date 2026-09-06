import React from 'react';
import { useMigrationStore } from '../store/migrationStore';

interface Step6FilterConfigProps {
  onComplete: () => void;
}

const Step6FilterConfig: React.FC<Step6FilterConfigProps> = ({ onComplete }) => {
  const { migrationConfig, setFilterForObject } = useMigrationStore();
  const [filters, setFilters] = React.useState<Record<string, string>>({});

  const handleFilterChange = (objectName: string, filter: string) => {
    setFilters({ ...filters, [objectName]: filter });
  };

  const handleApplyFilter = (objectName: string) => {
    setFilterForObject(objectName, filters[objectName] || '');
  };

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="step-content">
      <h2>Filter Configuration</h2>
      
      <div className="alert alert-info">
        Configure WHERE clauses to filter which records are extracted for each object.
        Leave empty to extract all records.
      </div>

      {migrationConfig.objects.map((obj) => (
        <div key={obj.objectApiName} className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <span className="card-title">{obj.label} ({obj.objectApiName})</span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              ~{obj.recordCount?.toLocaleString()} records
            </span>
          </div>

          <div className="form-group">
            <label htmlFor={`filter-${obj.objectApiName}`}>WHERE Clause (SOQL)</label>
            <input
              type="text"
              id={`filter-${obj.objectApiName}`}
              className="form-control"
              value={filters[obj.objectApiName] || obj.filter || ''}
              onChange={(e) => handleFilterChange(obj.objectApiName, e.target.value)}
              placeholder="e.g., Industry = 'Technology' AND AnnualRevenue > 1000000"
            />
            <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Use standard SOQL syntax. Example: Name LIKE 'Acme%' OR CreatedDate = LAST_N_DAYS:30
            </small>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => handleApplyFilter(obj.objectApiName)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Apply Filter
          </button>
        </div>
      ))}

      <div className="alert alert-warning" style={{ marginTop: '20px' }}>
        <strong>Tip:</strong> Filters reduce the amount of data extracted. Test your filters carefully 
        before proceeding to extraction.
      </div>

      <div style={{ marginTop: '20px' }}>
        <button className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default Step6FilterConfig;
