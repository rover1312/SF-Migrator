import React, { useEffect, useState } from 'react';
import './styles.css';

const Popup: React.FC = () => {
  const [migrationCount, setMigrationCount] = useState<number>(0);

  useEffect(() => {
    // Load migration count from storage
    chrome.storage.local.get(['migrationCount'], (result) => {
      setMigrationCount(result.migrationCount || 0);
    });
  }, []);

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>SF-Migrator</h1>
        <p className="subtitle">Salesforce Data Migration Tool</p>
      </header>

      <main className="popup-main">
        <div className="stats-card">
          <h2>Quick Stats</h2>
          <p>Migrations completed: {migrationCount}</p>
        </div>

        <button className="open-full-btn" onClick={openOptionsPage}>
          Open Full Migration Wizard
        </button>
      </main>

      <footer className="popup-footer">
        <p>v1.0.0</p>
      </footer>
    </div>
  );
};

export default Popup;
