import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, ShoppingBag, List, Map, Zap, ArrowLeft, Plus, Bike, Footprints, LogOut, Navigation, Search, X, Receipt, Phone, Info, Image as ImageIcon, PlayCircle, Settings, Moon, Sun, Globe, CheckCircle, Type } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { KINSHASA_CENTER_LAT, KINSHASA_CENTER_LNG, CITIES_RDC, APP_LOGO_URL } from '../constants';
import { Restaurant, UserState, ViewMode, MenuItem, CartItem, User, Order, Promotion, Theme, Language, AppFont } from '../types';
import { calculateTime, getDistanceFromLatLonInKm, formatDistance, formatTime } from '../utils/geo';
import { RestaurantCard } from '../components/RestaurantCard';
import { MapView } from '../components/MapView';
import { CartDrawer } from '../components/CartDrawer';
import { ChatWindow } from '../components/ChatWindow';
import { StoryViewer } from '../components/StoryViewer';
import { OrdersView } from '../components/OrdersView';
import { useTranslation } from '../lib/i18n';

// Speed constants
const SPEED_WALKING = 5;
const SPEED_MOTO = 30;

interface Props {
  user: User;
  allRestaurants: Restaurant[];
  onLogout: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  font?: AppFont;
  setFont?: (f: AppFont) => void;
}

export const CustomerView: React.FC<Props> = ({ user, allRestaurants, onLogout, theme, setTheme, language, setLanguage, font, setFont }) => {
  const t = useTranslation(language);
  // State
  const [userState, setUserState] = useState<UserState>({
    location: null,
    locationError: null,
    loadingLocation: true,
  });
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [promotionsMap, setPromotionsMap] = useState<Record<string, Promotion[]>>({});
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [urgentMode, setUrgentMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>(user.city || 'Kinshasa');
  
  // Order States
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Chat State
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Story State
  const [activeStoryRestaurant, setActiveStoryRestaurant] = useState<Restaurant | null>(null);
  const [storyStartIndex, setStoryStartIndex] = useState(0);

  // Geolocation Function
  const refreshLocation = () => {
    setUserState(prev => ({ ...prev, loadingLocation: true, locationError: null }));
    
    if (!navigator.geolocation) {
      setUserState({
        location: null,
        locationError: "La géolocalisation n'est pas supportée par votre navigateur",
        loadingLocation: false
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          locationError: null,
          loadingLocation: false
        });
      },
      (error) => {
        console.warn("Geo error:", error);
        setUserState({
            location: {
                latitude: KINSHASA_CENTER_LAT,
                longitude: KINSHASA_CENTER_LNG
            },
            locationError: "Position introuvable. Utilisation de la position par défaut (Kinshasa).",
            loadingLocation: false
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Initial Geolocation
  useEffect(() => {
    refreshLocation();
  }, []);

  // Update Restaurants when location or database changes
  useEffect(() => {
    if (userState.location) {
      const updatedRestaurants = allRestaurants.map(r => {
        const dist = getDistanceFromLatLonInKm(
          userState.location!.latitude,
          userState.location!.longitude,
          r.latitude,
          r.longitude
        );
        return {
          ...r,
          distance: dist,
          timeWalking: calculateTime(dist, SPEED_WALKING),
          timeMoto: calculateTime(dist, SPEED_MOTO),
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setRestaurants(updatedRestaurants);
      // Fetch promotions after restaurants are ready
      fetchPromotions(updatedRestaurants);
    } else {
      setRestaurants(allRestaurants);
      fetchPromotions(allRestaurants);
    }
  }, [userState.location, allRestaurants]);

  // Realtime Orders Subscription for Customer
  useEffect(() => {
    const channel = supabase
        .channel('customer-orders')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE', // On écoute quand le restaurant change le statut
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${user.id}`
            },
            (payload) => {
                console.log("Mise à jour commande client:", payload);
                // On met à jour l'état local pour voir le changement instantanément
                setOrders(prev => prev.map(o => 
                    o.id === payload.new.id ? { ...o, status: payload.new.status } : o
                ));
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchPromotions = async (restos: Restaurant[]) => {
      // Filter for last 24 hours
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const { data } = await supabase
        .from('promotions')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      if (data) {
          const mapping: Record<string, Promotion[]> = {};
          data.forEach((p: any) => {
              if (!mapping[p.restaurant_id]) mapping[p.restaurant_id] = [];
              mapping[p.restaurant_id].push({
                  id: p.id,
                  restaurantId: p.restaurant_id,
                  mediaUrl: p.media_url,
                  mediaType: p.media_type,
                  caption: p.caption,
                  createdAt: p.created_at
              });
          });
          setPromotionsMap(mapping);
      }
  };

  // Load Orders when entering 'orders' view
  useEffect(() => {
    if (viewMode === 'orders') {
        fetchOrders();
    }
  }, [viewMode]);

  const fetchOrders = async () => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`*, restaurant:restaurants(name, phone_number)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
             const localOrders = localStorage.getItem('dashmeals_mock_orders');
             if (localOrders) setOrders(JSON.parse(localOrders));
             return;
        }
        
        if (data) {
            setOrders(data.map((o: any) => ({
                id: o.id,
                userId: o.user_id,
                restaurantId: o.restaurant_id,
                status: o.status,
                totalAmount: o.total_amount,
                items: o.items,
                createdAt: o.created_at,
                restaurant: {
                    name: o.restaurant?.name || 'Inconnu',
                    phone_number: o.restaurant?.phone_number
                }
            })));
        }
    } catch (err) {
        console.error("Error fetching orders:", err);
    }
  };

  // Filter Logic (City + Urgent + Search)
  const filteredRestaurants = useMemo(() => {
    let list = restaurants;
    if (selectedCity && selectedCity !== 'Toutes') list = list.filter(r => r.city === selectedCity);
    if (urgentMode) list = list.filter(r => r.isOpen && r.preparationTime <= 20);
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        list = list.filter(r => 
          r.name.toLowerCase().includes(query) || 
          r.description.toLowerCase().includes(query)
        );
    }
    return list;
  }, [restaurants, urgentMode, selectedCity, searchQuery]);

  // Cart Logic
  const addToCart = (item: MenuItem, restaurant: Restaurant) => {
    if (cart.length > 0 && cart[0].restaurantId !== restaurant.id) {
        if(!window.confirm("Vous ne pouvez commander que dans un restaurant à la fois. Vider le panier actuel ?")) return;
        setCart([]);
    }
    setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...item, quantity: 1, restaurantId: restaurant.id, restaurantName: restaurant.name }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
        const index = prev.findIndex(i => i.id === itemId);
        if (index > -1) {
            const newArr = [...prev];
            newArr.splice(index, 1);
            return newArr;
        }
        return prev;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
        const { data, error } = await supabase.from('orders').insert({
            user_id: user.id,
            restaurant_id: cart[0].restaurantId,
            status: 'pending',
            total_amount: cartTotal,
            items: cart // Supabase will stringify this automatically for jsonb
        }).select().single();

        if (error) {
            console.error("Erreur commande:", error);
            throw new Error("Impossible d'envoyer la commande. Vérifiez votre connexion.");
        }

        // Success Path
        setIsCartOpen(false);
        setShowSuccess(true);
        setCart([]);
        
        // Redirection rapide vers l'historique pour voir le suivi
        setTimeout(() => {
             setShowSuccess(false);
             setViewMode('orders');
             // fetchOrders sera appelé par le useEffect du viewMode
        }, 2000);

    } catch (err: any) {
        alert(err.message || "Erreur inconnue lors de la commande.");
    } finally {
        setIsCheckingOut(false);
    }
  };

  // Views
  if (userState.loadingLocation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-brand-800 dark:text-brand-400 font-medium">Localisation en cours...</p>
      </div>
    );
  }

  // Get list of restaurants that have promotions
  const restaurantsWithStories = restaurants.filter(r => promotionsMap[r.id] && promotionsMap[r.id].length > 0);

  return (
    // AJOUT DE 'transform-gpu' POUR FORCER LE RENDU PIXEL-PERFECT ET ÉVITER LE FLOU SUR LES MARGES AUTO
    <div className="min-h-screen pb-20 max-w-md mx-auto bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden relative transform-gpu transition-colors duration-300">
      
      {/* STORY VIEWER OVERLAY */}
      {activeStoryRestaurant && promotionsMap[activeStoryRestaurant.id] && (
          <StoryViewer 
            key={`${activeStoryRestaurant.id}-${storyStartIndex}`}
            restaurant={activeStoryRestaurant}
            promotions={promotionsMap[activeStoryRestaurant.id]}
            onClose={() => setActiveStoryRestaurant(null)}
            onVisitRestaurant={() => {
                setActiveStoryRestaurant(null);
                setSelectedRestaurant(activeStoryRestaurant);
                setViewMode('restaurant_detail');
            }}
            initialIndex={storyStartIndex}
          />
      )}

      {/* CHAT OVERLAY */}
      {activeChatOrder && (
          <ChatWindow 
            orderId={activeChatOrder.id}
            currentUser={{ id: user.id, role: 'client' }}
            otherUserName={activeChatOrder.restaurant?.name || 'Restaurant'}
            otherUserPhone={activeChatOrder.restaurant?.phone_number || '+243999999999'}
            onClose={() => setActiveChatOrder(null)}
          />
      )}

      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <div className="absolute inset-0 z-[60] bg-brand-500 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              <ShoppingBag className="text-brand-500" size={40} />
           </div>
           <h2 className="text-3xl font-bold mb-2">Commande Reçue !</h2>
           <p className="text-brand-100">Votre repas est en préparation.</p>
           <div className="mt-8 bg-white/20 p-4 rounded-xl backdrop-blur-sm">
             <p className="font-mono text-sm">Redirection vers le suivi...</p>
           </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white dark:bg-gray-800 sticky top-0 z-30 px-4 py-3 shadow-sm border-b border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
                <div className="flex items-center">
                   <div className="bg-white p-1 rounded-lg mr-2 shadow-sm border border-gray-100 dark:border-gray-700">
                      <img src={APP_LOGO_URL} alt="DashMeals" className="h-8 w-auto object-contain" />
                   </div>
                   <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mr-2">DashMeals</h1>
                   <span className="text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold border border-brand-200 dark:border-brand-800">RDC</span>
                </div>
                {/* Affichage du nom du client */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-9">Bonjour, {user.name}</span>
            </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <ShoppingBag size={20} className="text-gray-700 dark:text-gray-200" />
                {cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">{cart.length}</span>}
            </button>
            <button onClick={() => setViewMode('settings')} className="p-2 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
                <Settings size={20} />
            </button>
          </div>
        </div>
        
        {(viewMode === 'list' || viewMode === 'map') && (
            <div className="flex items-center space-x-2">
                <div className="flex-1 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg truncate border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center truncate">
                    <MapPin size={14} className={`mr-1.5 flex-shrink-0 ${userState.locationError ? 'text-gray-400' : 'text-brand-500 animate-pulse'}`} />
                    <span className="truncate font-medium text-xs">
                      {userState.loadingLocation ? "Localisation..." : userState.locationError ? "Position par défaut (Kinshasa)" : "Ma Position GPS"}
                    </span>
                  </div>
                  <button onClick={refreshLocation} className="ml-2 p-1 bg-white dark:bg-gray-600 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors" title="Actualiser ma position">
                    <Navigation size={12} className={`text-brand-600 dark:text-brand-400 ${userState.loadingLocation ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <select className="bg-brand-50 dark:bg-gray-700 text-brand-700 dark:text-brand-400 text-xs font-bold py-2 pl-2 pr-6 rounded-lg border border-brand-200 dark:border-gray-600 outline-none appearance-none cursor-pointer hover:bg-brand-100 dark:hover:bg-gray-600 transition-colors" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <option value="Toutes">Toutes les villes</option>
                {CITIES_RDC.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
            </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="p-4 pt-2">
        
        {viewMode === 'list' || viewMode === 'map' ? (
            <>
                {/* SEARCH BAR */}
                <div className="mb-4 relative z-20">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Rechercher un restaurant par nom..."
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-shadow focus:shadow-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')} 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                </div>

                {/* STORIES BAR - Hidden during search */}
                {!searchQuery && restaurantsWithStories.length > 0 && (
                    <div className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar">
                        <div className="flex space-x-4">
                            {restaurantsWithStories.map(r => (
                                <button 
                                    key={r.id} 
                                    onClick={() => {
                                        setStoryStartIndex(0);
                                        setActiveStoryRestaurant(r);
                                    }}
                                    className="flex flex-col items-center space-y-1 min-w-[64px]"
                                >
                                    <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-500 to-yellow-500">
                                        <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-800 overflow-hidden">
                                            <img src={r.coverImage} className="w-full h-full object-cover" alt={r.name} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 truncate w-full text-center">{r.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* FILTERS */}
                <div className="flex space-x-3 mb-6 overflow-x-auto no-scrollbar pb-1">
                    <button 
                        onClick={() => setUrgentMode(!urgentMode)}
                        className={`flex items-center px-4 py-2 rounded-full font-bold text-sm shadow-sm transition-all border whitespace-nowrap ${urgentMode ? 'bg-red-500 text-white border-red-500 animate-pulse-fast' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
                    >
                        <Zap size={16} className={`mr-1 ${urgentMode ? 'fill-white' : 'fill-none'}`} />
                        Urgent - J'ai faim !
                    </button>
                    <button className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm whitespace-nowrap shadow-sm">🍖 Grillades</button>
                    <button className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm whitespace-nowrap shadow-sm">🍗 Poulet</button>
                </div>

                {/* CONTENT */}
                {viewMode === 'list' ? (
                    <div className="space-y-4">
                        {filteredRestaurants.map(restaurant => (
                            <RestaurantCard 
                                key={restaurant.id} 
                                restaurant={restaurant} 
                                onClick={() => { setSelectedRestaurant(restaurant); setViewMode('restaurant_detail'); }}
                            />
                        ))}
                        {filteredRestaurants.length === 0 && (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <p>Aucun restaurant trouvé {selectedCity !== 'Toutes' ? `à ${selectedCity}` : ''} {searchQuery ? `pour "${searchQuery}"` : ''} :(</p>
                                {urgentMode && <button onClick={() => setUrgentMode(false)} className="text-brand-500 underline mt-2">Désactiver le mode urgent</button>}
                            </div>
                        )}
                    </div>
                ) : (
                    <MapView 
                        restaurants={filteredRestaurants} 
                        userLocation={userState.location} 
                        onSelect={(r) => { setSelectedRestaurant(r); setViewMode('restaurant_detail'); }}
                    />
                )}
            </>
        ) : viewMode === 'restaurant_detail' && selectedRestaurant ? (
            <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setViewMode('list')} className="mb-4 flex items-center text-gray-600 dark:text-gray-300 font-medium hover:text-brand-600"><ArrowLeft size={18} className="mr-1" /> Retour</button>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                    <img src={selectedRestaurant.coverImage} className="w-full h-48 object-cover" alt="Cover" />
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center">
                               <h1 className="text-2xl font-bold text-gray-900 dark:text-white mr-2">{selectedRestaurant.name}</h1>
                               {selectedRestaurant.isVerified && (
                                   <CheckCircle size={20} className="text-orange-500 fill-orange-100" />
                               )}
                           </div>
                           <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">{selectedRestaurant.city}</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 mt-2">{selectedRestaurant.description}</p>
                        
                        {/* Info & Contact Section */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center"><Info size={16} className="mr-2 text-brand-600"/> Informations & Contact</h3>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <MapPin size={16} className="mr-2 text-gray-400"/>
                                    <span>{selectedRestaurant.city || 'Kinshasa'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                        <Phone size={16} className="mr-2 text-gray-400"/>
                                        <span>{selectedRestaurant.phoneNumber || 'Numéro non disponible'}</span>
                                    </div>
                                    {selectedRestaurant.phoneNumber && (
                                        <button 
                                            onClick={() => window.open(`tel:${selectedRestaurant.phoneNumber}`)}
                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center shadow-md transition-transform active:scale-95"
                                        >
                                            <Phone size={14} className="mr-1"/> Appeler
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><Navigation size={14} className="mr-1"/> {formatDistance(selectedRestaurant.distance || 0)}</span>
                            <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><Zap size={14} className="mr-1 text-yellow-500"/> {selectedRestaurant.preparationTime} min</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                             <div className="flex items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
                                <Bike size={20} className="mr-3" />
                                <div><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">En Moto</p><p className="font-bold text-lg leading-none">{selectedRestaurant.timeMoto ? formatTime(selectedRestaurant.timeMoto) : '--'}</p></div>
                            </div>
                            <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                <Footprints size={20} className="mr-3" />
                                <div><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">À pied</p><p className="font-bold text-lg leading-none">{selectedRestaurant.timeWalking ? formatTime(selectedRestaurant.timeWalking) : '--'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GALLERY SECTION */}
                {promotionsMap[selectedRestaurant.id] && promotionsMap[selectedRestaurant.id].length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-white flex items-center">
                            <ImageIcon className="mr-2 text-brand-600" size={18} />
                            Galerie ({promotionsMap[selectedRestaurant.id].length})
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {promotionsMap[selectedRestaurant.id].map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setStoryStartIndex(idx);
                                        setActiveStoryRestaurant(selectedRestaurant);
                                    }}
                                    className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 group"
                                >
                                    {item.mediaType === 'video' ? (
                                        <>
                                            <video src={item.mediaUrl} className="w-full h-full object-cover opacity-90" muted />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                <PlayCircle className="text-white opacity-90" size={24} />
                                            </div>
                                        </>
                                    ) : (
                                        <img src={item.mediaUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt="Gallery" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">Menu</h3>
                <div className="space-y-3">
                    {selectedRestaurant.menu.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex space-x-3">
                            <img src={item.image} className="w-20 h-20 rounded-lg object-cover bg-gray-100 dark:bg-gray-700" alt={item.name} />
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.description}</p>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="font-bold text-brand-600">${(item.price || 0).toFixed(2)}</span>
                                    <button onClick={() => addToCart(item, selectedRestaurant)} className="bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 p-2 rounded-full hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"><Plus size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : viewMode === 'orders' ? (
            <OrdersView 
                orders={orders} 
                onChat={(order) => setActiveChatOrder(order)} 
                onBrowse={() => setViewMode('list')} 
                onOrderUpdated={fetchOrders}
            />
        ) : viewMode === 'settings' ? (
             <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setViewMode('list')} className="mb-4 flex items-center text-gray-600 dark:text-gray-300 font-medium hover:text-brand-600"><ArrowLeft size={18} className="mr-1" /> {t('back_to_restaurants')}</button>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6">{t('settings')}</h2>
                
                <div className="space-y-6">
                    {/* Theme Toggle */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                            {theme === 'light' ? <Sun size={20} className="mr-2 text-orange-500"/> : <Moon size={20} className="mr-2 text-blue-400"/>}
                            {t('appearance')}
                        </h3>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => setTheme('light')}
                                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm border ${theme === 'light' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                                {t('light')}
                            </button>
                            <button 
                                onClick={() => setTheme('dark')}
                                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                                {t('dark')}
                            </button>
                        </div>
                    </div>

                    {/* Language Toggle */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                            <Globe size={20} className="mr-2 text-brand-600"/>
                            {t('language')}
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                             {(['fr', 'en', 'ln'] as const).map((lang) => (
                                <button
                                    key={lang} 
                                    onClick={() => setLanguage(lang)}
                                    className={`w-full text-left py-3 px-4 rounded-lg font-bold text-sm border flex justify-between items-center ${language === lang ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-400' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                                >
                                    <span>{lang === 'fr' ? 'Français' : lang === 'en' ? 'English' : 'Lingala'}</span>
                                    {language === lang && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                                </button>
                             ))}
                        </div>
                    </div>

                    {/* Font Selector */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                            <Type size={20} className="mr-2 text-brand-600"/>
                            {t('font')}
                        </h3>
                        {font && setFont && (
                            <select 
                                value={font} 
                                onChange={(e) => setFont(e.target.value as AppFont)}
                                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm p-3 rounded-lg border border-gray-200 dark:border-gray-600 outline-none focus:border-brand-500"
                            >
                                <option value="inter">Inter (Défaut)</option>
                                <option value="roboto">Roboto</option>
                                <option value="opensans">Open Sans</option>
                                <option value="lato">Lato</option>
                                <option value="montserrat">Montserrat</option>
                            </select>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 text-red-500 p-2 rounded-lg font-bold">
                            <LogOut size={20}/>
                            <span>{t('logout')}</span>
                        </button>
                    </div>
                </div>
            </div>
        ) : null}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-around items-center z-40 max-w-md mx-auto transition-colors duration-300">
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center space-y-1 ${viewMode === 'list' || viewMode === 'restaurant_detail' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}><List size={22} /><span className="text-[10px] font-medium">Liste</span></button>
        <div className="relative -top-6"><button onClick={() => setUrgentMode(!urgentMode)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 dark:border-gray-900 transition-all ${urgentMode ? 'bg-red-500 text-white scale-110' : 'bg-brand-500 text-white'}`}><Zap size={24} className={urgentMode ? 'animate-pulse' : ''} /></button></div>
        <button onClick={() => setViewMode('map')} className={`flex flex-col items-center space-y-1 ${viewMode === 'map' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}><Map size={22} /><span className="text-[10px] font-medium">Carte</span></button>
        <button onClick={() => setViewMode('orders')} className={`flex flex-col items-center space-y-1 ${viewMode === 'orders' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}><Receipt size={22} /><span className="text-[10px] font-medium">{t('orders')}</span></button>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} onRemove={removeFromCart} onCheckout={handleCheckout} total={cartTotal} isLoading={isCheckingOut} />
    </div>
  );
};