import React, { useState } from 'react';
import { useMigrationStore, OrgConfig } from '../store/migrationStore';

interface Step2SourceOrgProps {
  onComplete: () => void;
}

const Step2SourceOrg: React.FC<Step2SourceOrgProps> = ({ onComplete }) => {
  const { setSourceOrg, migrationConfig } = useMigrationStore();
  const [authType, setAuthType] = useState<'oauth' | 'username_password' | 'passkey'>('oauth');
  const [orgName, setOrgName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [domain, setDomain] = useState('login');
  const [apiVersion, setApiVersion] = useState('v60.0');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ name: string; user: string; edition: string } | null>(null);

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
      
      const config: OrgConfig = {
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
    } catch (err) {
      setConnectionError('Failed to connect via OAuth. Please try again.');
    } finally {
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
      
      const config: OrgConfig = {
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
    } catch (err) {
      setConnectionError('Invalid credentials. Please check your username, password, and security token.');
    } finally {
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
      
      const config: OrgConfig = {
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
    } catch (err) {
      setConnectionError('Passkey authentication failed');
    } finally {
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
    } catch (err) {
      setConnectionError('Connection test failed');
    } finally {
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

  return (
    <div className="step-content">
      <h2>Source Org Configuration</h2>
      
      <div className="alert alert-info">
        Configure the connection to your Source Org. This is the org from which data will be extracted.
      </div>

      <div className="form-group">
        <label htmlFor="orgName">Org Name (Optional)</label>
        <input
          type="text"
          id="orgName"
          className="form-control"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="e.g., Production, Sandbox"
        />
      </div>

      <div className="form-group">
        <label>Authentication Method</label>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="authType"
              value="oauth"
              checked={authType === 'oauth'}
              onChange={() => setAuthType('oauth')}
              style={{ marginRight: '6px' }}
            />
            OAuth 2.0
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="authType"
              value="username_password"
              checked={authType === 'username_password'}
              onChange={() => setAuthType('username_password')}
              style={{ marginRight: '6px' }}
            />
            Username & Password
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="authType"
              value="passkey"
              checked={authType === 'passkey'}
              onChange={() => setAuthType('passkey')}
              style={{ marginRight: '6px' }}
            />
            Passkey
          </label>
        </div>
      </div>

      {authType === 'oauth' && (
        <div className="alert alert-info">
          Click the button below to open a Salesforce login popup. You will be redirected to grant permissions.
        </div>
      )}

      {authType === 'username_password' && (
        <>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="email"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="securityToken">Security Token *</label>
            <input
              type="text"
              id="securityToken"
              className="form-control"
              value={securityToken}
              onChange={(e) => setSecurityToken(e.target.value)}
              placeholder="Your security token"
            />
            <small style={{ color: '#6b7280', fontSize: '12px' }}>
              Get your security token from Salesforce Setup → My Personal Information → Reset Security Token
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="domain">Login Domain</label>
            <select
              id="domain"
              className="form-control"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              <option value="login">login.salesforce.com (Production)</option>
              <option value="test">test.salesforce.com (Sandbox)</option>
              <option value="custom">Custom Domain</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="apiVersion">API Version</label>
            <select
              id="apiVersion"
              className="form-control"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
            >
              <option value="v60.0">v60.0 (Latest)</option>
              <option value="v59.0">v59.0</option>
              <option value="v58.0">v58.0</option>
            </select>
          </div>
        </>
      )}

      {authType === 'passkey' && (
        <div className="alert alert-info">
          Passkey authentication requires your org to support FIDO2/WebAuthn. 
          Make sure you have registered a passkey with your Salesforce account.
        </div>
      )}

      {connectionError && (
        <div className="alert alert-error">{connectionError}</div>
      )}

      {orgInfo && (
        <div className="alert alert-success">
          <strong>Connected!</strong><br />
          Org: {orgInfo.name}<br />
          User: {orgInfo.user}<br />
          Edition: {orgInfo.edition}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button
          className="btn btn-primary"
          onClick={getConnectHandler()}
          disabled={isTesting}
        >
          {isTesting ? 'Connecting...' : authType === 'oauth' ? 'Connect with OAuth' : 'Connect'}
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleTestConnection}
          disabled={isTesting || !isConnected}
        >
          Test Connection
        </button>
      </div>
    </div>
  );
};

export default Step2SourceOrg;
