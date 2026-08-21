// E-Commerce Configuration
// If you leave SUPABASE_URL and SUPABASE_ANON_KEY empty, the website will run in "Demo Mode"
// using your browser's LocalStorage to store products, allowing you to test everything instantly!

const CONFIG = {
  // 1. Supabase Credentials (Get these from Supabase Project Settings -> API)
  SUPABASE_URL: "https://ctcedquxunlexeblfbzs.supabase.co", 
  SUPABASE_ANON_KEY: "sb_publishable_gI9tTmyuav6KT1uJah47bw_S3miyDOQ",

  // 2. Business Settings
  WHATSAPP_NUMBER: "1234567890", // Your WhatsApp phone number (with country code, no spaces/plus signs, e.g., "919876543210")
  STORE_NAME: "The RR Men's Collection", // Name of your clothing store
  STORE_CURRENCY: "₹", // Currency symbol (e.g. $, ₹, €, £)

  // 3. Predefined Clothing Sizes
  AVAILABLE_SIZES: ["XS", "S", "M", "L", "XL", "XXL"],

  // 4. Predefined Categories (for filter buttons)
  CATEGORIES: ["All", "T-Shirts", "Shirts", "Hoodies", "Jackets", "Pants", "Accessories"],

  // 5. Local Delivery Settings (for distance & delivery charge calculations)
  SHOP_LATITUDE: 13.04975,      // Shop location latitude (East Point Hospital, Bidarahalli)
  SHOP_LONGITUDE: 77.72014,     // Shop location longitude
  BASE_DELIVERY_CHARGE: 40.00,   // Base charge in currency units (e.g. ₹40)
  BASE_DELIVERY_KM: 3.0,         // Kilometers included in the base charge
  DELIVERY_CHARGE_PER_KM: 10.00, // Charge per additional km after base distance
  FREE_DELIVERY_MIN_ORDER: 1500.00, // Free delivery if order subtotal exceeds this amount

  // 6. Shop Contact Details
  CONTACT_EMAIL: "contact@therrmenscollection.com",
  CONTACT_PHONE: "+91 12345 67890",
  SHOP_ADDRESS: "Near East Point Hospital, Bidrahalli Main Road, Bangalore - 560049",
  SHOP_HOURS: "9:30 AM - 9:30 PM"
};

// Check if Supabase keys are configured
let isDemoMode = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;

if (isDemoMode) {
  console.log("ℹ️ Website running in DEMO MODE. Changes will be saved to your browser's LocalStorage.");
} else {
  console.log("⚡ Website running in LIVE MODE. Connected to Supabase.");
}

// Global initialization helper
function getSupabaseClient() {
  if (isDemoMode) return null;
  
  if (typeof supabase === 'undefined') {
    console.error("Supabase CDN script is not loaded.");
    return null;
  }
  
  return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

// Function to load settings from DB / LocalStorage and override configuration values
async function syncConfigWithDatabase() {
  try {
    if (isDemoMode) {
      const storedSettings = localStorage.getItem("demo_store_settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        Object.assign(CONFIG, parsed);
      }
    } else {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("store_settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (error) throw error;
        
        if (data) {
          CONFIG.STORE_NAME = data.store_name;
          CONFIG.WHATSAPP_NUMBER = data.whatsapp_number;
          CONFIG.STORE_CURRENCY = data.store_currency;
          CONFIG.SHOP_LATITUDE = parseFloat(data.shop_latitude);
          CONFIG.SHOP_LONGITUDE = parseFloat(data.shop_longitude);
          CONFIG.BASE_DELIVERY_CHARGE = parseFloat(data.base_delivery_charge);
          CONFIG.BASE_DELIVERY_KM = parseFloat(data.base_delivery_km);
          CONFIG.DELIVERY_CHARGE_PER_KM = parseFloat(data.delivery_charge_per_km);
          CONFIG.FREE_DELIVERY_MIN_ORDER = parseFloat(data.free_delivery_min_order);
          CONFIG.CONTACT_EMAIL = data.contact_email;
          CONFIG.CONTACT_PHONE = data.contact_phone;
          CONFIG.SHOP_ADDRESS = data.shop_address;
          CONFIG.SHOP_HOURS = data.shop_hours;
        }
      }
    }
  } catch (err) {
    console.error("Config synchronization failed, using defaults:", err);
  }
}

// Function to load environment variables from .env file dynamically (for local development)
async function loadEnvVariables() {
  try {
    const response = await fetch('.env');
    if (!response.ok) return;
    const text = await response.text();
    const env = {};
    text.split('\n').forEach(line => {
      // Ignore empty lines and comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const parts = trimmedLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/['"]/g, ''); // strip quotes
        if (key && value) env[key] = value;
      }
    });
    
    if (env.SUPABASE_URL) CONFIG.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_ANON_KEY) CONFIG.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    // Re-evaluate demo mode
    isDemoMode = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
  } catch (e) {
    // .env might not exist or be blocked by browser CORS when opening via file:// protocol
  }
}
