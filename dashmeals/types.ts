
export interface Location {
  latitude: number;
  longitude: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'entrée' | 'plat' | 'boisson' | 'dessert';
  isAvailable: boolean;
}

export type BusinessType = 'restaurant' | 'bar' | 'terrasse' | 'snack';

export interface Promotion {
  id: string;
  restaurantId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  ownerId: string; // Lien avec le compte entreprise
  type: BusinessType;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  city: string; // Ville de l'établissement
  isOpen: boolean;
  rating: number; // 1-5
  reviewCount: number;
  preparationTime: number; // in minutes
  estimatedDeliveryTime: number; // in minutes (Temps moyen de livraison)
  deliveryAvailable: boolean;
  coverImage: string;
  phoneNumber?: string; // Ajout pour l'appel
  menu: MenuItem[];
  promotions?: Promotion[]; // Stories actives
  // Verification fields
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationDocs?: {
    idCardUrl?: string;
    registryNumber?: string;
  };
  verificationPaymentStatus?: 'unpaid' | 'paid';
  // Calculated fields
  distance?: number; // km
  timeWalking?: number; // minutes
  timeMoto?: number; // minutes
}

export interface CartItem extends MenuItem {
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export type ViewMode = 'list' | 'map' | 'restaurant_detail' | 'checkout' | 'success' | 'orders' | 'settings';

export interface UserState {
  location: Location | null;
  locationError: string | null;
  loadingLocation: boolean;
}

// Auth Types
export type UserRole = 'client' | 'business' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string; // Ville de résidence
  phoneNumber?: string; // Ajout pour l'appel
  businessId?: string; // Si c'est un compte business
}

// Order Types
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  totalAmount: number;
  items: CartItem[];
  createdAt: string;
  // Optional joined fields for display
  restaurant?: {
    name: string;
    phone_number?: string;
  };
  customer?: {
    full_name: string;
    phone_number?: string;
  };
}

// Chat Types
export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

// App Settings Types
export type Theme = 'light' | 'dark';
export type Language = 'fr' | 'en' | 'ln'; // Français, Anglais, Lingala
export type AppFont = 'inter' | 'roboto' | 'opensans' | 'lato' | 'montserrat';