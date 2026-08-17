/**
 * Domain types shared across services. Independent from the DB row
 * shape so we can evolve either side without breaking consumers.
 */

export interface Category {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string | null;
  name_en: string | null;
  icon: string | null;
  image_url: string | null;
  position: number;
  parent_id: string | null;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface Product {
  id: string;
  sku: string;
  category_id: string | null;
  brand_id: string | null;
  name_fr: string;
  name_ar: string | null;
  name_en: string | null;
  description_fr: string | null;
  unit: string | null;
  unit_size: number | null;
  weight_grams: number | null;
  base_price: number;
  is_featured: boolean;
  is_active: boolean;
  images: string[];
}

/** Product enriched with store-scoped price + availability. */
export interface StoreProduct extends Product {
  store_id: string;
  price: number;
  promo_price: number | null;
  is_available: boolean;
  on_hand: number;
  reserved: number;
  category?: Pick<Category, "id" | "slug" | "name_fr" | "icon"> | null;
  brand?: Pick<Brand, "id" | "slug" | "name"> | null;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: {
    sku: string;
    name_fr: string;
    unit: string | null;
    unit_size: number | null;
    images: string[];
    promo_price: number | null;
  };
}

export interface Cart {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  store_id: string | null;
  currency: string;
  coupon_code: string | null;
  items: CartItem[];
  totals: CartTotals;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  item_count: number;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  opens_at: string | null;
  closes_at: string | null;
}

export interface DeliverySlot {
  id: string;
  starts_at: string; // "10:00"
  ends_at: string;   // "12:00"
  day_of_week: number | null;
  slot_date: string | null;
  capacity: number;
  mode: "delivery" | "drive" | "pickup";
}
