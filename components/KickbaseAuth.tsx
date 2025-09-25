'use client';

import React, { useState, useEffect } from 'react';

interface AuthStatus {
  isAuthenticated: boolean;
  tokenValid: boolean;
  expiresAt?: string;
  userInfo?: {
    email?: string;
    leagues: string[];
  };
}

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  authStatus?: AuthStatus;
}

export default function KickbaseAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/status');
      const data: AuthResponse = await response.json();
      
      if (data.success && data.authStatus) {
        setAuthStatus(data.authStatus);
      } else {
        setAuthStatus({
          isAuthenticated: false,
          tokenValid: false
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({
        isAuthenticated: false,
        tokenValid: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.authStatus) {
        setAuthStatus(data.authStatus);
        setShowLoginForm(false);
        setPassword('');
      } else {
        setError(data.error || 'Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      setError('Netzwerkfehler bei der Anmeldung');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({
        isAuthenticated: false,
        tokenValid: false
      });
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const data: AuthResponse = await response.json();

      if (data.success && data.authStatus) {
        setAuthStatus(data.authStatus);
      } else {
        setError(data.error || 'Token-Erneuerung fehlgeschlagen');
      }
    } catch (error) {
      setError('Netzwerkfehler bei der Token-Erneuerung');
    } finally {
      setLoading(false);
    }
  };

  const formatExpiryTime = (expiresAt?: string) => {
    if (!expiresAt) return 'Unbekannt';
    const date = new Date(expiresAt);
    return date.toLocaleString('de-DE');
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      marginBottom: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>Kickbase Authentifizierung</h3>
      
      {loading && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e3f2fd', 
          border: '1px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          Lädt...
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '10px',
          color: '#d32f2f'
        }}>
          {error}
        </div>
      )}

      {authStatus && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Status:</h4>
          <div style={{ 
            padding: '10px', 
            backgroundColor: authStatus.isAuthenticated ? '#e8f5e8' : '#ffebee',
            border: `1px solid ${authStatus.isAuthenticated ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <p><strong>Angemeldet:</strong> {authStatus.isAuthenticated ? 'Ja' : 'Nein'}</p>
            <p><strong>Token gültig:</strong> {authStatus.tokenValid ? 'Ja' : 'Nein'}</p>
            {authStatus.expiresAt && (
              <p><strong>Token läuft ab:</strong> {formatExpiryTime(authStatus.expiresAt)}</p>
            )}
            {authStatus.userInfo && (
              <div>
                {authStatus.userInfo.email && (
                  <p><strong>E-Mail:</strong> {authStatus.userInfo.email}</p>
                )}
                <p><strong>Ligen:</strong> {authStatus.userInfo.leagues.length} Liga(n)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!authStatus?.isAuthenticated && !showLoginForm && (
        <button
          onClick={() => setShowLoginForm(true)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Anmelden
        </button>
      )}

      {showLoginForm && (
        <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>E-Mail:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Passwort:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setShowLoginForm(false)}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {authStatus?.isAuthenticated && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleLogout}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Abmelden
          </button>
          <button
            onClick={handleRefreshToken}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Token erneuern
          </button>
          <button
            onClick={checkAuthStatus}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Status prüfen
          </button>
        </div>
      )}
    </div>
  );
}