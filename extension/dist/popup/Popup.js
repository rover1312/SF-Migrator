import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import './styles.css';
export const Popup = () => {
    const [migrationCount, setMigrationCount] = useState(0);
    useEffect(() => {
        // Load migration count from storage
        chrome.storage.local.get(['migrationCount'], (result) => {
            setMigrationCount(result.migrationCount || 0);
        });
    }, []);
    const openOptionsPage = () => {
        chrome.runtime.openOptionsPage();
    };
    return (_jsxs("div", { className: "popup-container", children: [_jsxs("header", { className: "popup-header", children: [_jsx("h1", { children: "SF-Migrator" }), _jsx("p", { className: "subtitle", children: "Salesforce Data Migration Tool" })] }), _jsxs("main", { className: "popup-main", children: [_jsxs("div", { className: "stats-card", children: [_jsx("h2", { children: "Quick Stats" }), _jsxs("p", { children: ["Migrations completed: ", migrationCount] })] }), _jsx("button", { className: "open-full-btn", onClick: openOptionsPage, children: "Open Full Migration Wizard" })] }), _jsx("footer", { className: "popup-footer", children: _jsx("p", { children: "v1.0.0" }) })] }));
};
//# sourceMappingURL=Popup.js.map