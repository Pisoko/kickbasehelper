import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Collect environment information
    const environmentInfo = {
      // Node.js version
      nodeVersion: process.version,
      
      // Platform information
      platform: process.platform,
      arch: process.arch,
      
      // Environment variables (safe ones only)
      nodeEnv: process.env.NODE_ENV,
      nextjsVersion: process.env.npm_package_dependencies_next || 'unknown',
      
      // Runtime information
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      
      // Request headers (for debugging)
      userAgent: request.headers.get('user-agent'),
      acceptEncoding: request.headers.get('accept-encoding'),
      
      // JavaScript engine features
      features: {
        bigint: typeof BigInt !== 'undefined',
        asyncIterators: typeof Symbol.asyncIterator !== 'undefined',
        optionalChaining: true, // This will work if the code runs
        nullishCoalescing: true, // This will work if the code runs
      },
      
      // Date/Time handling
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      
      // JSON parsing test
      jsonTest: (() => {
        try {
          const testObj = { test: 123, nested: { value: "test" } };
          const stringified = JSON.stringify(testObj);
          const parsed = JSON.parse(stringified);
          return {
            success: true,
            stringified,
            parsed,
            equal: JSON.stringify(testObj) === JSON.stringify(parsed)
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })(),
      
      // Array handling test
      arrayTest: (() => {
        try {
          const testArray = [1, 2, 3];
          const mapped = testArray.map(x => x * 2);
          const filtered = testArray.filter(x => x > 1);
          return {
            success: true,
            original: testArray,
            mapped,
            filtered,
            isArray: Array.isArray(testArray)
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })(),
      
      // Number handling test
      numberTest: (() => {
        try {
          const testNumber = "123";
          const parsed = Number(testNumber);
          const isInteger = Number.isInteger(parsed);
          return {
            success: true,
            original: testNumber,
            parsed,
            isInteger,
            type: typeof parsed
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })(),
      
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      environment: environmentInfo
    });
  } catch (error) {
    console.error('Error in debug-environment endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}