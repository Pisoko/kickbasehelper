const fetch = require('node-fetch');

async function testFormationComparison() {
  console.log('Testing formation comparison functionality...');
  
  const requestBody = {
    spieltag: 1,
    budget: 50000000,
    baseMode: 'avg',
    weights: {
      w_base: 1,
      w_form: 0.3,
      w_odds: 0.2,
      w_home: 0.1,
      w_minutes: 0.5,
      w_risk: 0.2,
      alpha: 0.8,
      beta: 0.1,
      gamma: 0.1
    },
    blacklist: []
  };

  try {
    console.log('Making API request...');
    const response = await fetch('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Formation comparison successful!');
    console.log('Selected formation:', result.formation);
    console.log('Expected points:', result.objective?.toFixed(2));
    console.log('Rest budget:', result.restbudget);
    console.log('Number of players in lineup:', result.lineup?.length);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFormationComparison();