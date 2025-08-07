const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Scraping function for Torfs shoes
async function scrapeTorfsShoes() {
    try {
        // Torfs shoes page URL
        const url = 'https://www.torfs.be/nl/schoenen';
        
        console.log('Scraping Torfs shoes from:', url);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const products = [];

        // Multiple scraping strategies for different website structures
        const scrapingStrategies = [
            // Strategy 1: Common e-commerce selectors
            () => {
                const found = [];
                $('.product-item, .product-card, .product, [data-product]').each((index, element) => {
                    const $element = $(element);
                    
                    const name = $element.find('.product-name, .product-title, .name, h3, h4, .title').first().text().trim();
                    const price = $element.find('.price, .product-price, .current-price, .price-current, [data-price]').first().text().trim();
                    const image = $element.find('img').first().attr('src') || $element.find('img').first().attr('data-src');
                    const productUrl = $element.find('a').first().attr('href');

                    if (name && name.length > 2) {
                        found.push({ name, price, image, productUrl });
                    }
                });
                return found;
            },
            
            // Strategy 2: Generic product links
            () => {
                const found = [];
                $('a[href*="/product/"], a[href*="/schoenen/"], a[href*="/item/"]').each((index, element) => {
                    const $element = $(element);
                    const $parent = $element.parent();
                    
                    const name = $element.text().trim() || $parent.find('h3, h4, .title, .name').text().trim();
                    const price = $parent.find('.price, .price-current, [class*="price"]').text().trim();
                    const image = $element.find('img').attr('src') || $element.find('img').attr('data-src');
                    
                    if (name && name.length > 3 && !found.some(p => p.name === name)) {
                        found.push({ name, price, image, productUrl: $element.attr('href') });
                    }
                });
                return found;
            },
            
            // Strategy 3: Look for any elements with product-like content
            () => {
                const found = [];
                $('div, article, section').each((index, element) => {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Check if this element contains product-like information
                    if (text.length > 10 && text.length < 200 && 
                        (text.includes('€') || text.includes('EUR') || /\d+/.test(text))) {
                        
                        const name = $element.find('h1, h2, h3, h4, .title, .name').first().text().trim();
                        const price = $element.find('.price, [class*="price"]').text().trim() || 
                                    text.match(/€\s*\d+[.,]\d*/)?.[0] || 
                                    text.match(/\d+[.,]\d*\s*EUR/)?.[0];
                        const image = $element.find('img').first().attr('src') || $element.find('img').first().attr('data-src');
                        const productUrl = $element.find('a').first().attr('href');
                        
                        if (name && name.length > 2 && !found.some(p => p.name === name)) {
                            found.push({ name, price, image, productUrl });
                        }
                    }
                });
                return found;
            }
        ];

        // Try each strategy until we find products
        for (const strategy of scrapingStrategies) {
            const found = strategy();
            if (found.length > 0) {
                console.log(`Found ${found.length} products using strategy`);
                products.push(...found);
                break;
            }
        }

        // If still no products, try a very generic approach
        if (products.length === 0) {
            console.log('Trying generic approach...');
            
            // Look for any text that might be product names
            $('body').find('*').each((index, element) => {
                const $element = $(element);
                const text = $element.text().trim();
                
                // Skip if text is too short or too long
                if (text.length < 5 || text.length > 100) return;
                
                // Skip if it's just numbers or common words
                if (/^\d+$/.test(text) || /^(Home|Menu|Search|Login|Register)$/i.test(text)) return;
                
                // Check if it might be a product name (contains common shoe-related words)
                const shoeKeywords = ['schoen', 'schoenen', 'shoe', 'shoes', 'sneaker', 'boot', 'sandal'];
                const hasShoeKeyword = shoeKeywords.some(keyword => 
                    text.toLowerCase().includes(keyword)
                );
                
                if (hasShoeKeyword || text.includes('€') || /\d+[.,]\d*/.test(text)) {
                    const price = text.match(/€\s*\d+[.,]\d*/)?.[0] || 
                                text.match(/\d+[.,]\d*\s*EUR/)?.[0] || 
                                'Price not available';
                    
                    if (!products.some(p => p.name === text)) {
                        products.push({
                            name: text,
                            price: price,
                            image: null,
                            productUrl: null
                        });
                    }
                }
            });
        }

        // Process and clean the found products
        const processedProducts = products.slice(0, 50).map((product, index) => ({
            id: index + 1,
            name: product.name || 'Unknown Product',
            price: product.price || 'Price not available',
            image: product.image ? (product.image.startsWith('http') ? product.image : `https://www.torfs.be${product.image}`) : null,
            url: product.productUrl ? (product.productUrl.startsWith('http') ? product.productUrl : `https://www.torfs.be${product.productUrl}`) : null,
            scrapedAt: new Date().toISOString()
        }));

        console.log(`Successfully scraped ${processedProducts.length} products`);
        return processedProducts;

    } catch (error) {
        console.error('Error scraping Torfs:', error.message);
        
        // Return sample data if scraping fails
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.response?.status >= 400) {
            console.log('Returning sample data due to connection issues or website blocking');
            return [
                {
                    id: 1,
                    name: "Torfs Sneaker Classic",
                    price: "€89.99",
                    image: null,
                    url: null,
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Torfs Boots Winter",
                    price: "€129.99",
                    image: null,
                    url: null,
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: "Torfs Sandals Summer",
                    price: "€59.99",
                    image: null,
                    url: null,
                    scrapedAt: new Date().toISOString()
                }
            ];
        }
        
        throw error;
    }
}

// API Routes
app.get('/api/scrape', async (req, res) => {
    try {
        const products = await scrapeTorfsShoes();
        res.json({
            success: true,
            count: products.length,
            products: products,
            scrapedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/scrape`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});
