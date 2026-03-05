import { Restaurant } from './types';

// Mocking a central location in Kinshasa, Gombe area for reference
// Lat: -4.301, Lng: 15.301

export const KINSHASA_CENTER_LAT = -4.301;
export const KINSHASA_CENTER_LNG = 15.301;

// Replace this URL with your actual hosted logo URL (e.g., from Supabase Storage or a public URL)
// For best results, use a PNG with a transparent background.
export const APP_LOGO_URL = "/logo.png";

export const CITIES_RDC = [
  "Kinshasa",
  "Lubumbashi",
  "Goma",
  "Bukavu",
  "Kisangani",
  "Matadi",
  "Kananga",
  "Mbuji-Mayi",
  "Kolwezi",
  "Likasi",
  "Boma",
  "Kikwit",
  "Mbandaka",
  "Butembo",
  "Beni",
  "Isiro",
  "Kindu",
  "Bunia",
  "Gemena",
  "Bandundu",
  "Kalemie"
];

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    ownerId: 'owner-1',
    type: 'restaurant',
    name: 'Chez Mama Africa',
    description: 'Authentique cuisine congolaise.',
    latitude: -4.3025,
    longitude: 15.3040,
    city: 'Kinshasa',
    isOpen: true,
    rating: 4.8,
    reviewCount: 124,
    preparationTime: 25,
    estimatedDeliveryTime: 30,
    deliveryAvailable: true,
    coverImage: 'https://picsum.photos/800/600?random=1',
    menu: [
      { id: 'm1', name: 'Poulet Moambe', description: 'Poulet à la sauce arachide avec fufu.', price: 12.5, image: 'https://picsum.photos/200/200?random=101', category: 'plat', isAvailable: true },
      { id: 'm2', name: 'Liboke de Poisson', description: 'Poisson cuit en feuille de bananier.', price: 15.0, image: 'https://picsum.photos/200/200?random=102', category: 'plat', isAvailable: true },
      { id: 'm3', name: 'Makemba', description: 'Bananes plantains frites.', price: 3.0, image: 'https://picsum.photos/200/200?random=103', category: 'entrée', isAvailable: true },
    ]
  },
  {
    id: '2',
    ownerId: 'owner-2',
    type: 'snack',
    name: 'KinBurger Express',
    description: 'Burgers rapides et savoureux.',
    latitude: -4.3060,
    longitude: 15.2980,
    city: 'Kinshasa',
    isOpen: true,
    rating: 4.2,
    reviewCount: 89,
    preparationTime: 12,
    estimatedDeliveryTime: 20,
    deliveryAvailable: true,
    coverImage: 'https://picsum.photos/800/600?random=2',
    menu: [
      { id: 'k1', name: 'Le Kinshasa Burger', description: 'Double steak, fromage, sauce secrète.', price: 9.0, image: 'https://picsum.photos/200/200?random=201', category: 'plat', isAvailable: true },
      { id: 'k2', name: 'Frites Maison', description: 'Portion généreuse.', price: 2.5, image: 'https://picsum.photos/200/200?random=202', category: 'entrée', isAvailable: true },
    ]
  },
  {
    id: '3',
    ownerId: 'owner-3',
    type: 'restaurant',
    name: 'Pizzeria Limete',
    description: 'Pizzas au feu de bois.',
    latitude: -4.3200, // Further away
    longitude: 15.3100,
    city: 'Kinshasa',
    isOpen: false,
    rating: 4.5,
    reviewCount: 210,
    preparationTime: 40,
    estimatedDeliveryTime: 45,
    deliveryAvailable: true,
    coverImage: 'https://picsum.photos/800/600?random=3',
    menu: [
      { id: 'p1', name: 'Reine', description: 'Jambon, fromage, champignons.', price: 14.0, image: 'https://picsum.photos/200/200?random=301', category: 'plat', isAvailable: true },
    ]
  },
  {
    id: '4',
    ownerId: 'owner-4',
    type: 'restaurant',
    name: 'La Grille de la Gombe',
    description: 'Grillades et ambiance feutrée.',
    latitude: -4.3015,
    longitude: 15.3015,
    city: 'Kinshasa',
    isOpen: true,
    rating: 4.9,
    reviewCount: 45,
    preparationTime: 35,
    estimatedDeliveryTime: 40,
    deliveryAvailable: false,
    coverImage: 'https://picsum.photos/800/600?random=4',
    menu: [
      { id: 'g1', name: 'Capitaine Braisé', description: 'Poisson entier braisé aux épices.', price: 25.0, image: 'https://picsum.photos/200/200?random=401', category: 'plat', isAvailable: true },
    ]
  },
  {
    id: '5',
    ownerId: 'owner-5',
    type: 'snack',
    name: 'Snack Rapido',
    description: 'Pour les petites faims urgentes.',
    latitude: -4.3030,
    longitude: 15.3000,
    city: 'Kinshasa',
    isOpen: true,
    rating: 3.8,
    reviewCount: 15,
    preparationTime: 8,
    estimatedDeliveryTime: 15,
    deliveryAvailable: true,
    coverImage: 'https://picsum.photos/800/600?random=5',
    menu: [
      { id: 's1', name: 'Chawarma Poulet', description: 'Pain libanais, poulet, crudités.', price: 5.0, image: 'https://picsum.photos/200/200?random=501', category: 'plat', isAvailable: true },
    ]
  }
];