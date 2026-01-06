// api/lookup-barcode.js
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
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    console.log('Looking up barcode:', barcode);

    // Try Open Food Facts API (free, no API key needed)
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    
    if (offResponse.ok) {
      const offData = await offResponse.json();
      
      if (offData.status === 1 && offData.product) {
        const product = offData.product;
        
        // Determine category
        let category = 'Other';
        const categories = product.categories_tags || [];
        
        if (categories.some(c => c.includes('meat') || c.includes('poultry') || c.includes('fish'))) {
          category = 'Meat';
        } else if (categories.some(c => c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('yogurt'))) {
          category = 'Dairy';
        } else if (categories.some(c => c.includes('fruit') || c.includes('vegetable'))) {
          category = 'Produce';
        } else if (categories.some(c => c.includes('frozen'))) {
          category = 'Frozen';
        } else if (categories.some(c => c.includes('canned') || c.includes('pasta') || c.includes('rice') || c.includes('cereal'))) {
          category = 'Pantry';
        }

        console.log('Found product:', product.product_name);
        
        return res.status(200).json({
          success: true,
          product: {
            name: product.product_name || product.generic_name || `Product ${barcode}`,
            brand: product.brands || '',
            category: category,
            image: product.image_url || null
          }
        });
      }
    }

    // If Open Food Facts doesn't have it, try UPC Item DB (free, no key needed)
    console.log('Open Food Facts didn\'t find it, trying UPC Item DB...');
    
    const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    
    if (upcResponse.ok) {
      const upcData = await upcResponse.json();
      
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        
        // Determine category from UPC data
        let category = 'Other';
        const title = (item.title || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        
        if (cat.includes('food') || title.includes('food')) {
          if (title.includes('meat') || title.includes('chicken') || title.includes('beef') || title.includes('fish')) {
            category = 'Meat';
          } else if (title.includes('milk') || title.includes('cheese') || title.includes('yogurt') || title.includes('dairy')) {
            category = 'Dairy';
          } else if (title.includes('fruit') || title.includes('vegetable')) {
            category = 'Produce';
          } else if (title.includes('frozen')) {
            category = 'Frozen';
          } else {
            category = 'Pantry';
          }
        }

        console.log('Found product in UPC DB:', item.title);
        
        return res.status(200).json({
          success: true,
          product: {
            name: item.title || `Product ${barcode}`,
            brand: item.brand || '',
            category: category,
            image: item.images?.[0] || null
          }
        });
      }
    }

    // If both APIs fail, return a basic result
    console.log('Product not found in any database');
    return res.status(200).json({
      success: false,
      product: {
        name: `Unknown Product ${barcode}`,
        brand: '',
        category: 'Other',
        image: null
      }
    });

  } catch (error) {
    console.error('Barcode lookup error:', error);
    return res.status(500).json({ 
      error: 'Failed to lookup barcode',
      message: error.message 
    });
  }
}
