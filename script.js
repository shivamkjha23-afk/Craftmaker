// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    WHATSAPP_NUMBER: '8864092866', // Change this to your WhatsApp number (with country code, no + or spaces)
    CURRENCY_SYMBOL: '₹',
    EXCEL_FILE_PATH: 'products.xlsx',
    IMAGE_FALLBACK: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
};

// ============================================
// GLOBAL STATE
// ============================================
let products = [];
let cart = [];

// ============================================
// EXCEL FILE LOADING
// ============================================
function loadExcelFile() {
    const loadingScreen = document.getElementById('loadingScreen');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Show loading screen
    loadingScreen.style.display = 'flex';

    // Create file input for Excel upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Try to fetch the Excel file
    fetch(CONFIG.EXCEL_FILE_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error('Excel file not found. Please select the file manually.');
            }
            return response.arrayBuffer();
        })
        .then(data => {
            parseExcelData(data);
        })
        .catch(error => {
            // If file not found, prompt user to upload
            loadingScreen.style.display = 'none';
            errorText.textContent = error.message + ' Click below to upload your products.xlsx file.';
            errorMessage.style.display = 'flex';
            
            // Add upload button
            const uploadBtn = document.createElement('button');
            uploadBtn.textContent = 'Upload Excel File';
            uploadBtn.onclick = () => fileInput.click();
            document.querySelector('.error-content').appendChild(uploadBtn);

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        errorMessage.style.display = 'none';
                        loadingScreen.style.display = 'flex';
                        parseExcelData(e.target.result);
                    };
                    reader.readAsArrayBuffer(file);
                }
            };
        });
}

// ============================================
// EXCEL DATA PARSING
// ============================================
function parseExcelData(data) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Transform Excel data to product objects
        products = jsonData.map((row, index) => {
            // Calculate discount amount
            let discountAmount = 0;
            const discount = row['Discount'] || row['discount'] || 0;
            const price = parseFloat(row['Price'] || row['price'] || 0);
            
            // Check if discount is percentage or flat amount
            if (typeof discount === 'string' && discount.includes('%')) {
                const percentage = parseFloat(discount.replace('%', ''));
                discountAmount = (price * percentage) / 100;
            } else {
                discountAmount = parseFloat(discount);
            }

            const finalPrice = price - discountAmount;

            return {
                id: index + 1,
                name: row['Item Name'] || row['item name'] || row['name'] || 'Unnamed Product',
                description: row['Description'] || row['description'] || 'No description available',
                price: price,
                discount: discount,
                discountAmount: discountAmount,
                finalPrice: finalPrice,
                deliveryTime: row['Estimated Delivery Time'] || row['delivery time'] || 'Not specified',
                image: row['Product Image Path'] || row['image'] || CONFIG.IMAGE_FALLBACK
            };
        });

        // Hide loading screen
        document.getElementById('loadingScreen').style.display = 'none';

        // Render products
        renderProducts();
        
    } catch (error) {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('errorText').textContent = 'Error parsing Excel file: ' + error.message;
        document.getElementById('errorMessage').style.display = 'flex';
    }
}

// ============================================
// RENDER PRODUCTS
// ============================================
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Format discount display
    let discountDisplay = '';
    if (product.discountAmount > 0) {
        if (typeof product.discount === 'string' && product.discount.includes('%')) {
            discountDisplay = product.discount;
        } else {
            discountDisplay = `${CONFIG.CURRENCY_SYMBOL}${product.discountAmount.toFixed(0)} OFF`;
        }
    }

    card.innerHTML = `
        <img src="${product.image}" 
             alt="${product.name}" 
             class="product-image"
             onerror="this.src='${CONFIG.IMAGE_FALLBACK}'">
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-pricing">
                <div class="price-row">
                    ${product.discountAmount > 0 ? `<span class="original-price">${CONFIG.CURRENCY_SYMBOL}${product.price.toFixed(2)}</span>` : ''}
                    ${product.discountAmount > 0 ? `<span class="discount-badge">${discountDisplay}</span>` : ''}
                </div>
                <div class="final-price">${CONFIG.CURRENCY_SYMBOL}${product.finalPrice.toFixed(2)}</div>
            </div>
            <div class="delivery-time">
                <span>🚚</span>
                <span>Delivery: ${product.deliveryTime}</span>
            </div>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                Add to Cart
            </button>
        </div>
    `;

    return card;
}

// ============================================
// CART FUNCTIONALITY
// ============================================
function initCart() {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartUI();
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFooter = document.getElementById('cartFooter');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartDiscount = document.getElementById('cartDiscount');
    const cartTotal = document.getElementById('cartTotal');

    // Update cart count badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Show/hide empty state
    if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartFooter.style.display = 'none';
        cartItems.innerHTML = '';
        return;
    }

    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';

    // Render cart items
    cartItems.innerHTML = '';
    cart.forEach(item => {
        const cartItem = createCartItem(item);
        cartItems.appendChild(cartItem);
    });

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);
    const total = subtotal - totalDiscount;

    cartSubtotal.textContent = `${CONFIG.CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;
    cartDiscount.textContent = `-${CONFIG.CURRENCY_SYMBOL}${totalDiscount.toFixed(2)}`;
    cartTotal.textContent = `${CONFIG.CURRENCY_SYMBOL}${total.toFixed(2)}`;
}

function createCartItem(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';

    div.innerHTML = `
        <img src="${item.image}" 
             alt="${item.name}" 
             class="cart-item-image"
             onerror="this.src='${CONFIG.IMAGE_FALLBACK}'">
        <div class="cart-item-details">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${CONFIG.CURRENCY_SYMBOL}${item.finalPrice.toFixed(2)}</div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${item.id})">🗑️</button>
    `;

    return div;
}

// ============================================
// CART DRAWER CONTROLS
// ============================================
function openCart() {
    document.getElementById('cartDrawer').classList.add('active');
}

function closeCart() {
    document.getElementById('cartDrawer').classList.remove('active');
}

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

// ============================================
// WHATSAPP ORDER
// ============================================
function generateOrderMessage() {
    if (cart.length === 0) return '';

    let message = '*NEW ORDER*\n\n';
    message += '📦 *ORDER DETAILS*\n';
    message += '━━━━━━━━━━━━━━━━\n\n';

    cart.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n`;
        message += `   Qty: ${item.quantity}\n`;
        message += `   Price: ${CONFIG.CURRENCY_SYMBOL}${item.finalPrice.toFixed(2)} each\n`;
        message += `   Subtotal: ${CONFIG.CURRENCY_SYMBOL}${(item.finalPrice * item.quantity).toFixed(2)}\n`;
        if (item.discountAmount > 0) {
            message += `   Discount: -${CONFIG.CURRENCY_SYMBOL}${(item.discountAmount * item.quantity).toFixed(2)}\n`;
        }
        message += '\n';
    });

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);
    const total = subtotal - totalDiscount;

    message += '━━━━━━━━━━━━━━━━\n';
    message += `*Subtotal:* ${CONFIG.CURRENCY_SYMBOL}${subtotal.toFixed(2)}\n`;
    message += `*Total Discount:* -${CONFIG.CURRENCY_SYMBOL}${totalDiscount.toFixed(2)}\n`;
    message += `*TOTAL AMOUNT:* ${CONFIG.CURRENCY_SYMBOL}${total.toFixed(2)}\n`;

    return message;
}

function placeOrderOnWhatsApp() {
    const message = generateOrderMessage();
    if (!message) {
        alert('Your cart is empty!');
        return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

document.getElementById('whatsappBtn').addEventListener('click', placeOrderOnWhatsApp);

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initCart();
    loadExcelFile();
});