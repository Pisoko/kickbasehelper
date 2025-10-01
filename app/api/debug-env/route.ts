import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.KICKBASE_KEY;
  
  // Test the exact API call
  let apiTestResult = null;
  if (apiKey) {
    try {
      const response = await fetch('https://api.kickbase.com/v4/competitions/1/matchdays', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'curl/7.68.0',
          'Accept': '*/*',
        },
      });
      
      apiTestResult = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      } as any;
      
      if (response.ok) {
        const data = await response.json();
        apiTestResult.dataStructure = {
          hasIt: !!data.it,
          itLength: data.it?.length || 0,
          firstMatchdayDay: data.it?.[0]?.day || null,
        };
      } else {
        const errorText = await response.text();
        apiTestResult.errorBody = errorText.substring(0, 200);
      }
    } catch (error) {
      apiTestResult = {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyStart: apiKey?.substring(0, 10) || 'N/A',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('KICKBASE')),
    apiTest: apiTestResult
  });
}