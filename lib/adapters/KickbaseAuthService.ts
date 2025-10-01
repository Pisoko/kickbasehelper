import pino from 'pino';

const logger = pino({ name: 'KickbaseAuthService' });

interface AuthToken {
  tkn: string;
  tknex: string;
}

interface TokenClaims {
  'kb.uid': string;
  'kb.name': string;
  'kb.r': string;
  'kb.a': string;
  'kb.p': string;
  'kb.cc': string;
  iat: number;
  nbf: number;
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
  private readonly apiKey: string | null;

  constructor() {
    // Initialize with API key from environment
    this.apiKey = process.env.KICKBASE_KEY || null;
    console.log('🔧 KickbaseAuthService initialized with API key:', this.apiKey ? 'YES' : 'NO');
    if (this.apiKey) {
      console.log('🔑 API key (first 20 chars):', this.apiKey.substring(0, 20) + '...');
    }
    // Initialize with any existing token from environment or storage
    this.loadStoredToken();
  }

  /**
   * Authenticate with email and password using Kickbase API login endpoint
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Attempting authentication with email:', email);
      
      // Use the correct Kickbase API login endpoint
      const loginResponse = await fetch('https://api.kickbase.com/v4/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KickbaseHelper/1.0'
        },
        body: JSON.stringify({
          em: email,
          pass: password
        })
      });

      console.log('Login response status:', loginResponse.status);

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ API login successful');
        
        // Extract token from response
        const token = loginData.tkn;
        const tokenExpiry = loginData.tknex;
        
        if (token && tokenExpiry) {
          this.token = token;
          this.tokenExpiry = new Date(tokenExpiry);
          
          // Store token for persistence
          this.storeToken(loginData);
          
          logger.info({ 
            expiresAt: this.tokenExpiry.toISOString() 
          }, 'Authentication successful');
          
          return true;
        } else {
          console.log('❌ No token found in login response');
          logger.error('No token found in login response');
        }
      } else {
        const errorText = await loginResponse.text();
        console.log('❌ API login failed:', errorText);
        logger.error({ status: loginResponse.status, error: errorText }, 'API login failed');
      }
    } catch (error) {
      console.log('❌ Authentication request failed:', error);
      logger.error({ error }, 'Authentication failed');
    }
    
    return false;
  }

  /**
   * Get a valid authentication token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    // If we have an API key from environment, use it directly
    if (this.apiKey) {
      console.log('🔑 Using API key from environment (first 20 chars):', this.apiKey.substring(0, 20) + '...');
      return this.apiKey;
    }

    console.log('⚠️ No API key found in environment, checking stored token...');

    if (this.isTokenValid()) {
      console.log('✅ Stored token is valid');
      return this.token;
    }

    console.log('❌ No valid token available, attempting refresh...');

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
        logger.warn({ status: response.status }, 'Token refresh failed, attempting new authentication');
        
        // If refresh fails, try to authenticate with stored credentials
        const email = process.env.KICKBASE_EMAIL;
        const password = process.env.KICKBASE_PASSWORD;
        
        if (email && password) {
          logger.info('Attempting automatic re-authentication with stored credentials');
          return await this.authenticate(email, password);
        } else {
          logger.error('No stored credentials available for automatic re-authentication');
          return false;
        }
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
      logger.error({ error }, 'Error refreshing token, attempting fallback authentication');
      
      // Fallback: Try to authenticate with stored credentials
      const email = process.env.KICKBASE_EMAIL;
      const password = process.env.KICKBASE_PASSWORD;
      
      if (email && password) {
        logger.info('Attempting fallback authentication with stored credentials');
        return await this.authenticate(email, password);
      }
      
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
      console.log('🔍 Decoding token, length:', token?.length);
      const parts = token.split('.');
      console.log('🔍 Token parts:', parts.length);
      
      if (parts.length !== 3) {
        console.log('❌ Invalid JWT format, parts:', parts.length);
        return null;
      }

      const payload = parts[1];
      console.log('🔍 Payload part length:', payload.length);
      
      // Convert base64url to base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      console.log('🔍 Base64 conversion done, padded length:', padded.length);
      
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString());
      console.log('✅ Token decoded successfully, keys:', Object.keys(decoded));
      return decoded as TokenClaims;
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      logger.error({ error }, 'Error decoding token');
      return null;
    }
  }

  /**
   * Get the user ID from the current token
   */
  async getUserId(): Promise<string | null> {
    const claims = await this.getTokenClaims();
    return claims?.['kb.uid'] || null;
  }

  /**
   * Get token claims for the current token
   */
  async getTokenClaims(): Promise<TokenClaims | null> {
    console.log('🔍 getTokenClaims called');
    const token = await this.getValidToken();
    
    if (!token) {
      console.log('❌ No token available from getValidToken');
      return null;
    }

    console.log('✅ Got token from getValidToken, length:', token.length);
    return this.decodeToken(token);
  }

  /**
   * Get league IDs from the current token
   */
  async getLeagueIds(): Promise<string[]> {
    const claims = await this.getTokenClaims();
    if (!claims?.['kb.p']) {
      return [];
    }

    // kb.p contains comma-separated project/league IDs
    return claims['kb.p'].split(',').filter(id => id.trim().length > 0);
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