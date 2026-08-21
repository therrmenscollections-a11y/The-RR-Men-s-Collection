// Storefront Application Logic

// 1. Initial State
let products = [];
let cart = [];
let activeFilters = {
  category: "All",
  size: "All",
  search: ""
};

// Seed products for Demo Mode
const SEED_PRODUCTS = [
  {
    id: "demo-1",
    name: "Classic White Tee",
    description: "A comfortable, standard-fit t-shirt made of 100% organic cotton. Perfect for everyday wear.",
    price: 19.99,
    sizes: ["S", "M", "L", "XL"],
    category: "T-Shirts",
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "demo-2",
    name: "Vintage Denim Jacket",
    description: "Classic button-up denim jacket with two chest pockets and adjustable button tabs. Vintage wash finish.",
    price: 59.99,
    sizes: ["M", "L", "XL"],
    category: "Jackets",
    image_url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "demo-3",
    name: "Cozy Hooded Sweatshirt",
    description: "Premium heavyweight fleece hoodie with a drawstring hood and spacious kangaroo pocket.",
    price: 39.99,
    sizes: ["S", "M", "L"],
    category: "Hoodies",
    image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600"
  }
];

// Initialize Supabase if not in demo mode
const supabaseClient = getSupabaseClient();

// Geolocation & Delivery State Variables
let userLatitude = null;
let userLongitude = null;
let deliveryDistance = null;
let deliveryCharge = 0;

// 2. DOM Elements
const demoBanner = document.getElementById("demo-banner");
const closeDemoBanner = document.getElementById("close-demo-banner");
const productGrid = document.getElementById("product-grid");
const categoryFiltersContainer = document.getElementById("category-filters-container");
const sizeFilterSelect = document.getElementById("size-filter-select");
const searchInput = document.getElementById("search-input");
const cartToggleBtn = document.getElementById("cart-toggle-btn");
const cartDrawer = document.getElementById("cart-drawer");
const cartCloseBtn = document.getElementById("cart-close-btn");
const cartItemsContainer = document.getElementById("cart-items-container");
const cartDrawerCount = document.getElementById("cart-drawer-count");
const cartSubtotal = document.getElementById("cart-subtotal");
const cartDelivery = document.getElementById("cart-delivery");
const cartTotal = document.getElementById("cart-total");
const cartCountBadge = document.querySelector(".cart-count");
const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");
const clearCartBtn = document.getElementById("clear-cart-btn");
const productModal = document.getElementById("product-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalBodyContent = document.getElementById("modal-body-content");
const toastContainer = document.getElementById("toast-container");

// Delivery Location Elements
const getLocationBtn = document.getElementById("get-location-btn");
const resetLocationBtn = document.getElementById("reset-location-btn");
const locationDetailsContainer = document.getElementById("location-details-container");
const deliveryDistanceText = document.getElementById("delivery-distance");
const deliveryInfoText = document.getElementById("delivery-info-text");

// Function to apply configuration settings to the DOM
function applyConfigToDOM() {
  document.title = `${CONFIG.STORE_NAME} | Premium Apparel`;
  document.getElementById("store-title-nav").textContent = CONFIG.STORE_NAME;
  document.getElementById("store-title-footer").textContent = CONFIG.STORE_NAME;
  document.getElementById("store-title-copy").textContent = CONFIG.STORE_NAME;

  // Update shop contact details
  document.getElementById("contact-address").textContent = CONFIG.SHOP_ADDRESS;
  document.getElementById("contact-phone").innerHTML = `<a href="tel:${CONFIG.CONTACT_PHONE}" class="contact-link">${CONFIG.CONTACT_PHONE}</a>`;
  document.getElementById("contact-email").innerHTML = `<a href="mailto:${CONFIG.CONTACT_EMAIL}" class="contact-link">${CONFIG.CONTACT_EMAIL}</a>`;
  
  // Render Hours List dynamically
  const hoursList = document.getElementById("contact-hours-list");
  if (hoursList) {
    hoursList.innerHTML = `
      <li><span>Monday - Sunday:</span> <strong>${CONFIG.SHOP_HOURS}</strong></li>
    `;
  }
}

// 3. Application Lifecycle
document.addEventListener("DOMContentLoaded", async () => {
  // Load environment variables from .env file first
  await loadEnvVariables();

  // Show banner if running in Demo Mode
  if (isDemoMode) {
    demoBanner.classList.remove("hidden");
  }

  // Sync settings from database/localStorage overrides
  await syncConfigWithDatabase();

  // Load configuration options
  setupFilters();

  // Load products & Cart
  loadProducts();
  loadCartFromLocalStorage();
  loadLocationFromSession();

  // Apply configs to storefront DOM
  applyConfigToDOM();

  // Register Events
  registerEventHandlers();
});

// 4. Setup Categories & Sizes Options
function setupFilters() {
  // Categories
  categoryFiltersContainer.innerHTML = CONFIG.CATEGORIES.map(category => `
    <button class="filter-btn ${category === 'All' ? 'active' : ''}" data-category="${category}">
      ${category}
    </button>
  `).join('');

  // Sizes dropdown
  CONFIG.AVAILABLE_SIZES.forEach(size => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    sizeFilterSelect.appendChild(option);
  });
}

// 5. Load Products from Database / LocalStorage
async function loadProducts() {
  try {
    showSpinner();
    if (isDemoMode) {
      // LocalStorage Database simulation for Demo Mode
      const stored = localStorage.getItem("demo_products");
      if (stored) {
        products = JSON.parse(stored);
      } else {
        products = [...SEED_PRODUCTS];
        localStorage.setItem("demo_products", JSON.stringify(products));
      }
    } else {
      // Fetch from Supabase
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      products = data || [];
    }

    renderProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    showToast("Error loading products. Check your connection or settings.", "error");
    productGrid.innerHTML = `<div class="error-msg">⚠️ Failed to load clothes. Please try again.</div>`;
  }
}

// 6. Filtering & Rendering Storefront Products
function renderProducts() {
  const filtered = products.filter(product => {
    const matchesCategory = activeFilters.category === "All" || product.category === activeFilters.category;
    const matchesSize = activeFilters.size === "All" || product.sizes.includes(activeFilters.size);
    const matchesSearch = product.name.toLowerCase().includes(activeFilters.search.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(activeFilters.search.toLowerCase()));
    return matchesCategory && matchesSize && matchesSearch;
  });

  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-shirt"></i>
        <p>No products found matching your criteria.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = filtered.map(product => {
    const formattedPrice = formatPrice(product.price);
    const sizeBadges = product.sizes.map(s => `<span class="size-badge-sm">${s}</span>`).join('');
    
    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-card-image-wrap">
          <img src="${product.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'}" 
               alt="${product.name}" 
               class="product-card-image" 
               loading="lazy">
          <button class="quick-view-hover-btn"><i class="fa-solid fa-eye"></i> Quick View</button>
        </div>
        <div class="product-card-details">
          <span class="product-card-category">${product.category}</span>
          <h3 class="product-card-title">${product.name}</h3>
          <div class="product-card-sizes">${sizeBadges}</div>
          <div class="product-card-footer">
            <span class="product-card-price">${formattedPrice}</span>
            <button class="btn-icon-add" aria-label="Quick add to cart"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach dynamic event listeners to newly rendered items
  document.querySelectorAll(".product-card").forEach(card => {
    const id = card.getAttribute("data-id");
    
    // Quick View (clicking image, card body or details)
    card.addEventListener("click", (e) => {
      // If add button was clicked, don't open modal
      if (e.target.closest(".btn-icon-add")) {
        e.stopPropagation();
        quickAdd(id);
      } else {
        openQuickView(id);
      }
    });
  });
}

function showSpinner() {
  productGrid.innerHTML = `
    <div class="spinner-container">
      <div class="spinner"></div>
    </div>
  `;
}

// 7. Cart State Operations
function loadCartFromLocalStorage() {
  const savedCart = localStorage.getItem("cart");
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
      updateCartUI();
    } catch (e) {
      cart = [];
    }
  }
}

function saveCartToLocalStorage() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function quickAdd(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Since we didn't specify a size via quick add, default to first available size
  const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : "Free Size";
  addToCart(product, defaultSize);
}

function addToCart(product, size, qty = 1) {
  const existingItemIndex = cart.findIndex(item => item.product_id === product.id && item.size === size);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += qty;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image_url: product.image_url,
      size: size,
      quantity: qty
    });
  }

  saveCartToLocalStorage();
  showToast(`Added ${product.name} (${size}) to bag!`, "success");
}

function updateCartQty(productId, size, change) {
  const itemIndex = cart.findIndex(item => item.product_id === productId && item.size === size);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += change;

  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCartToLocalStorage();
}

function removeFromCart(productId, size) {
  const itemIndex = cart.findIndex(item => item.product_id === productId && item.size === size);
  if (itemIndex > -1) {
    const itemName = cart[itemIndex].name;
    cart.splice(itemIndex, 1);
    saveCartToLocalStorage();
    showToast(`Removed ${itemName} from bag.`, "info");
  }
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm("Are you sure you want to clear your shopping bag?")) {
    cart = [];
    saveCartToLocalStorage();
    showToast("Shopping bag cleared.", "info");
  }
}

// 8. Update Cart UI Panel
function updateCartUI() {
  // Update badges
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalItems;
  cartDrawerCount.textContent = totalItems;

  if (totalItems > 0) {
    cartCountBadge.classList.add("pulse");
    setTimeout(() => cartCountBadge.classList.remove("pulse"), 500);
  }

  // Render items
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-bag-shopping"></i>
        <p>Your shopping bag is empty.</p>
        <button class="btn-primary" onclick="toggleCartDrawer()">Continue Shopping</button>
      </div>
    `;
    cartSubtotal.textContent = formatPrice(0);
    whatsappCheckoutBtn.disabled = true;
    clearCartBtn.style.display = "none";
    return;
  }

  clearCartBtn.style.display = "flex";
  whatsappCheckoutBtn.disabled = false;

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-meta">Size: <strong>${item.size}</strong></p>
        <p class="cart-item-price">${formatPrice(item.price)}</p>
        
        <div class="cart-item-qty-actions">
          <div class="qty-adjuster">
            <button class="qty-btn minus" data-id="${item.product_id}" data-size="${item.size}"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.product_id}" data-size="${item.size}"><i class="fa-solid fa-plus"></i></button>
          </div>
          <button class="cart-item-remove" data-id="${item.product_id}" data-size="${item.size}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');

  // Recalculate Subtotal, Delivery and Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartSubtotal.textContent = formatPrice(subtotal);

  // Check free delivery threshold
  const isFreeDelivery = subtotal >= CONFIG.FREE_DELIVERY_MIN_ORDER;

  if (subtotal === 0) {
    cartDelivery.textContent = "--";
    cartTotal.textContent = formatPrice(0);
    deliveryInfoText.textContent = `Orders above ${formatPrice(CONFIG.FREE_DELIVERY_MIN_ORDER)} qualify for free delivery!`;
  } else {
    if (isFreeDelivery) {
      deliveryCharge = 0;
      cartDelivery.innerHTML = `<span style="color: var(--whatsapp-green); font-weight: 600;">FREE</span>`;
      cartTotal.textContent = formatPrice(subtotal);
      deliveryInfoText.innerHTML = `🎉 Congrats! You qualify for <strong>Free Delivery</strong>!`;
    } else {
      if (deliveryDistance !== null) {
        deliveryCharge = getCalculatedDeliveryFee(subtotal, deliveryDistance);
        cartDelivery.textContent = formatPrice(deliveryCharge);
        cartTotal.textContent = formatPrice(subtotal + deliveryCharge);
        deliveryInfoText.innerHTML = `Add <strong>${formatPrice(CONFIG.FREE_DELIVERY_MIN_ORDER - subtotal)}</strong> more to get <strong>Free Delivery</strong>!`;
      } else {
        deliveryCharge = 0;
        cartDelivery.textContent = "--";
        cartTotal.textContent = formatPrice(subtotal);
        deliveryInfoText.innerHTML = `Pin location to see delivery fee. Add <strong>${formatPrice(CONFIG.FREE_DELIVERY_MIN_ORDER - subtotal)}</strong> for <strong>Free Delivery</strong>!`;
      }
    }
  }

  // Cart Adjuster event listeners
  document.querySelectorAll(".qty-btn.plus").forEach(btn => {
    btn.addEventListener("click", () => {
      updateCartQty(btn.getAttribute("data-id"), btn.getAttribute("data-size"), 1);
    });
  });

  document.querySelectorAll(".qty-btn.minus").forEach(btn => {
    btn.addEventListener("click", () => {
      updateCartQty(btn.getAttribute("data-id"), btn.getAttribute("data-size"), -1);
    });
  });

  document.querySelectorAll(".cart-item-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.getAttribute("data-id"), btn.getAttribute("data-size"));
    });
  });
}

// 9. Quick View Detail Modal
function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const formattedPrice = formatPrice(product.price);
  
  // Create size buttons (pre-select first one)
  const sizeButtonsHTML = product.sizes.map((s, index) => `
    <button class="size-select-btn ${index === 0 ? 'selected' : ''}" data-size="${s}">${s}</button>
  `).join('');

  modalBodyContent.innerHTML = `
    <div class="modal-product-layout">
      <div class="modal-product-image-container">
        <img src="${product.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'}" alt="${product.name}">
      </div>
      <div class="modal-product-info">
        <span class="modal-category">${product.category}</span>
        <h2 class="modal-title">${product.name}</h2>
        <span class="modal-price">${formattedPrice}</span>
        
        <p class="modal-description">${product.description || 'No description available for this item.'}</p>
        
        <div class="modal-sizes-selection">
          <span class="selection-label">Select Size:</span>
          <div class="size-selector-row">
            ${sizeButtonsHTML}
          </div>
        </div>

        <div class="modal-quantity-row">
          <span class="selection-label">Quantity:</span>
          <div class="qty-adjuster">
            <button id="modal-qty-minus" class="qty-btn"><i class="fa-solid fa-minus"></i></button>
            <span id="modal-qty-val" class="qty-value">1</span>
            <button id="modal-qty-plus" class="qty-btn"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>

        <button id="modal-add-to-cart-btn" class="btn-checkout" style="margin-top: 20px;">
          <i class="fa-solid fa-bag-shopping"></i> Add to Bag
        </button>
      </div>
    </div>
  `;

  // Attach modal quantity listeners
  const minusBtn = document.getElementById("modal-qty-minus");
  const plusBtn = document.getElementById("modal-qty-plus");
  const qtyVal = document.getElementById("modal-qty-val");
  
  let currentQty = 1;

  minusBtn.addEventListener("click", () => {
    if (currentQty > 1) {
      currentQty--;
      qtyVal.textContent = currentQty;
    }
  });

  plusBtn.addEventListener("click", () => {
    currentQty++;
    qtyVal.textContent = currentQty;
  });

  // Attach size selection listener
  const sizeBtns = document.querySelectorAll(".size-select-btn");
  let selectedSize = product.sizes[0] || "Free Size";

  sizeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      sizeBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedSize = btn.getAttribute("data-size");
    });
  });

  // Add to cart from modal
  const addBtn = document.getElementById("modal-add-to-cart-btn");
  addBtn.addEventListener("click", () => {
    addToCart(product, selectedSize, currentQty);
    closeQuickView();
  });

  // Show Modal
  productModal.classList.add("active");
  document.body.style.overflow = "hidden"; // Disable background scrolling
}

function closeQuickView() {
  productModal.classList.remove("active");
  document.body.style.overflow = ""; // Re-enable background scrolling
}

// 10. WhatsApp Checkout Integration
function handleCheckout() {
  if (cart.length === 0) return;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isFreeDelivery = subtotal >= CONFIG.FREE_DELIVERY_MIN_ORDER;
  let finalDeliveryCharge = 0;
  
  if (deliveryDistance !== null && !isFreeDelivery) {
    finalDeliveryCharge = getCalculatedDeliveryFee(subtotal, deliveryDistance);
  }

  const finalTotal = subtotal + finalDeliveryCharge;
  
  // Format message text
  let message = `*NEW ORDER - ${CONFIG.STORE_NAME}*\n`;
  message += `=============================\n\n`;
  
  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.name}*\n`;
    message += `   Size: _${item.size}_\n`;
    message += `   Qty: ${item.quantity} x ${formatPrice(item.price)}\n`;
    message += `   Subtotal: *${formatPrice(item.price * item.quantity)}*\n\n`;
  });

  message += `=============================\n`;
  message += `*Subtotal:* ${formatPrice(subtotal)}\n`;
  
  if (deliveryDistance !== null) {
    message += `*Delivery Distance:* ${deliveryDistance.toFixed(1)} km\n`;
    if (isFreeDelivery) {
      message += `*Delivery Charge:* _FREE_ (Promo)\n`;
    } else {
      message += `*Delivery Charge:* ${formatPrice(finalDeliveryCharge)}\n`;
    }
    message += `*GPS Location Link:* https://www.google.com/maps?q=${userLatitude},${userLongitude}\n`;
  } else {
    message += `*Delivery Charge:* _To be confirmed_ (Location not pinned)\n`;
  }
  
  message += `*Total Order Value:* *${formatPrice(finalTotal)}*\n\n`;
  message += `Please confirm availability and dispatch details. Thank you!`;

  // Encode message for URL
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedText}`;

  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');
}

// 11. Custom Toast Notification
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  
  let iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-xmark";
  else if (type === "info") iconClass = "fa-circle-info";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger animations
  setTimeout(() => toast.classList.add("active"), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Helper: Format Price
function formatPrice(number) {
  return `${CONFIG.STORE_CURRENCY}${parseFloat(number).toFixed(2)}`;
}

// 12. UI Event Handlers
function registerEventHandlers() {
  // Drawer open/close
  cartToggleBtn.addEventListener("click", toggleCartDrawer);
  cartCloseBtn.addEventListener("click", toggleCartDrawer);
  
  // Close drawer on overlay click
  cartDrawer.addEventListener("click", (e) => {
    if (e.target === cartDrawer) toggleCartDrawer();
  });

  // Modal close
  modalCloseBtn.addEventListener("click", closeQuickView);
  productModal.addEventListener("click", (e) => {
    if (e.target === productModal) closeQuickView();
  });

  // Esc key handlers
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuickView();
      cartDrawer.classList.remove("active");
    }
  });

  // Category filter buttons
  categoryFiltersContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    activeFilters.category = btn.getAttribute("data-category");
    renderProducts();
  });

  // Size filter selector
  sizeFilterSelect.addEventListener("change", (e) => {
    activeFilters.size = e.target.value;
    renderProducts();
  });

  // Search Input (Instant filter)
  searchInput.addEventListener("input", (e) => {
    activeFilters.search = e.target.value;
    renderProducts();
  });

  // Checkout & Clear bag
  whatsappCheckoutBtn.addEventListener("click", handleCheckout);
  clearCartBtn.addEventListener("click", clearCart);

  // Geolocation Actions
  getLocationBtn.addEventListener("click", getUserLocation);
  resetLocationBtn.addEventListener("click", resetUserLocation);

  // Close demo banner
  closeDemoBanner.addEventListener("click", () => {
    demoBanner.classList.add("hidden");
  });
}

function toggleCartDrawer() {
  cartDrawer.classList.toggle("active");
}

// 13. Geolocation Helpers
function getUserLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.", "error");
    return;
  }

  getLocationBtn.disabled = true;
  getLocationBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Getting your location...`;

  navigator.geolocation.getCurrentPosition(
    // Success Callback
    (position) => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;
      
      // Calculate distance using Haversine formula
      deliveryDistance = calculateDistance(
        CONFIG.SHOP_LATITUDE,
        CONFIG.SHOP_LONGITUDE,
        userLatitude,
        userLongitude
      );

      // Save location session so it persists during the browser tab session
      sessionStorage.setItem("delivery_lat", userLatitude);
      sessionStorage.setItem("delivery_lng", userLongitude);
      sessionStorage.setItem("delivery_dist", deliveryDistance);

      applyLocationPinnedUI();
      updateCartUI();
      showToast("Location pinned! Delivery charges updated.", "success");
    },
    // Error Callback
    (error) => {
      console.warn("Geolocation error:", error);
      let errorMsg = "Could not get your location.";
      if (error.code === 1) errorMsg = "Location permission denied by user.";
      else if (error.code === 2) errorMsg = "Position unavailable (check GPS settings).";
      else if (error.code === 3) errorMsg = "Location request timeout.";
      
      showToast(errorMsg, "error");
      
      // Reset button UI
      getLocationBtn.disabled = false;
      getLocationBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Pin Delivery Location & Calculate Charge`;
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function resetUserLocation() {
  userLatitude = null;
  userLongitude = null;
  deliveryDistance = null;
  deliveryCharge = 0;

  sessionStorage.removeItem("delivery_lat");
  sessionStorage.removeItem("delivery_lng");
  sessionStorage.removeItem("delivery_dist");

  // Toggle UI elements
  getLocationBtn.classList.remove("hidden");
  getLocationBtn.disabled = false;
  getLocationBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Pin Delivery Location & Calculate Charge`;
  locationDetailsContainer.classList.add("hidden");

  updateCartUI();
  showToast("Location details cleared.", "info");
}

function loadLocationFromSession() {
  const lat = sessionStorage.getItem("delivery_lat");
  const lng = sessionStorage.getItem("delivery_lng");
  const dist = sessionStorage.getItem("delivery_dist");

  if (lat && lng && dist) {
    userLatitude = parseFloat(lat);
    userLongitude = parseFloat(lng);
    deliveryDistance = parseFloat(dist);
    applyLocationPinnedUI();
  }
}

function applyLocationPinnedUI() {
  getLocationBtn.classList.add("hidden");
  locationDetailsContainer.classList.remove("hidden");
  deliveryDistanceText.textContent = `${deliveryDistance.toFixed(1)} km`;
}

// Distance Calculation: Haversine Formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getCalculatedDeliveryFee(subtotal, distance) {
  if (subtotal >= CONFIG.FREE_DELIVERY_MIN_ORDER) return 0;
  if (distance <= CONFIG.BASE_DELIVERY_KM) return CONFIG.BASE_DELIVERY_CHARGE;
  
  const extraKm = Math.max(0, distance - CONFIG.BASE_DELIVERY_KM);
  return CONFIG.BASE_DELIVERY_CHARGE + (extraKm * CONFIG.DELIVERY_CHARGE_PER_KM);
}
