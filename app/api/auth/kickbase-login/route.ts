import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('🔐 Server-side authentication attempt for:', email);

    // Step 1: Try to authenticate with Kickbase website
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const loginResponse = await fetch('https://www.kickbase.com/login', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      redirect: 'manual',
    });

    console.log('Login response status:', loginResponse.status);
    console.log('Login response headers:', Object.fromEntries(loginResponse.headers.entries()));

    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Received cookies:', cookies);

    if (loginResponse.status === 302 || loginResponse.status === 200) {
      console.log('✅ Website login successful');

      // Step 2: Try to get API token using the session cookies
      const tokenResponse = await fetch('https://api.kickbase.com/v4/chat/refreshtoken', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': cookies || '',
        },
      });

      console.log('Token response status:', tokenResponse.status);

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        console.log('✅ Token obtained successfully');
        
        return NextResponse.json({
          success: true,
          token: tokenData.tkn,
          tokenExpiry: tokenData.tknex,
        });
      } else {
        const errorText = await tokenResponse.text();
        console.log('❌ Failed to get token:', errorText);
        
        return NextResponse.json(
          { success: false, error: 'Failed to obtain API token' },
          { status: 401 }
        );
      }
    } else {
      console.log('❌ Website login failed');
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}