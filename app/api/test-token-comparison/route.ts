import { NextResponse } from 'next/server';

// Helper function to decode JWT token
function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format' };
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    return { error: 'Failed to decode JWT', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function testApiEndpoint(token: string, endpoint: string) {
  try {
    const response = await fetch(`https://api.kickbase.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'KickbaseHelper/1.0',
        'Accept': 'application/json'
      }
    });
    
    const result: any = {
      endpoint,
      status: response.status,
      success: response.ok,
      statusText: response.statusText
    };
    
    if (response.ok) {
      try {
        const data = await response.json();
        result.dataKeys = Object.keys(data);
        result.hasData = Object.keys(data).length > 0;
      } catch (e) {
        result.parseError = 'Failed to parse JSON response';
      }
    } else {
      try {
        result.errorText = await response.text();
      } catch (e) {
        result.errorText = 'Failed to read error response';
      }
    }
    
    return result;
  } catch (error) {
    return {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
}

export async function GET() {
  try {
    // Get existing token from .env
    const existingToken = process.env.KICKBASE_KEY;
    const email = process.env.KICKBASE_EMAIL;
    const password = process.env.KICKBASE_PASSWORD;
    
    if (!existingToken) {
      return NextResponse.json({
        success: false,
        error: "No KICKBASE_KEY found in .env file"
      });
    }

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: "KICKBASE_EMAIL or KICKBASE_PASSWORD not found in .env file"
      });
    }

    // Decode existing token
    const existingTokenData = decodeJWT(existingToken);
    
    // Test existing token with API calls
    const configTest = await testApiEndpoint(existingToken, '/v4/config');
    const leaguesTest = await testApiEndpoint(existingToken, '/v4/leagues/selection');
    
    // Generate new token using correct login endpoint
    let newToken = null;
    let newTokenData = null;
    let loginError = null;
    
    try {
      console.log('Attempting login to Kickbase API...');
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
        console.log('Login successful, response keys:', Object.keys(loginData));
        
        // Extract token from response (could be in different fields)
        newToken = loginData.tkn || loginData.token || loginData.accessToken || loginData.jwt || loginData.authToken;
        
        if (newToken) {
          newTokenData = decodeJWT(newToken);
          console.log('New token generated successfully');
        } else {
          console.log('No token found in login response:', loginData);
          loginError = 'No token found in login response';
        }
      } else {
        const errorText = await loginResponse.text();
        console.log('Login failed with status:', loginResponse.status, 'Response:', errorText);
        loginError = `Login failed with status ${loginResponse.status}: ${errorText}`;
      }
    } catch (error) {
      console.error('Login request failed:', error);
      loginError = `Login request failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    return NextResponse.json({
      success: true,
      existingToken: {
        valid: true,
        decoded: existingTokenData,
        apiTests: {
          config: configTest,
          leagues: leaguesTest
        }
      },
      newToken: newToken ? {
        valid: true,
        decoded: newTokenData,
        matches: newToken === existingToken
      } : null,
      loginError,
      comparison: newToken ? {
        tokensMatch: newToken === existingToken,
        existingTokenValid: configTest.success,
        newTokenGenerated: !!newToken
      } : null
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}