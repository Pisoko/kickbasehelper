import pino from 'pino';

const logger = pino({ name: 'KickbaseAuthService' });

interface AuthToken {
  tkn: string;
  tknex: string;
}

interface TokenClaims {
  uid: string;
  kblid: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Enhanced Kickbase Authentication Service
 * Based on the official Kickbase API v4 documentation
 */
export class KickbaseAuthService {
  private readonly baseUrl = 'https://api.kickbase.com';
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private readonly apiKey: string | null = null;

  constructor() {
    // Initialize with API key from environment
    this.apiKey = process.env.KICKBASE_KEY || null;
    // Initialize with any existing token from environment or storage
    this.loadStoredToken();
  }

  /**
   * Authenticate with email and password using Kickbase login endpoint
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Attempting authentication with email:', email);
      
      // Use our own API endpoint that handles the authentication server-side
      const response = await fetch('/api/auth/kickbase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          this.token = data.token;
          this.tokenExpiry = new Date(data.tokenExpiry);
          console.log('✅ Authentication successful');
          return true;
        }
      }

      console.log('❌ Authentication failed');
      return false;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return false;
    }
  }

  /**
   * Get a valid authentication token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.token;
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      await this.refreshPromise;
      return this.token;
    }

    // Start a new refresh
    this.refreshPromise = this.refreshToken();
    const success = await this.refreshPromise;
    this.refreshPromise = null;

    return success ? this.token : null;
  }

  /**
   * Refresh the authentication token using the Kickbase API
   */
  async refreshToken(): Promise<boolean> {
    try {
      logger.info('Refreshing Kickbase authentication token');
      
      const response = await fetch(`${this.baseUrl}/v4/chat/refreshtoken`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.error({ status: response.status }, 'Token refresh failed');
        return false;
      }

      const authData: AuthToken = await response.json();
      
      this.token = authData.tkn;
      this.tokenExpiry = new Date(authData.tknex);
      
      // Store token for persistence
      this.storeToken(authData);
      
      logger.info({ 
        expiresAt: this.tokenExpiry.toISOString() 
      }, 'Token refreshed successfully');
      
      return true;
    } catch (error) {
      logger.error({ error }, 'Error refreshing token');
      return false;
    }
  }

  /**
   * Check if current token is valid and not expired, or if API key is available
   */
  isTokenValid(): boolean {
    // If we have an API key from environment, consider it valid
    if (this.apiKey) {
      return true;
    }

    if (!this.token || !this.tokenExpiry) {
      return false;
    }

    // Check if token expires within the next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.tokenExpiry > fiveMinutesFromNow;
  }

  /**
   * Decode JWT token to extract claims (without verification)
   */
  private decodeToken(token: string): TokenClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));
      return decoded as TokenClaims;
    } catch (error) {
      logger.error({ error }, 'Error decoding token');
      return null;
    }
  }

  /**
   * Get the user ID from the current token
   */
  getUserId(): string | null {
    if (!this.token) {
      return null;
    }

    const claims = this.decodeToken(this.token);
    return claims?.uid || null;
  }

  /**
   * Get token claims for the current token
   */
  getTokenClaims(): TokenClaims | null {
    if (!this.token) {
      return null;
    }

    return this.decodeToken(this.token);
  }

  /**
   * Get league IDs from the current token
   */
  getLeagueIds(): string[] {
    if (!this.token) {
      return [];
    }

    const claims = this.decodeToken(this.token);
    if (!claims?.kblid) {
      return [];
    }

    return claims.kblid.split(',').filter(id => id.trim().length > 0);
  }

  /**
   * Store token in environment variables or local storage
   */
  private storeToken(authData: AuthToken): void {
    // In a real application, you might want to store this securely
    // For now, we'll just keep it in memory
    logger.debug('Token stored in memory');
  }

  /**
   * Load stored token from environment or storage
   */
  private loadStoredToken(): void {
    // In a real application, you might load from secure storage
    // For now, we'll start fresh each time
    logger.debug('No stored token found, will refresh on first use');
  }

  /**
   * Create authenticated headers for API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    // Prefer API key from environment if available
    if (this.apiKey) {
      return {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
    }

    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('Unable to obtain valid authentication token');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Clear stored authentication data
   */
  clearAuth(): void {
    this.token = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
    logger.info('Authentication data cleared');
  }
}

// Export singleton instance
export const kickbaseAuth = new KickbaseAuthService();