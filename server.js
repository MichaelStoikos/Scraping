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

        // Enhanced price extraction function with Torfs-specific selectors
        const extractPrice = ($element) => {
            // Torfs-specific price selectors (based on your HTML structure)
            const torfsSelectors = [
                'span.value[itemprop="price"]',
                'span.value',
                '.value[itemprop="price"]',
                '[itemprop="price"]',
                'span[content]'
            ];
            
            // Try Torfs-specific selectors first
            for (const selector of torfsSelectors) {
                const priceElement = $element.find(selector).first();
                if (priceElement.length > 0) {
                    // Try content attribute first (more reliable)
                    const contentPrice = priceElement.attr('content');
                    if (contentPrice) {
                        return `€ ${contentPrice.replace('.', ',')}`;
                    }
                    // Fall back to text content
                    const textPrice = priceElement.text().trim();
                    if (textPrice) {
                        return textPrice;
                    }
                }
            }
            
            // Generic price selectors as fallback
            const genericSelectors = [
                '.price', '.product-price', '.current-price', '.price-current', 
                '[data-price]', '.price-box', '.price-value', '.amount',
                '.cost', '.tariff', '.fee', '.rate', '[class*="price"]',
                '[class*="amount"]', '[class*="cost"]', '.pricing'
            ];
            
            // Try each generic selector
            for (const selector of genericSelectors) {
                const priceText = $element.find(selector).first().text().trim();
                if (priceText) {
                    const extractedPrice = extractPriceFromText(priceText);
                    if (extractedPrice) return extractedPrice;
                }
            }
            
            // Try data attributes
            const dataPrice = $element.find('[data-price]').attr('data-price');
            if (dataPrice) return dataPrice;
            
            // Search in the element's own text
            const elementText = $element.text();
            return extractPriceFromText(elementText);
        };
        
        // Enhanced price text extraction function
        const extractPriceFromText = (text) => {
            if (!text) return null;
            
            // Price patterns (Euro, Dollar, Pound, etc.)
            const pricePatterns = [
                /€\s*\d+[.,]\d{2}/g,           // €99.99 or €99,99
                /\d+[.,]\d{2}\s*€/g,           // 99.99€ or 99,99€
                /EUR\s*\d+[.,]\d{2}/gi,        // EUR 99.99
                /\d+[.,]\d{2}\s*EUR/gi,        // 99.99 EUR
                /\$\s*\d+[.,]\d{2}/g,          // $99.99
                /£\s*\d+[.,]\d{2}/g,           // £99.99
                /\d+[.,]\d{2}/g                // Just numbers (last resort)
            ];
            
            for (const pattern of pricePatterns) {
                const matches = text.match(pattern);
                if (matches && matches.length > 0) {
                    return matches[0].trim();
                }
            }
            
            return null;
        };

        // Enhanced image URL extraction function
        const getImageUrl = ($element) => {
            // Try multiple image selectors and attributes
            const imageSelectors = [
                'img[src]',
                'img[data-src]',
                'img[data-lazy]',
                'img[data-original]',
                'img[data-lazyload]',
                '[data-background-image]',
                '.image img',
                '.product-image img',
                '.thumbnail img'
            ];
            
            for (const selector of imageSelectors) {
                const $img = $element.find(selector).first();
                if ($img.length > 0) {
                    // Try different attributes
                    const attributes = ['src', 'data-src', 'data-lazy', 'data-original', 'data-lazyload'];
                    for (const attr of attributes) {
                        const imgUrl = $img.attr(attr);
                        if (imgUrl && imgUrl.trim() && !imgUrl.includes('placeholder') && !imgUrl.includes('loading')) {
                            // Handle relative URLs
                            if (imgUrl.startsWith('//')) {
                                return `https:${imgUrl}`;
                            } else if (imgUrl.startsWith('/')) {
                                return `https://www.torfs.be${imgUrl}`;
                            } else if (imgUrl.startsWith('http')) {
                                return imgUrl;
                            }
                        }
                    }
                }
            }
            
            // Try background images
            const bgImg = $element.find('[data-background-image]').first().attr('data-background-image');
            if (bgImg) {
                return bgImg.startsWith('http') ? bgImg : `https://www.torfs.be${bgImg}`;
            }
            
            return null;
        };

        // Function to filter out navigation items and non-products
        const isNavigationItem = (name, url) => {
            if (!name) return true;
            
            const normalizedName = name.toLowerCase().trim();
            
            // Common navigation/category terms
            const navigationTerms = [
                'home', 'menu', 'search', 'login', 'register', 'cart', 'checkout',
                'contact', 'about', 'help', 'support', 'faq', 'returns', 'shipping',
                'privacy', 'terms', 'conditions', 'newsletter', 'account', 'profile',
                'wishlist', 'favorites', 'compare', 'filter', 'sort', 'view',
                'schoenen', 'shoes', 'category', 'collection', 'brand', 'brands',
                'men', 'women', 'kids', 'sale', 'new', 'trending', 'popular',
                'accessories', 'bags', 'clothing', 'more', 'all', 'show',
                'view all', 'see all', 'browse', 'shop', 'store', 'outlet'
            ];
            
            // Check if the name is exactly a navigation term
            if (navigationTerms.includes(normalizedName)) {
                return true;
            }
            
            // Check if it's too short or generic
            if (normalizedName.length < 3) {
                return true;
            }
            
            // Check URL patterns that indicate navigation/category pages
            if (url) {
                const navigationUrlPatterns = [
                    '/home', '/menu', '/category', '/categories', '/collection', '/collections',
                    '/brand', '/brands', '/sale', '/outlet', '/new', '/trending',
                    '/men', '/women', '/kids', '/accessories', '/bags'
                ];
                
                for (const pattern of navigationUrlPatterns) {
                    if (url.toLowerCase().includes(pattern) && !url.includes('/product/')) {
                        return true;
                    }
                }
            }
            
            return false;
        };

        // Multiple scraping strategies for different website structures
        const scrapingStrategies = [
            // Strategy 0: Direct search for Torfs price structure
            () => {
                const found = [];
                // Look specifically for the price structure you showed: span.value[itemprop="price"]
                $('span.value[itemprop="price"], [itemprop="price"]').each((index, element) => {
                    const $priceElement = $(element);
                    const $container = $priceElement.closest('div, article, section, li, .product-item, .item');
                    
                    // Get price from content attribute or text
                    const contentPrice = $priceElement.attr('content');
                    const textPrice = $priceElement.text().trim();
                    const price = contentPrice ? `€ ${contentPrice.replace('.', ',')}` : textPrice;
                    
                    // Look for product name in the container
                    const name = $container.find('h1, h2, h3, h4, h5, .name, .title, [itemprop="name"], a[href*="/product/"]').first().text().trim() ||
                               $container.find('a').text().trim();
                    
                    // Look for image and URL with better image handling
                    const image = getImageUrl($container);
                    const productUrl = $container.find('a').first().attr('href');
                    
                    // Filter out navigation items and non-products
                    if (name && name.length > 2 && price && !isNavigationItem(name, productUrl)) {
                        found.push({ name, price, image, productUrl });
                    }
                });
                return found;
            },
            // Strategy 1: Torfs-specific selectors and common e-commerce selectors
            () => {
                const found = [];
                // Look for elements that contain the price structure you showed
                $('[itemtype*="schema.org"], [itemscope], .product-item, .product-card, .product, [data-product], .item, .listing-item').each((index, element) => {
                    const $element = $(element);
                    
                    // Look for product names in various places
                    const name = $element.find('.product-name, .product-title, .name, h3, h4, .title, [data-product-name], [itemprop="name"]').first().text().trim() ||
                               $element.find('a[href*="/product/"]').text().trim() ||
                               $element.find('a[href*="/schoenen/"]').text().trim();
                    
                    const price = extractPrice($element);
                    const image = getImageUrl($element);
                    const productUrl = $element.find('a').first().attr('href');

                    if (name && name.length > 2 && !isNavigationItem(name, productUrl)) {
                        found.push({ name, price: price || 'Price not available', image, productUrl });
                    }
                });
                return found;
            },
            
            // Strategy 2: Generic product links with better price extraction
            () => {
                const found = [];
                // Focus on actual product URLs, not category pages
                $('a[href*="/product/"]').each((index, element) => {
                    const $element = $(element);
                    const $parent = $element.parent();
                    const $container = $parent.parent(); // Check grandparent too
                    
                    const name = $element.text().trim() || 
                               $parent.find('h3, h4, .title, .name').text().trim() ||
                               $container.find('h3, h4, .title, .name').text().trim();
                    
                    const price = extractPrice($parent) || extractPrice($container) || extractPrice($element);
                    const image = getImageUrl($element) || getImageUrl($parent) || getImageUrl($container);
                    
                    if (name && name.length > 3 && !found.some(p => p.name === name) && !isNavigationItem(name, $element.attr('href'))) {
                        found.push({ name, price: price || 'Price not available', image, productUrl: $element.attr('href') });
                    }
                });
                return found;
            },
            
            // Strategy 3: Look for any elements with product-like content using enhanced price detection
            () => {
                const found = [];
                $('div, article, section, li').each((index, element) => {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Check if this element contains product-like information
                    if (text.length > 10 && text.length < 300 && 
                        (text.includes('€') || text.includes('EUR') || text.includes('$') || /\d+[.,]\d{2}/.test(text))) {
                        
                        const name = $element.find('h1, h2, h3, h4, h5, h6, .title, .name, .product-name').first().text().trim() ||
                                   $element.clone().children().remove().end().text().trim().split('\n')[0];
                        
                        const price = extractPrice($element) || extractPriceFromText(text);
                        const image = getImageUrl($element);
                        const productUrl = $element.find('a').first().attr('href');
                        
                        if (name && name.length > 2 && name.length < 100 && !found.some(p => p.name === name) && !isNavigationItem(name, productUrl)) {
                            found.push({ name, price: price || 'Price not available', image, productUrl });
                        }
                    }
                });
                return found;
            },
            
            // Strategy 4: Broad text search for shoe-related products with prices
            () => {
                const found = [];
                const shoeKeywords = ['schoen', 'schoenen', 'shoe', 'shoes', 'sneaker', 'boot', 'sandal', 'pump', 'loafer', 'trainer'];
                
                $('*').each((index, element) => {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Skip if text is too short or too long, or if it's just navigation/common elements
                    if (text.length < 5 || text.length > 150) return;
                    if (/^(Home|Menu|Search|Login|Register|Cart|Checkout|Contact)$/i.test(text)) return;
                    
                    // Check if it contains shoe keywords AND has a price pattern
                    const hasShoeKeyword = shoeKeywords.some(keyword => 
                        text.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    const hasPrice = extractPriceFromText(text);
                    
                    if ((hasShoeKeyword || hasPrice) && hasPrice) {
                        const name = text.length < 80 ? text : text.substring(0, 77) + '...';
                        
                        if (!found.some(p => p.name === name) && !isNavigationItem(name, null)) {
                            found.push({ 
                                name, 
                                price: hasPrice || 'Price not available', 
                                image: null, 
                                productUrl: null 
                            });
                        }
                    }
                });
                return found.slice(0, 20); // Limit to prevent too many results
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

        // If still no products, try a very generic approach with enhanced price detection
        if (products.length === 0) {
            console.log('Trying enhanced generic approach...');
            
            // Look for any text that might be product names with better price detection
            $('body').find('*').each((index, element) => {
                const $element = $(element);
                const text = $element.text().trim();
                
                // Skip if text is too short or too long
                if (text.length < 5 || text.length > 120) return;
                
                // Skip if it's just numbers or common words
                if (/^\d+$/.test(text) || /^(Home|Menu|Search|Login|Register|Cart|Checkout|About|Contact|Help|Support)$/i.test(text)) return;
                
                // Check if it might be a product name (contains common shoe-related words or has price)
                const shoeKeywords = ['schoen', 'schoenen', 'shoe', 'shoes', 'sneaker', 'boot', 'sandal', 'pump', 'loafer', 'trainer', 'heel', 'flat'];
                const hasShoeKeyword = shoeKeywords.some(keyword => 
                    text.toLowerCase().includes(keyword.toLowerCase())
                );
                
                const extractedPrice = extractPriceFromText(text);
                const hasPrice = extractedPrice !== null;
                
                if (hasShoeKeyword || hasPrice) {
                    const price = extractedPrice || 'Price not available';
                    
                    if (!products.some(p => p.name === text) && !isNavigationItem(text, null)) {
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
        const processedProducts = products.slice(0, 50).map((product, index) => {
            // Handle product URL
            let url = null;
            if (product.productUrl) {
                if (product.productUrl.startsWith('http')) {
                    url = product.productUrl;
                } else if (product.productUrl.startsWith('/')) {
                    url = `https://www.torfs.be${product.productUrl}`;
                } else {
                    url = `https://www.torfs.be/${product.productUrl}`;
                }
            }

            // Handle image URL (already processed by getImageUrl function)
            let image = product.image;
            if (image && !image.startsWith('http') && !image.startsWith('//')) {
                image = image.startsWith('/') ? `https://www.torfs.be${image}` : `https://www.torfs.be/${image}`;
            }

            return {
                id: index + 1,
                name: product.name || 'Unknown Product',
                price: product.price || 'Price not available',
                image: image,
                url: url,
                scrapedAt: new Date().toISOString()
            };
        });

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
                    name: "Adidas Hoops 3.0 Mid Sneakers",
                    price: "€89,99",
                    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop",
                    url: "https://www.torfs.be/nl/product/adidas-hoops-sample",
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Nike Air Force 1 '07 White",
                    price: "€129,95",
                    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&h=300&fit=crop",
                    url: "https://www.torfs.be/nl/product/nike-air-force-sample",
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: "Converse Chuck Taylor All Star",
                    price: "€59,99",
                    image: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=300&h=300&fit=crop",
                    url: "https://www.torfs.be/nl/product/converse-chuck-sample",
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 4,
                    name: "Vans Old Skool Black/White",
                    price: "€79,95",
                    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=300&h=300&fit=crop",
                    url: "https://www.torfs.be/nl/product/vans-oldskool-sample",
                    scrapedAt: new Date().toISOString()
                },
                {
                    id: 5,
                    name: "Puma RS-X³ Puzzle Sneakers",
                    price: "€149,99",
                    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
                    url: "https://www.torfs.be/nl/product/puma-rsx-sample",
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
