// api/generate-recipes.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemList } = req.body;

    if (!itemList) {
      return res.status(400).json({ error: 'Item list is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Debug logging
    console.log('=== DEBUG INFO ===');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key starts with sk-ant:', apiKey?.startsWith('sk-ant'));
    console.log('API Key length:', apiKey?.length);
    console.log('First 10 chars:', apiKey?.substring(0, 10));
    console.log('Last 5 chars:', apiKey?.substring(apiKey?.length - 5));
    
    if (!apiKey) {
      console.error('ERROR: API key is undefined or null');
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'ANTHROPIC_API_KEY environment variable is missing' 
      });
    }

    if (!apiKey.startsWith('sk-ant')) {
      console.error('ERROR: API key does not start with sk-ant');
      return res.status(500).json({ 
        error: 'Invalid API key format',
        message: 'API key should start with sk-ant' 
      });
    }

    console.log('Making request to Anthropic API...');

    const anthropicRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `I have these ingredients in my pantry: ${itemList}. 

Please suggest 3 creative recipes I can make, prioritizing ingredients that expire soonest. For each recipe:
- Give it a catchy name
- List ingredients needed (highlighting what I already have)
- Brief cooking steps
- Estimated time

Keep it concise and practical!`
      }]
    };

    console.log('Request body:', JSON.stringify(anthropicRequest).substring(0, 100));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    const responseText = await response.text();
    console.log('Response body (first 300 chars):', responseText.substring(0, 300));

    if (!response.ok) {
      console.error('Anthropic API returned error');
      console.error('Full error response:', responseText);
      
      let errorMessage = 'Failed to generate recipes';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        details: responseText.substring(0, 500)
      });
    }

    const data = JSON.parse(responseText);
    console.log('Success! Generated', data.content?.length, 'content blocks');
    return res.status(200).json(data);

  } catch (error) {
    console.error('Unexpected server error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
  }
}
