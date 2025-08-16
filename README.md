# Torfs Web Scraper

A powerful web scraping application built with Node.js that extracts shoe product data from the Torfs website. This project demonstrates advanced web scraping techniques with a clean, modern frontend interface.

## Features

- **Intelligent Scraping**: Multi-strategy approach to extract product data from Torfs shoes page
- **Advanced Data Extraction**: Automatically extracts product names, prices, images, and URLs
- **Smart Filtering**: Removes navigation items, categories, and non-product content
- **Price Cleaning**: Automatically removes promotional text and formats prices consistently
- **Image Handling**: Supports multiple image attributes and handles lazy-loaded images
- **Fallback Strategies**: Multiple scraping strategies ensure data extraction even with website changes
- **Modern UI**: Clean, responsive frontend with real-time status updates
- **Error Handling**: Graceful fallback to sample data when scraping fails
- **API Endpoints**: RESTful API for easy integration with other applications

## Technologies Used

- **Backend**: Node.js, Express.js
- **Web Scraping**: Axios, Cheerio
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **HTTP Handling**: CORS support, custom headers
- **Development**: Nodemon for auto-restart

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Internet connection to access Torfs website

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd Scraping
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

   Or use the provided batch file on Windows:
   ```bash
   install.bat
   ```

## Usage

### Starting the Application

1. Open a terminal in the project directory
2. Run `npm start`
3. Open your browser and navigate to `http://localhost:3000`

### Using the Web Interface

1. **Scrape Data**: Click the "Scrape" button to start extracting product data from Torfs
2. **View Results**: Products will be displayed in a responsive grid layout
3. **Clear Data**: Use the "Clear" button to remove displayed products
4. **Monitor Status**: Real-time status updates show scraping progress

### API Endpoints

- **GET `/`** - Main application page
- **GET `/api/scrape`** - Scrape Torfs shoes data
- **GET `/api/health`** - Health check endpoint

## Project Structure

```
Scraping/
├── server.js          # Main backend server and scraping logic
├── package.json       # Project dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML page
│   ├── styles.css     # CSS styling
│   └── script.js      # Frontend JavaScript
├── install.bat        # Windows installation script
└── README.md          # This file
```

## 🔧 Configuration

The scraping behavior can be customized by modifying the configuration in `server.js`:

```javascript
const CONFIG = {
    url: 'https://www.torfs.be/nl/schoenen',
    selectors: {
        price: ['span.value', 'span.value[itemprop="price"]', '[itemprop="price"]', '.price', '.product-price'],
        name: ['h1, h2, h3, h4, .name, .title', '[itemprop="name"]', 'a[href*="/product/"]'],
        image: ['.carousel-image', 'img.carousel-image', 'img[src]', 'img[data-src]', '.product-image img', '.thumbnail img'],
        product: ['.product-item', '.product-card', '.product', '[data-product]', '.item']
    },
    navigationTerms: ['home', 'menu', 'search', 'login', 'cart', 'category', 'collection', 'schoenen'],
    maxProducts: 50
};
```

## Scraping Strategies

The application uses multiple strategies to ensure reliable data extraction:

1. **Direct Price Structure**: Targets Torfs-specific HTML structure
2. **Schema.org Markup**: Looks for structured data markup
3. **Product Links**: Focuses on actual product URLs
4. **Content Analysis**: Analyzes text content for product information
5. **Keyword Search**: Searches for shoe-related terms with prices

## Data Extraction

### Product Information Extracted

- **Name**: Product title/name
- **Price**: Cleaned price without promotional text
- **Image**: Product image URL (handles lazy loading)
- **URL**: Product page link
- **ID**: Unique identifier
- **Timestamp**: When data was scraped

### Image Handling

Supports multiple image attributes:
- `src` (standard)
- `data-src` (lazy loading)
- `data-lazy` (alternative lazy loading)
- `data-original` (original image)
- Background images via CSS

## Important Notes

- **Rate Limiting**: The scraper includes delays and respectful headers to avoid overwhelming the target website
- **Legal Compliance**: This tool is for educational purposes. Always respect website terms of service and robots.txt
- **Website Changes**: E-commerce websites frequently update their HTML structure, which may require selector updates
- **Blocking**: Some websites may block automated requests. The application includes fallback sample data for such cases

## Troubleshooting

### Common Issues

1. **No products found**
   - Check internet connection
   - Verify Torfs website is accessible
   - Check browser console for error messages

2. **Images not loading**
   - Website may be blocking image requests
   - Check if image URLs are being extracted correctly
   - Verify CORS settings

3. **Server won't start**
   - Ensure Node.js is installed
   - Check if port 3000 is available
   - Verify all dependencies are installed

### Debug Mode

Enable detailed logging by checking the browser console and server terminal output. The application logs:
- Scraping progress
- Product extraction details
- Image URL processing
- Strategy success/failure

## 📝 API Response Format

```json
{
  "success": true,
  "count": 25,
  "products": [
    {
      "id": 1,
      "name": "Adidas Hoops 3.0 Mid",
      "price": "€89,99",
      "image": "https://example.com/image.jpg",
      "url": "https://www.torfs.be/nl/product/example",
      "scrapedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "scrapedAt": "2024-01-01T12:00:00.000Z"
}
```

## Security Considerations

- **User-Agent**: Uses realistic browser headers
- **Rate Limiting**: Built-in delays between requests
- **Error Handling**: Graceful failure without exposing internal errors
- **CORS**: Configured for development use

## References
- **Cheerio Documentation**: https://cheerio.js.org/docs/intro
- **Axios Documenation**: https://axios-http.com/docs/intro
- **Cheerio Web scraping video**: https://youtu.be/H8Sh9_n1MPA?si=gWx0aPH8Bl6HZS45
- **First try/step to webscrape using Chatgpt**: https://chatgpt.com/share/689f681e-845c-8004-a032-c48497790df6
- **Scraping website help using cursor**: [a relative link](cursor_scraping_data_from_the_torfs_web.md) 

## License
This project is for educational purposes. Please respect the terms of service of any websites you scrape.

## Disclaimer

This tool is designed for educational and research purposes. Users are responsible for:
- Complying with website terms of service
- Respecting robots.txt files
- Not overwhelming target servers
- Using data responsibly and legally

---
