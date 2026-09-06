import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMigrationStore } from '../store/migrationStore';
const Step2SourceOrg = ({ onComplete }) => {
    const { setSourceOrg, migrationConfig } = useMigrationStore();
    const [authType, setAuthType] = useState('oauth');
    const [orgName, setOrgName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [securityToken, setSecurityToken] = useState('');
    const [domain, setDomain] = useState('login');
    const [apiVersion, setApiVersion] = useState('v60.0');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [orgInfo, setOrgInfo] = useState(null);
    const handleOAuthConnect = async () => {
        setIsTesting(true);
        setConnectionError(null);
        try {
            // In a real implementation, this would open a Salesforce OAuth popup
            // For now, we'll simulate the connection
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Simulate successful OAuth connection
            setIsConnected(true);
            setOrgInfo({
                name: orgName || 'Production Org',
                user: username || 'user@example.com',
                edition: 'Enterprise',
            });
            const config = {
                orgId: `source_${Date.now()}`,
                orgName: orgName || 'Production Org',
                authType: 'oauth',
                credentials: {
                    accessToken: 'simulated_access_token',
                    refreshToken: 'simulated_refresh_token',
                    instanceUrl: `https://${domain}.salesforce.com`,
                },
                isConnected: true,
            };
            setSourceOrg(config);
            onComplete();
        }
        catch (err) {
            setConnectionError('Failed to connect via OAuth. Please try again.');
        }
        finally {
            setIsTesting(false);
        }
    };
    const handleUsernamePasswordConnect = async () => {
        if (!username || !password || !securityToken) {
            setConnectionError('Please fill in all required fields');
            return;
        }
        setIsTesting(true);
        setConnectionError(null);
        try {
            // Simulate API connection test
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsConnected(true);
            setOrgInfo({
                name: orgName || 'Production Org',
                user: username,
                edition: 'Enterprise',
            });
            const config = {
                orgId: `source_${Date.now()}`,
                orgName: orgName || 'Production Org',
                authType: 'username_password',
                credentials: {
                    username,
                    password: password + securityToken, // Salesforce combines these
                    loginUrl: `https://${domain}.salesforce.com`,
                    apiVersion,
                },
                isConnected: true,
            };
            setSourceOrg(config);
            onComplete();
        }
        catch (err) {
            setConnectionError('Invalid credentials. Please check your username, password, and security token.');
        }
        finally {
            setIsTesting(false);
        }
    };
    const handlePasskeyConnect = async () => {
        setIsTesting(true);
        setConnectionError(null);
        try {
            // Check if WebAuthn is supported
            if (!window.PublicKeyCredential) {
                setConnectionError('Passkeys are not supported in this browser');
                return;
            }
            // Simulate passkey authentication
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsConnected(true);
            setOrgInfo({
                name: orgName || 'Production Org',
                user: username || 'user@example.com',
                edition: 'Enterprise',
            });
            const config = {
                orgId: `source_${Date.now()}`,
                orgName: orgName || 'Production Org',
                authType: 'passkey',
                credentials: {
                    credentialId: 'simulated_credential_id',
                },
                isConnected: true,
            };
            setSourceOrg(config);
            onComplete();
        }
        catch (err) {
            setConnectionError('Passkey authentication failed');
        }
        finally {
            setIsTesting(false);
        }
    };
    const handleTestConnection = async () => {
        setIsTesting(true);
        setConnectionError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setOrgInfo({
                name: orgName || 'Test Org',
                user: username || 'test@example.com',
                edition: 'Developer',
            });
        }
        catch (err) {
            setConnectionError('Connection test failed');
        }
        finally {
            setIsTesting(false);
        }
    };
    const getConnectHandler = () => {
        switch (authType) {
            case 'oauth':
                return handleOAuthConnect;
            case 'username_password':
                return handleUsernamePasswordConnect;
            case 'passkey':
                return handlePasskeyConnect;
            default:
                return handleOAuthConnect;
        }
    };
    return (_jsxs("div", { className: "step-content", children: [_jsx("h2", { children: "Source Org Configuration" }), _jsx("div", { className: "alert alert-info", children: "Configure the connection to your Source Org. This is the org from which data will be extracted." }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "orgName", children: "Org Name (Optional)" }), _jsx("input", { type: "text", id: "orgName", className: "form-control", value: orgName, onChange: (e) => setOrgName(e.target.value), placeholder: "e.g., Production, Sandbox" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Authentication Method" }), _jsxs("div", { style: { display: 'flex', gap: '16px', marginTop: '8px' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx("input", { type: "radio", name: "authType", value: "oauth", checked: authType === 'oauth', onChange: () => setAuthType('oauth'), style: { marginRight: '6px' } }), "OAuth 2.0"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx("input", { type: "radio", name: "authType", value: "username_password", checked: authType === 'username_password', onChange: () => setAuthType('username_password'), style: { marginRight: '6px' } }), "Username & Password"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx("input", { type: "radio", name: "authType", value: "passkey", checked: authType === 'passkey', onChange: () => setAuthType('passkey'), style: { marginRight: '6px' } }), "Passkey"] })] })] }), authType === 'oauth' && (_jsx("div", { className: "alert alert-info", children: "Click the button below to open a Salesforce login popup. You will be redirected to grant permissions." })), authType === 'username_password' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "username", children: "Username *" }), _jsx("input", { type: "email", id: "username", className: "form-control", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "your.email@example.com" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: "Password *" }), _jsx("input", { type: "password", id: "password", className: "form-control", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Your password" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "securityToken", children: "Security Token *" }), _jsx("input", { type: "text", id: "securityToken", className: "form-control", value: securityToken, onChange: (e) => setSecurityToken(e.target.value), placeholder: "Your security token" }), _jsx("small", { style: { color: '#6b7280', fontSize: '12px' }, children: "Get your security token from Salesforce Setup \u2192 My Personal Information \u2192 Reset Security Token" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "domain", children: "Login Domain" }), _jsxs("select", { id: "domain", className: "form-control", value: domain, onChange: (e) => setDomain(e.target.value), children: [_jsx("option", { value: "login", children: "login.salesforce.com (Production)" }), _jsx("option", { value: "test", children: "test.salesforce.com (Sandbox)" }), _jsx("option", { value: "custom", children: "Custom Domain" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "apiVersion", children: "API Version" }), _jsxs("select", { id: "apiVersion", className: "form-control", value: apiVersion, onChange: (e) => setApiVersion(e.target.value), children: [_jsx("option", { value: "v60.0", children: "v60.0 (Latest)" }), _jsx("option", { value: "v59.0", children: "v59.0" }), _jsx("option", { value: "v58.0", children: "v58.0" })] })] })] })), authType === 'passkey' && (_jsx("div", { className: "alert alert-info", children: "Passkey authentication requires your org to support FIDO2/WebAuthn. Make sure you have registered a passkey with your Salesforce account." })), connectionError && (_jsx("div", { className: "alert alert-error", children: connectionError })), orgInfo && (_jsxs("div", { className: "alert alert-success", children: [_jsx("strong", { children: "Connected!" }), _jsx("br", {}), "Org: ", orgInfo.name, _jsx("br", {}), "User: ", orgInfo.user, _jsx("br", {}), "Edition: ", orgInfo.edition] })), _jsxs("div", { style: { marginTop: '20px', display: 'flex', gap: '12px' }, children: [_jsx("button", { className: "btn btn-primary", onClick: getConnectHandler(), disabled: isTesting, children: isTesting ? 'Connecting...' : authType === 'oauth' ? 'Connect with OAuth' : 'Connect' }), _jsx("button", { className: "btn btn-secondary", onClick: handleTestConnection, disabled: isTesting || !isConnected, children: "Test Connection" })] })] }));
};
export default Step2SourceOrg;
//# sourceMappingURL=Step2SourceOrg.js.map