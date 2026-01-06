// api/search-recipes.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, pantryItems } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API key not configured'
      });
    }

    console.log('Searching for recipes:', query);

    const pantryList = pantryItems && pantryItems.length > 0
      ? pantryItems.map(item => item.name).join(', ')
      : 'none';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Find 5 recipes for: ${query}

I have these items in my pantry: ${pantryList}

For each recipe, format EXACTLY like this (no markdown symbols):

RECIPE_START
Name: [Recipe Name]
Servings: [number]
Time: [X minutes]

Ingredients:
[Amount] [ingredient name]
[Amount] [ingredient name]
[Amount] [ingredient name]

Instructions:
1. [First step]
2. [Second step]
3. [Third step]

RECIPE_END

Provide 5 different recipes. Use plain text only, no markdown symbols.`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to search recipes',
        details: errorText 
      });
    }

    const data = await response.json();
    const recipeText = data.content.map(block => block.text).join('\n');
    
    return res.status(200).json({
      success: true,
      recipes: recipeText
    });

  } catch (error) {
    console.error('Recipe search error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
