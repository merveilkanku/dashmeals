import React, { useState, useEffect } from 'react';
import { supabase, isDefaultProject } from '../lib/supabase';
import { User, UserRole, BusinessType } from '../types';
import { CITIES_RDC, APP_LOGO_URL } from '../constants';
import { User as UserIcon, Store, AlertCircle, MapPin, Mail, Phone } from 'lucide-react';

interface Props {
  onLogin: (user: User, businessData?: any) => void;
  isSupabaseReachable?: boolean;
}

export const AuthScreen: React.FC<Props> = ({ onLogin, isSupabaseReachable = true }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Kinshasa');
  const [availableCities, setAvailableCities] = useState<string[]>(CITIES_RDC);
  
  // Business Specific States
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [businessName, setBusinessName] = useState('');

  // Fetch cities from DB on mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('name')
          .eq('is_active', true)
          .order('name');
        
        if (!error && data && data.length > 0) {
          setAvailableCities(data.map(c => c.name));
        }
      } catch (err) {
        console.warn("Could not fetch cities from DB, using defaults");
      }
    };
    fetchCities();
  }, []);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem('dashmeals_pending_auth', JSON.stringify({ 
          role, 
          city,
      }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("OAuth Error:", err);
      setError(err.message || "Erreur de connexion sociale");
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: 'client' | 'business') => {
    const demoUser: User = {
      id: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      name: 'Utilisateur Démo',
      role: demoRole,
      city: 'Kinshasa',
      businessId: demoRole === 'business' ? 'resto-1' : undefined
    };
    onLogin(demoUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // SIGN UP
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // On sauvegarde aussi les infos dans les métadonnées comme backup
            data: { 
                full_name: name, 
                role: role, 
                city: city, 
                phone_number: phone 
            }, 
          }
        });

        if (authError) throw authError;
        
        if (authData.user) {
          // 2. Create Profile in DB using UPSERT to prevent conflicts
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            role: role,
            full_name: name,
            city: city,
            phone_number: phone
          });
          
          if (profileError) {
             console.warn("Avertissement création profil (Non bloquant):", profileError);
             // On ne throw PAS d'erreur ici car l'utilisateur est déjà créé dans Auth
             // et l'application peut fonctionner avec les métadonnées ou le mode offline
          }

          // 3. If Business, Create Restaurant
          if (role === 'business') {
            if (!businessName.trim()) throw new Error("Le nom du commerce est requis");

            const { error: restoError } = await supabase.from('restaurants').insert({
              owner_id: authData.user.id,
              name: businessName,
              type: businessType,
              city: city, 
              latitude: -4.301 + (Math.random() - 0.5) * 0.02, 
              longitude: 15.301 + (Math.random() - 0.5) * 0.02,
              description: `Bienvenue chez ${businessName}`,
              cover_image: `https://picsum.photos/800/600?random=${Date.now()}`,
              preparation_time: 30,
              estimated_delivery_time: 30,
              phone_number: phone // Set restaurant phone number to owner's phone initially
            });
            if (restoError) {
                console.warn("Restaurant creation warning:", restoError);
            }
          }
          
          // Si inscription réussie mais pas de session auto (ex: email confirm), on prévient
          if (!authData.session) {
              setError("Compte créé ! Veuillez vérifier vos emails pour confirmer votre adresse avant de vous connecter.");
              setIsLogin(true);
              setLoading(false);
              return;
          }
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let message = err.message || "Une erreur est survenue";
      const lowerMsg = message.toLowerCase();
      
      // MAPPING DES ERREURS SUPABASE
      if (lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests")) {
        message = "Trop de tentatives de connexion. Pour votre sécurité, veuillez patienter quelques minutes avant de réessayer.";
      } else if (lowerMsg.includes("invalid login credentials")) {
        message = "Identifiants incorrects. Si vous n'avez pas de compte, inscrivez-vous ou utilisez le Mode Démo.";
      } else if (lowerMsg.includes("email not confirmed")) {
        message = "Votre adresse email n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception (et vos spams).";
      } else if (lowerMsg.includes("user already registered") || lowerMsg.includes("already exists")) {
        message = "Cette adresse email est déjà associée à un compte. Essayez de vous connecter.";
      } else if (lowerMsg.includes("password should be at least")) {
        message = "Le mot de passe est trop court. Il doit contenir au moins 6 caractères.";
      } else if (lowerMsg.includes("fetch failed") || lowerMsg.includes("network request failed")) {
        message = "Impossible de contacter le serveur d'authentification (Supabase). Vérifiez votre connexion internet ou la configuration de votre projet Supabase.";
      }

      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-brand-600 p-6 text-center flex flex-col items-center relative">
          <div className="absolute top-4 right-4 bg-white p-3 rounded-xl shadow-lg animate-float">
             <img src={APP_LOGO_URL} alt="DashMeals Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="mt-8">
             <h1 className="text-3xl font-black text-white tracking-tight">DashMeals <span className="text-brand-200">RDC</span></h1>
             <p className="text-brand-100 mt-2 font-medium">La plateforme gourmande de Kinshasa</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            type="button"
            onClick={() => setRole('client')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center ${role === 'client' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500'}`}
          >
            <UserIcon size={18} className="mr-2" />
            Client
          </button>
          <button 
            type="button"
            onClick={() => setRole('business')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center ${role === 'business' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500'}`}
          >
            <Store size={18} className="mr-2" />
            Entreprise
          </button>
        </div>

        <div className="p-6 pb-2">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
                {isLogin ? 'Connexion' : 'Créer un compte'} {role === 'business' ? 'Partenaire' : ''}
            </h2>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                <button 
                    type="button"
                    disabled={isDefaultProject}
                    onClick={() => handleOAuthLogin('google')}
                    className={`flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg transition-colors font-bold text-sm ${isDefaultProject ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    title={isDefaultProject ? "Nécessite votre propre projet Supabase" : "Connexion avec Google"}
                >
                    Google
                </button>
                <button 
                    type="button"
                    disabled={isDefaultProject}
                    onClick={() => handleOAuthLogin('facebook')}
                    className={`flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg transition-colors font-bold text-sm ${isDefaultProject ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]'}`}
                    title={isDefaultProject ? "Nécessite votre propre projet Supabase" : "Connexion avec Facebook"}
                >
                    Facebook
                </button>
            </div>
            
            {isDefaultProject ? (
                <div className="mb-6 text-center">
                    <p className="text-[10px] text-gray-500 bg-gray-100 p-2 rounded border border-gray-200 inline-block">
                        ⚠️ Connexion sociale désactivée en mode démo.<br/>
                        Configurez votre projet Supabase pour l'activer.
                    </p>
                </div>
            ) : (
                <div className="mb-6 text-center">
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-tight">
                        Si vous rencontrez une erreur 403, ajoutez cette URL aux redirections autorisées dans Supabase :<br/>
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600 select-all mt-1 block break-all">{window.location.origin}</code>
                    </p>
                </div>
            )}

            <div className="relative flex items-center justify-center mb-6">
                <hr className="w-full border-gray-300" />
                <span className="absolute bg-white px-3 text-xs text-gray-500 font-medium">OU AVEC EMAIL</span>
            </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm animate-pulse flex items-start shadow-sm">
                 <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                 <span className="font-medium leading-tight">{error}</span>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Votre Nom complet</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-black bg-white placeholder:text-gray-400"
                placeholder="Ex: Jean K."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

           {/* Phone Number Field */}
           {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Numéro de téléphone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="tel" 
                    required 
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-black bg-white placeholder:text-gray-400"
                    placeholder="Ex: 0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* City Selection for both Roles during Signup */}
          {!isLogin && (
             <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center">
                  <MapPin size={12} className="mr-1"/> 
                  {role === 'business' ? 'Ville du commerce' : 'Votre Ville'}
                </label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-gray-900"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {availableCities.map(c => (
                    <option key={c} value={c} className="text-gray-900">{c}</option>
                  ))}
                </select>
             </div>
          )}

          {/* Business Specific Fields during Signup */}
          {!isLogin && role === 'business' && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center"><Store size={14} className="mr-2"/> Infos Établissement</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom du commerce</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                  placeholder="Ex: Chez Ntemba"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                >
                  <option value="restaurant" className="text-gray-900">Restaurant</option>
                  <option value="bar" className="text-gray-900">Bar / Lounge</option>
                  <option value="terrasse" className="text-gray-900">Terrasse</option>
                  <option value="snack" className="text-gray-900">Snack / Fast-food</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-black bg-white placeholder:text-gray-400"
              placeholder="Ex: nom@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Mot de passe</label>
            <input 
              type="password" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-black bg-white placeholder:text-gray-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 mt-4 flex justify-center items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>

          {(isDefaultProject || !isSupabaseReachable || error) && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs text-orange-800 mb-2 font-medium text-center">
                {!isSupabaseReachable 
                  ? "Le serveur est injoignable. Utiliser le mode démo ?" 
                  : "Pour tester sans compte, utilisez le mode démo."}
              </p>
              <button 
                type="button"
                onClick={() => handleDemoLogin(role as any)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors"
              >
                Continuer en Mode Démo
              </button>
            </div>
          )}
        </form>

        <div className="bg-gray-50 p-4 text-center border-t">
          <button 
            type="button"
            onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
            }}
            className="text-sm text-brand-600 font-bold hover:underline"
          >
            {isLogin ? "Pas de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
};