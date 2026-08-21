// Admin Panel Controller Logic

// 1. Initial State & Supabase check
const supabaseClient = getSupabaseClient();
let session = null;
let inventoryProducts = [];

// 2. DOM Elements
const demoBanner = document.getElementById("demo-banner");
const closeDemoBanner = document.getElementById("close-demo-banner");
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const btnLoginSubmit = document.getElementById("btn-login-submit");
const logoutBtn = document.getElementById("logout-btn");

const productForm = document.getElementById("product-form");
const productNameInput = document.getElementById("product-name");
const productPriceInput = document.getElementById("product-price");
const productCategorySelect = document.getElementById("product-category");
const sizesCheckboxContainer = document.getElementById("sizes-checkbox-container");
const productDescriptionTextarea = document.getElementById("product-description");
const productImageInput = document.getElementById("product-image");
const dropzone = document.getElementById("dropzone");
const imagePreview = document.getElementById("image-preview");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const btnProductSubmit = document.getElementById("btn-product-submit");

const inventoryCount = document.getElementById("inventory-count");
const inventoryTableBody = document.getElementById("inventory-table-body");
const toastContainer = document.getElementById("toast-container");

// Settings DOM Elements
const settingsForm = document.getElementById("settings-form");
const settingsName = document.getElementById("settings-name");
const settingsWhatsapp = document.getElementById("settings-whatsapp");
const settingsEmail = document.getElementById("settings-email");
const settingsPhone = document.getElementById("settings-phone");
const settingsAddress = document.getElementById("settings-address");
const settingsHours = document.getElementById("settings-hours");
const settingsBaseDelivery = document.getElementById("settings-base-delivery");
const settingsBaseKm = document.getElementById("settings-base-km");
const settingsPerKm = document.getElementById("settings-per-km");
const settingsFreeMin = document.getElementById("settings-free-min");
const settingsLat = document.getElementById("settings-lat");
const settingsLng = document.getElementById("settings-lng");
const btnSettingsSubmit = document.getElementById("btn-settings-submit");

// 3. Lifecycle Initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Load environment variables from .env file first
  await loadEnvVariables();

  if (isDemoMode) {
    demoBanner.classList.remove("hidden");
  }

  // Sync settings first
  await syncConfigWithDatabase();

  // Populate Categories & Sizes lists in Form
  setupFormControls();

  // Populate settings form inputs
  populateSettingsForm();

  // Update settings in DOM
  applyAdminConfigs();

  // Authentication check
  await checkAuth();

  // Set up event listeners
  registerAdminEvents();
});

function applyAdminConfigs() {
  document.getElementById("admin-store-title").innerHTML = `${CONFIG.STORE_NAME} <span>Admin Portal</span>`;
  document.getElementById("admin-footer-store-title").textContent = CONFIG.STORE_NAME;
  document.getElementById("admin-copy-store-title").textContent = CONFIG.STORE_NAME;
}

function populateSettingsForm() {
  settingsName.value = CONFIG.STORE_NAME;
  settingsWhatsapp.value = CONFIG.WHATSAPP_NUMBER;
  settingsEmail.value = CONFIG.CONTACT_EMAIL;
  settingsPhone.value = CONFIG.CONTACT_PHONE;
  settingsAddress.value = CONFIG.SHOP_ADDRESS;
  settingsHours.value = CONFIG.SHOP_HOURS;
  settingsBaseDelivery.value = CONFIG.BASE_DELIVERY_CHARGE;
  settingsBaseKm.value = CONFIG.BASE_DELIVERY_KM;
  settingsPerKm.value = CONFIG.DELIVERY_CHARGE_PER_KM;
  settingsFreeMin.value = CONFIG.FREE_DELIVERY_MIN_ORDER;
  settingsLat.value = CONFIG.SHOP_LATITUDE;
  settingsLng.value = CONFIG.SHOP_LONGITUDE;
}

// Populate Form options based on CONFIG
function setupFormControls() {
  // Populate category select
  productCategorySelect.innerHTML = CONFIG.CATEGORIES
    .filter(cat => cat !== "All") // Don't want "All" in form dropdown
    .map(category => `<option value="${category}">${category}</option>`)
    .join('');

  // Populate sizes checkbox grid
  sizesCheckboxContainer.innerHTML = CONFIG.AVAILABLE_SIZES.map(size => `
    <label class="checkbox-label">
      <input type="checkbox" name="sizes" value="${size}">
      <span>${size}</span>
    </label>
  `).join('');
}

// 4. Authentication Check
async function checkAuth() {
  if (isDemoMode) {
    const demoSession = sessionStorage.getItem("demo_admin_session");
    if (demoSession === "active") {
      session = { user: { email: "admin@demo.com" } };
      showDashboard();
    } else {
      showLogin();
    }
  } else {
    // Check Supabase Auth
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;

      if (data.session) {
        session = data.session;
        showDashboard();
      } else {
        showLogin();
      }

      // Listen for auth state changes
      supabaseClient.auth.onAuthStateChange((event, currentSession) => {
        if (currentSession) {
          session = currentSession;
          showDashboard();
        } else {
          session = null;
          showLogin();
        }
      });
    } catch (e) {
      console.error("Auth state fetch error:", e);
      showToast("Error checking connection to database.", "error");
      showLogin();
    }
  }
}

// Views toggles
function showLogin() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  loadInventory();
}

// 5. Auth Action Handlers
async function handleLogin(e) {
  e.preventDefault();
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();

  if (!email || !password) return;
  
  btnLoginSubmit.disabled = true;
  btnLoginSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking credentials...`;

  try {
    if (isDemoMode) {
      if (email === "admin@demo.com" && password === "password") {
        sessionStorage.setItem("demo_admin_session", "active");
        session = { user: { email } };
        showToast("Signed in successfully (Demo Mode)", "success");
        showDashboard();
      } else {
        throw new Error("Invalid demo email or password.");
      }
    } else {
      // Live Supabase Login
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      session = data.session;
      showToast("Signed in successfully!", "success");
      showDashboard();
    }
  } catch (error) {
    console.error("Login failure:", error);
    showToast(error.message || "Failed to sign in.", "error");
  } finally {
    btnLoginSubmit.disabled = false;
    btnLoginSubmit.innerHTML = `<i class="fa-solid fa-lock"></i> Sign In`;
  }
}

async function handleLogout() {
  if (isDemoMode) {
    sessionStorage.removeItem("demo_admin_session");
    session = null;
    showToast("Signed out from admin panel.", "info");
    showLogin();
  } else {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      showToast("Signed out successfully.", "info");
      showLogin();
    } catch (e) {
      showToast("Error signing out.", "error");
    }
  }
}

// 6. Fetch & Render Catalog Inventory
async function loadInventory() {
  try {
    if (isDemoMode) {
      const stored = localStorage.getItem("demo_products");
      inventoryProducts = stored ? JSON.parse(stored) : [];
    } else {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      inventoryProducts = data || [];
    }

    renderInventoryTable();
  } catch (error) {
    console.error("Error loading inventory:", error);
    showToast("Failed to fetch product inventory list.", "error");
  }
}

function renderInventoryTable() {
  inventoryCount.textContent = inventoryProducts.length;

  if (inventoryProducts.length === 0) {
    inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px 0; color: var(--text-secondary);">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; display: block; margin-bottom: 8px; opacity: 0.3;"></i>
          No items in catalog inventory yet.
        </td>
      </tr>
    `;
    return;
  }

  inventoryTableBody.innerHTML = inventoryProducts.map(product => `
    <tr>
      <td>
        <div class="table-product-cell">
          <img src="${product.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=150'}" alt="${product.name}" class="table-product-image">
          <div>
            <div class="table-product-name">${product.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;">
              Sizes: ${product.sizes.join(', ')}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span class="table-category">${product.category}</span>
      </td>
      <td>
        <span class="table-price">${CONFIG.STORE_CURRENCY}${parseFloat(product.price).toFixed(2)}</span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-delete-row" data-id="${product.id}" title="Delete Item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Delete Action Event Listeners
  document.querySelectorAll(".btn-delete-row").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteProduct(btn.getAttribute("data-id"));
    });
  });
}

// 7. Add Product & Image Upload Flow
async function handleProductSubmit(e) {
  e.preventDefault();

  const name = productNameInput.value.trim();
  const price = parseFloat(productPriceInput.value);
  const category = productCategorySelect.value;
  const description = productDescriptionTextarea.value.trim();
  
  // Extract checked sizes
  const checkedBoxes = document.querySelectorAll('input[name="sizes"]:checked');
  const sizes = Array.from(checkedBoxes).map(box => box.value);

  if (sizes.length === 0) {
    showToast("Please select at least one size option.", "error");
    return;
  }

  const file = productImageInput.files[0];
  if (!file) {
    showToast("Please upload a product image.", "error");
    return;
  }

  btnProductSubmit.disabled = true;
  btnProductSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving clothes item...`;

  try {
    let imageUrl = "";

    // Image Upload Process
    if (isDemoMode) {
      // Simulate file upload progress, then read as dataURL base64 for local storage
      showUploadProgress();
      
      const uploadSimulatePromise = new Promise((resolve) => {
        let percent = 0;
        const interval = setInterval(() => {
          percent += 20;
          updateUploadProgress(percent);
          if (percent >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      await uploadSimulatePromise;

      // Read as DataURL (base64)
      imageUrl = await readFileAsDataURL(file);
      hideUploadProgress();
    } else {
      // Real Supabase storage upload
      showUploadProgress();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `clothes/${fileName}`;

      // Upload file directly
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Retrieve public URL
      const { data: urlData } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
      hideUploadProgress();
    }

    // Insert Product Record
    if (isDemoMode) {
      const newProduct = {
        id: `demo-${Date.now()}`,
        name,
        price,
        category,
        sizes,
        description,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };

      // Read current and push
      const stored = localStorage.getItem("demo_products");
      const currentProducts = stored ? JSON.parse(stored) : [];
      currentProducts.unshift(newProduct);
      localStorage.setItem("demo_products", JSON.stringify(currentProducts));

      showToast(`Added ${name} successfully!`, "success");
    } else {
      // Insert to Supabase DB
      const { error: dbError } = await supabaseClient
        .from("products")
        .insert([{
          name,
          price,
          category,
          sizes,
          description,
          image_url: imageUrl
        }]);

      if (dbError) throw dbError;
      showToast(`Uploaded ${name} to database!`, "success");
    }

    // Reset Form
    resetProductForm();
    loadInventory();
  } catch (error) {
    console.error("Save item failure:", error);
    showToast(error.message || "Failed to save the product.", "error");
    hideUploadProgress();
  } finally {
    btnProductSubmit.disabled = false;
    btnProductSubmit.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Add Clothes`;
  }
}

// 8. Delete Product Flow
async function deleteProduct(productId) {
  const item = inventoryProducts.find(p => p.id === productId);
  if (!item) return;

  if (confirm(`Are you sure you want to delete "${item.name}" from your catalog?`)) {
    try {
      if (isDemoMode) {
        const stored = localStorage.getItem("demo_products");
        let currentProducts = stored ? JSON.parse(stored) : [];
        currentProducts = currentProducts.filter(p => p.id !== productId);
        localStorage.setItem("demo_products", JSON.stringify(currentProducts));
        
        showToast("Item deleted locally.", "success");
      } else {
        // 1. Delete image from storage if it belongs to this Supabase bucket
        if (item.image_url && item.image_url.includes("product-images")) {
          try {
            const urlParts = item.image_url.split("/product-images/public/");
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              await supabaseClient.storage.from("product-images").remove([filePath]);
            }
          } catch (storageErr) {
            console.error("Failed to delete storage file, ignoring:", storageErr);
          }
        }

        // 2. Delete DB record
        const { error } = await supabaseClient
          .from("products")
          .delete()
          .eq("id", productId);

        if (error) throw error;
        showToast("Item deleted from database.", "success");
      }

      loadInventory();
    } catch (error) {
      console.error("Delete operation failure:", error);
      showToast("Failed to delete item.", "error");
    }
  }
}

// Helper: Read File as data URL
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

// Form reset
function resetProductForm() {
  productForm.reset();
  imagePreview.src = "";
  imagePreview.style.display = "none";
  dropzone.style.display = "block";
  
  // Uncheck sizes
  document.querySelectorAll('input[name="sizes"]:checked').forEach(box => {
    box.checked = false;
  });
}

// Upload progress UI helper
function showUploadProgress() {
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
}

function updateUploadProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

function hideUploadProgress() {
  progressContainer.style.display = "none";
  progressBar.style.width = "0%";
}

// 9. Toast Alerts Handler
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
  setTimeout(() => toast.classList.add("active"), 10);

  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// 10. Register Event Handlers
function registerAdminEvents() {
  // Login submission
  loginForm.addEventListener("submit", handleLogin);

  // Logout button
  logoutBtn.addEventListener("click", handleLogout);

  // Product insertion form
  productForm.addEventListener("submit", handleProductSubmit);

  // Settings modification form
  settingsForm.addEventListener("submit", handleSettingsSubmit);

  // Close demo banner
  closeDemoBanner.addEventListener("click", () => {
    demoBanner.classList.add("hidden");
  });

  // Handle Drag & Drop / File selection triggers
  productImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handleFilePreview(file);
  });

  // File Drag-Drop visuals
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--text-primary)";
    dropzone.style.backgroundColor = "var(--accent-glow)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "var(--border-color)";
    dropzone.style.backgroundColor = "var(--bg-color)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--border-color)";
    dropzone.style.backgroundColor = "var(--bg-color)";
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      productImageInput.files = e.dataTransfer.files;
      handleFilePreview(file);
    }
  });
}

function handleFilePreview(file) {
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      dropzone.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
}

// 11. Settings Form Submission Handler
async function handleSettingsSubmit(e) {
  e.preventDefault();

  btnSettingsSubmit.disabled = true;
  btnSettingsSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving configs...`;

  const updatedSettings = {
    store_name: settingsName.value.trim(),
    whatsapp_number: settingsWhatsapp.value.trim(),
    store_currency: "₹",
    shop_latitude: parseFloat(settingsLat.value),
    shop_longitude: parseFloat(settingsLng.value),
    base_delivery_charge: parseFloat(settingsBaseDelivery.value),
    base_delivery_km: parseFloat(settingsBaseKm.value),
    delivery_charge_per_km: parseFloat(settingsPerKm.value),
    free_delivery_min_order: parseFloat(settingsFreeMin.value),
    contact_email: settingsEmail.value.trim(),
    contact_phone: settingsPhone.value.trim(),
    shop_address: settingsAddress.value.trim(),
    shop_hours: settingsHours.value.trim()
  };

  try {
    if (isDemoMode) {
      localStorage.setItem("demo_store_settings", JSON.stringify(updatedSettings));
      // Overlay CONFIG in-memory
      Object.assign(CONFIG, updatedSettings);
      showToast("Configurations saved locally!", "success");
    } else {
      // Update DB row 1
      const { error } = await supabaseClient
        .from("store_settings")
        .update(updatedSettings)
        .eq("id", 1);

      if (error) throw error;
      
      // Re-sync configuration
      await syncConfigWithDatabase();
      showToast("Configurations saved to database!", "success");
    }
    
    // Refresh page titles
    applyAdminConfigs();
  } catch (err) {
    console.error("Save settings error:", err);
    showToast("Failed to save configuration settings.", "error");
  } finally {
    btnSettingsSubmit.disabled = false;
    btnSettingsSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Configurations`;
  }
}
