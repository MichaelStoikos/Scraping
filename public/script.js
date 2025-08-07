document.addEventListener('DOMContentLoaded', function() {
    const scrapeBtn = document.getElementById('scrapeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const status = document.getElementById('status');
    const results = document.getElementById('results');
    const productsGrid = document.getElementById('productsGrid');
    const productCount = document.getElementById('productCount');
    const scrapeTime = document.getElementById('scrapeTime');
    const resultsHeader = document.querySelector('.results-header');

    // Scrape button functionality
    scrapeBtn.addEventListener('click', async function() {
        if (scrapeBtn.disabled) return;

        // Show loading state
        setLoadingState(true);
        showStatus('Scraping Torfs website...', 'info');

        try {
            const response = await fetch('/api/scrape');
            const data = await response.json();

            if (data.success) {
                displayResults(data);
                showStatus(`Successfully scraped ${data.count} products!`, 'success');
            } else {
                throw new Error(data.error || 'Failed to scrape data');
            }
        } catch (error) {
            console.error('Scraping error:', error);
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            setLoadingState(false);
        }
    });

    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        clearResults();
        showStatus('Results cleared', 'info');
    });

    function setLoadingState(loading) {
        const btnText = scrapeBtn.querySelector('.btn-text');
        const btnLoading = scrapeBtn.querySelector('.btn-loading');

        if (loading) {
            scrapeBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            scrapeBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 5000);
        }
    }

    function displayResults(data) {
        const products = data.products || [];
        
        if (products.length === 0) {
            showStatus('No products found on the website', 'info');
            return;
        }

        // Update results header
        productCount.textContent = products.length;
        scrapeTime.textContent = ` • Scraped at ${new Date(data.scrapedAt).toLocaleString()}`;
        resultsHeader.style.display = 'block';

        // Clear existing products
        productsGrid.innerHTML = '';

        // Display products
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });

        // Show results section
        results.style.display = 'block';
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';

        const imageHtml = product.image 
            ? `<img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='<div style=\'display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;\'>No image available</div>'">`
            : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">No image available</div>';

        const urlHtml = product.url 
            ? `<a href="${product.url}" target="_blank" class="product-url">View Product</a>`
            : '<span class="product-url" style="opacity: 0.5; cursor: not-allowed;">No link available</span>';

        card.innerHTML = `
            <div class="product-image">
                ${imageHtml}
            </div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}</div>
            ${urlHtml}
        `;

        return card;
    }

    function clearResults() {
        productsGrid.innerHTML = '';
        resultsHeader.style.display = 'none';
        results.style.display = 'none';
        status.style.display = 'none';
    }

    // Check if server is running on page load
    async function checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            if (data.status === 'OK') {
                console.log('Server is running');
            }
        } catch (error) {
            console.warn('Server health check failed:', error.message);
        }
    }

    // Initialize
    checkServerHealth();
});
