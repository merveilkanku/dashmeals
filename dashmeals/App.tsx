import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { MOCK_RESTAURANTS } from './constants';
import { Restaurant, User, UserRole, MenuItem, BusinessType, Theme, Language, AppFont } from './types';
import { AuthScreen } from './components/AuthScreen';
import { CustomerView } from './components/CustomerView';
import { BusinessDashboard } from './components/BusinessDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SplashScreen } from './components/SplashScreen';
import { AlertTriangle, Store, ArrowRight } from 'lucide-react';

function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSupabaseReachable, setIsSupabaseReachable] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // Settings States
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('dashmeals_theme') as Theme) || 'light');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('dashmeals_language') as Language) || 'fr');
  const [font, setFont] = useState<AppFont>(() => (localStorage.getItem('dashmeals_font') as AppFont) || 'inter');

  // États pour la création manuelle de restaurant (Fallback)
  const [newRestoName, setNewRestoName] = useState('');
  const [newRestoType, setNewRestoType] = useState<BusinessType>('restaurant');
  const [creationLoading, setCreationLoading] = useState(false);

  // Apply & Persist Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dashmeals_theme', theme);
  }, [theme]);

  // Persist Language
  useEffect(() => {
    localStorage.setItem('dashmeals_language', language);
  }, [language]);

  // Apply & Persist Font
  useEffect(() => {
    // Update the global sans font variable to match the selected font
    // This overrides the Tailwind theme variable because inline styles have higher specificity/cascade
    document.documentElement.style.setProperty('--font-sans', `var(--font-${font})`);
    localStorage.setItem('dashmeals_font', font);
  }, [font]);

  // Initialisation et écoute de la session
  useEffect(() => {
    const initSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.warn("Erreur session:", error.message);
                setIsOfflineMode(true);
                if (error.message.includes('fetch')) setIsSupabaseReachable(false);
            }
            if (session?.user) {
                await fetchUserProfile(session.user.id, session.user.email!, session.user.user_metadata);
            }
        } catch (err: any) {
            console.error("Erreur init:", err);
            setIsOfflineMode(true);
            if (err.message?.includes('fetch') || err.name === 'TypeError') {
                setIsSupabaseReachable(false);
            }
        } finally {
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!, session.user.user_metadata);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    fetchRestaurants();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email: string, metadata: any = {}) => {
    try {
      // FORCE SUPERADMIN FOR SPECIFIC EMAIL
      if (email === 'irmerveilkanku@gmail.com') {
          setCurrentUser({
              id: userId,
              email: email,
              name: metadata?.full_name || 'Super Admin',
              role: 'superadmin',
              city: 'Kinshasa',
              phoneNumber: metadata?.phone_number
          });
          setLoading(false);
          return;
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
          console.warn("Erreur lecture profil (403/Offline):", error.message);
          setIsOfflineMode(true);
      }

      // Si pas de profil ou erreur, création profil par défaut
      if (!profile) {
        console.log("Profil introuvable, création du profil par défaut...");
        
        const pendingAuthDataStr = localStorage.getItem('dashmeals_pending_auth');
        const pendingAuthData = pendingAuthDataStr ? JSON.parse(pendingAuthDataStr) : null;
        if (pendingAuthData) localStorage.removeItem('dashmeals_pending_auth');

        const defaultProfile = {
            id: userId,
            full_name: metadata?.full_name || metadata?.name || email.split('@')[0],
            role: pendingAuthData?.role || metadata?.role || 'client', 
            city: pendingAuthData?.city || metadata?.city || 'Kinshasa',
            phone_number: metadata?.phone_number || ''
        };

        // Tentative d'insertion en base de données (avec await pour garantir la persistance si possible)
        const { error: insertError } = await supabase.from('profiles').insert(defaultProfile);
        
        if (insertError) {
            console.warn("Erreur création profil DB (Mode Offline/Memoire):", insertError.message);
            // On continue avec le profil en mémoire même si l'insert échoue
            setIsOfflineMode(true);
        }
        
        profile = defaultProfile;
      }

      if (profile) {
        let businessId = undefined;
        
        if (profile.role === 'business') {
          // Si business, on check si le resto existe
          // En mode offline/403, on ne trouvera rien, donc l'UI Business demandera de créer
          // C'est acceptable pour le mode dégradé
          const { data: resto } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();
            
          if (resto) businessId = resto.id;
        }

        setCurrentUser({
          id: userId,
          email: email,
          name: profile.full_name || 'Utilisateur',
          role: profile.role as UserRole,
          city: profile.city || 'Kinshasa',
          phoneNumber: profile.phone_number,
          businessId,
        });
      }
    } catch (error) {
      console.error("Erreur critique profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`*, menu_items (*)`);

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedRestaurants: Restaurant[] = data.map((r: any) => ({
          id: r.id,
          ownerId: r.owner_id,
          type: r.type,
          name: r.name,
          description: r.description,
          latitude: r.latitude,
          longitude: r.longitude,
          city: r.city || 'Kinshasa',
          isOpen: r.is_open,
          rating: r.rating,
          reviewCount: r.review_count,
          preparationTime: r.preparation_time,
          estimatedDeliveryTime: r.estimated_delivery_time || 20,
          deliveryAvailable: r.delivery_available,
          coverImage: r.cover_image || 'https://picsum.photos/800/600?grayscale',
          menu: (r.menu_items || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: Number(m.price) || 0,
            image: m.image,
            category: m.category,
            isAvailable: m.is_available
          }))
        }));
        setRestaurants(mappedRestaurants);
        setIsOfflineMode(false); // Si ça marche, on n'est pas hors ligne
      } else {
        // DB vide ou connectée mais pas de données
        // On pourrait laisser vide, mais pour la démo on remet les Mocks si vide
        if (data && data.length === 0) {
             console.log("DB vide, chargement Mocks...");
             setRestaurants(MOCK_RESTAURANTS);
        }
      }
    } catch (err) {
      console.warn("Erreur chargement restaurants (403 probable). Utilisation des données MOCK.");
      setRestaurants(MOCK_RESTAURANTS);
      setIsOfflineMode(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleUpdateRestaurant = async (updatedResto: Restaurant) => {
    // Mise à jour de l'état local uniquement pour éviter les conflits et la latence
    setRestaurants(prev => prev.map(r => r.id === updatedResto.id ? updatedResto : r));
    // Nous ne rappelons PAS fetchRestaurants() ici pour laisser l'UI fluide
    // La prochaine visite ou refresh chargera les données DB.
  };

  // Fonction pour force la création du restaurant si l'automatisme a échoué
  const handleManualRestaurantCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreationLoading(true);

    const newRestaurantPayload = {
        owner_id: currentUser.id,
        name: newRestoName || "Mon Restaurant",
        type: newRestoType,
        city: currentUser.city || 'Kinshasa',
        description: `Bienvenue chez ${newRestoName}`,
        latitude: -4.325 + (Math.random() * 0.01), // Random pos near center
        longitude: 15.322 + (Math.random() * 0.01),
        is_open: true,
        preparation_time: 30,
        estimated_delivery_time: 30,
        cover_image: 'https://picsum.photos/800/600?food'
    };

    try {
        // 1. Tenter l'insertion DB
        const { data, error } = await supabase
            .from('restaurants')
            .insert(newRestaurantPayload)
            .select()
            .single();

        if (error) throw error;

        // 2. Si succès, recharger
        await fetchRestaurants();
    } catch (err: any) {
        console.warn("Erreur création DB (Mode Offline activé):", err.message);
        
        // 3. Fallback Mode Offline / Démo
        const mockResto: Restaurant = {
            id: `temp-${Date.now()}`,
            ownerId: currentUser.id,
            name: newRestoName || "Mon Restaurant (Mode Démo)",
            type: newRestoType,
            city: currentUser.city || 'Kinshasa',
            description: "Restaurant créé en mode démonstration.",
            latitude: -4.325,
            longitude: 15.322,
            isOpen: true,
            rating: 5.0,
            reviewCount: 0,
            preparationTime: 30,
            estimatedDeliveryTime: 30,
            deliveryAvailable: true,
            coverImage: 'https://picsum.photos/800/600?food',
            menu: []
        };
        
        setRestaurants(prev => [...prev, mockResto]);
        setIsOfflineMode(true);
    } finally {
        setCreationLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 dark:border-brand-400"></div>
      </div>
    );
  }

  const handleManualLogin = (user: User) => {
    setCurrentUser(user);
    setIsOfflineMode(true);
  };

  // 1. Not Logged In -> Show Auth
  if (!currentUser) {
    return (
      <>
        {!isSupabaseReachable && (
          <div className="bg-red-600 text-white p-3 text-center text-sm font-bold sticky top-0 z-[100] flex items-center justify-center">
            <AlertTriangle size={18} className="mr-2" />
            Connexion Supabase impossible. L'application fonctionne en mode dégradé (Mocks).
          </div>
        )}
        <AuthScreen onLogin={handleManualLogin} isSupabaseReachable={isSupabaseReachable} />
      </>
    );
  }

  // Banner component
  const OfflineBanner = () => (!isSupabaseReachable) ? (
    <div className="bg-red-600 text-white text-xs font-bold px-4 py-1 text-center flex justify-center items-center sticky top-0 z-50">
        <AlertTriangle size={14} className="mr-2" />
        Erreur de connexion Supabase (Fetch Failed)
    </div>
  ) : null;

  // 2. Logged in as SuperAdmin
  if (currentUser.role === 'superadmin') {
      return (
        <SuperAdminDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          font={font}
          setFont={setFont}
        />
      );
  }

  // 3. Logged in as Business
  if (currentUser.role === 'business') {
    const myRestaurant = restaurants.find(r => r.ownerId === currentUser.id);
    
    // CAS CRITIQUE : L'utilisateur est Business mais n'a pas de restaurant (Echec initialisation)
    if (!myRestaurant) {
         return (
             <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                 <OfflineBanner />
                 
                 <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                     <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Store size={32} />
                     </div>
                     
                     <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Finalisation</h2>
                     <p className="text-gray-500 dark:text-gray-400 mb-6">Nous devons configurer votre établissement pour continuer.</p>
                     
                     <form onSubmit={handleManualRestaurantCreation} className="space-y-4 text-left">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Nom du restaurant</label>
                            <input 
                                type="text"
                                required
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-gray-700 dark:text-white"
                                placeholder="Ex: Chez Maman..."
                                value={newRestoName}
                                onChange={e => setNewRestoName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Type d'établissement</label>
                            <select 
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                                value={newRestoType}
                                onChange={e => setNewRestoType(e.target.value as BusinessType)}
                            >
                                <option value="restaurant">Restaurant</option>
                                <option value="snack">Snack / Fast Food</option>
                                <option value="bar">Bar / Lounge</option>
                                <option value="terrasse">Terrasse</option>
                            </select>
                        </div>

                        <button 
                            type="submit"
                            disabled={creationLoading}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg flex justify-center items-center mt-4"
                        >
                            {creationLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>Créer mon espace <ArrowRight size={18} className="ml-2"/></>
                            )}
                        </button>
                     </form>
                     
                     <button onClick={handleLogout} className="mt-6 text-gray-400 text-sm hover:text-red-500 underline">
                         Annuler et se déconnecter
                     </button>
                 </div>
             </div>
         )
    }
    
    return (
      <>
        <OfflineBanner />
        <BusinessDashboard 
            user={currentUser} 
            restaurant={myRestaurant} 
            onUpdateRestaurant={handleUpdateRestaurant}
            onLogout={handleLogout}
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
            font={font}
            setFont={setFont}
        />
      </>
    );
  }

  // 3. Logged in as Client
  return (
    <>
      <OfflineBanner />
      <CustomerView 
        user={currentUser}
        allRestaurants={restaurants}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        font={font}
        setFont={setFont}
      />
    </>
  );
}

export default App;