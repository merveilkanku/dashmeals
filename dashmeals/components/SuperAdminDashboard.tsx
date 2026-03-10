import React, { useState, useEffect } from 'react';
import { 
  Users, Store, ShoppingBag, DollarSign, Activity, 
  Search, CheckCircle, XCircle, LogOut, Shield, 
  Trash2, AlertTriangle, Database, Type, Sun, Moon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { APP_LOGO_URL } from '../constants';
import { User, Restaurant, Order, Theme, Language, AppFont } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
  theme?: Theme;
  setTheme?: (t: Theme) => void;
  language?: Language;
  setLanguage?: (l: Language) => void;
  font?: AppFont;
  setFont?: (f: AppFont) => void;
}

type AdminView = 'overview' | 'users' | 'restaurants' | 'products' | 'verifications';

export const SuperAdminDashboard: React.FC<Props> = ({ user, onLogout, theme, setTheme, language, setLanguage, font, setFont }) => {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingVerifications: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeView === 'users') fetchUsers();
    if (activeView === 'restaurants') fetchRestaurants();
    if (activeView === 'verifications') fetchPendingVerifications();
  }, [activeView]);

  const fetchStats = async () => {
    // In a real app, these would be optimized count queries
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: restoCount } = await supabase.from('restaurants').select('*', { count: 'exact', head: true });
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: verificationCount } = await supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
    
    // Mock revenue for now as it requires summing
    setStats({
      totalUsers: userCount || 0,
      totalRestaurants: restoCount || 0,
      totalOrders: orderCount || 0,
      totalRevenue: (orderCount || 0) * 25, // Avg order value mock
      pendingVerifications: verificationCount || 0
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (data) setRestaurants(data.map((r: any) => ({
        ...r,
        ownerId: r.owner_id,
        reviewCount: r.review_count,
        preparationTime: r.preparation_time,
        estimatedDeliveryTime: r.estimated_delivery_time,
        deliveryAvailable: r.delivery_available,
        coverImage: r.cover_image,
        menu: []
    })));
    setLoading(false);
  };

  const fetchPendingVerifications = async () => {
    setLoading(true);
    const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
        
    if (data) setPendingVerifications(data.map((r: any) => ({
        ...r,
        ownerId: r.owner_id,
        reviewCount: r.review_count,
        preparationTime: r.preparation_time,
        estimatedDeliveryTime: r.estimated_delivery_time,
        deliveryAvailable: r.delivery_available,
        coverImage: r.cover_image,
        verificationStatus: r.verification_status,
        verificationDocs: r.verification_docs,
        verificationPaymentStatus: r.verification_payment_status,
        menu: []
    })));
    setLoading(false);
  };

  const handleVerification = async (restoId: string, status: 'verified' | 'rejected') => {
      if (!confirm(`Confirmer le statut : ${status} ?`)) return;
      
      const { error } = await supabase.from('restaurants').update({
          verification_status: status,
          is_verified: status === 'verified'
      }).eq('id', restoId);
      
      if (error) {
          alert("Erreur mise à jour");
          console.error(error);
      } else {
          alert("Statut mis à jour !");
          fetchPendingVerifications();
          fetchStats();
      }
  };

  const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
      // This assumes we added an is_verified column. If not, we just mock it locally for UI demo
      // await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId);
      alert(`Compte utilisateur ${userId} ${currentStatus ? 'invalidé' : 'validé'} (Simulation)`);
      fetchUsers();
  };

  const deleteUser = async (userId: string) => {
      if(!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
      // await supabase.auth.admin.deleteUser(userId); // Requires service role key usually
      alert("Suppression utilisateur simulée (nécessite clé service role)");
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <Users size={24} />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">Utilisateurs</span>
        </div>
        <p className="text-3xl font-black text-gray-900">{stats.totalUsers}</p>
        <p className="text-xs text-green-500 font-bold mt-2 flex items-center"><Activity size={12} className="mr-1"/> +12% ce mois</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
            <Store size={24} />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">Restaurants</span>
        </div>
        <p className="text-3xl font-black text-gray-900">{stats.totalRestaurants}</p>
        <p className="text-xs text-gray-400 font-bold mt-2">Actifs sur la plateforme</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <ShoppingBag size={24} />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">Commandes</span>
        </div>
        <p className="text-3xl font-black text-gray-900">{stats.totalOrders}</p>
        <p className="text-xs text-green-500 font-bold mt-2 flex items-center"><Activity size={12} className="mr-1"/> +5% aujourd'hui</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-100 p-3 rounded-xl text-green-600">
            <DollarSign size={24} />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">Revenus (Est.)</span>
        </div>
        <p className="text-3xl font-black text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
        <p className="text-xs text-gray-400 font-bold mt-2">Volume total estimé</p>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg text-gray-800">Gestion Utilisateurs</h3>
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Rechercher..." className="w-full md:w-64 pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Utilisateur</th>
                        <th className="px-6 py-4">Rôle</th>
                        <th className="px-6 py-4">Ville</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{u.full_name || 'Sans nom'}</div>
                                <div className="text-xs text-gray-400">{u.id.slice(0, 8)}...</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{u.city || '-'}</td>
                            <td className="px-6 py-4">
                                <span className="flex items-center text-green-600 font-bold text-xs">
                                    <CheckCircle size={14} className="mr-1" /> Vérifié
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => toggleUserVerification(u.id, true)} className="text-gray-400 hover:text-brand-600 transition-colors" title="Vérifier/Bannir">
                                    <Shield size={18} />
                                </button>
                                <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
            {users.map(u => (
                <div key={u.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="font-bold text-gray-900">{u.full_name || 'Sans nom'}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.role}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                        <div className="flex items-center">
                            <span className="text-gray-400 mr-1">Ville:</span> {u.city || '-'}
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-400 mr-1">ID:</span> {u.id.slice(0, 8)}...
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <span className="flex items-center text-green-600 font-bold text-xs">
                            <CheckCircle size={14} className="mr-1" /> Vérifié
                        </span>
                        <div className="flex space-x-3">
                            <button onClick={() => toggleUserVerification(u.id, true)} className="p-2 bg-white rounded-lg text-gray-400 hover:text-brand-600 shadow-sm border border-gray-200">
                                <Shield size={16} />
                            </button>
                            <button onClick={() => deleteUser(u.id)} className="p-2 bg-white rounded-lg text-gray-400 hover:text-red-500 shadow-sm border border-gray-200">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderRestaurants = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">Gestion Restaurants</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Restaurant</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Ville</th>
                        <th className="px-6 py-4">Note</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {restaurants.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <img src={r.coverImage} className="w-10 h-10 rounded-lg object-cover mr-3" alt="" />
                                    <div>
                                        <div className="font-bold text-gray-900">{r.name}</div>
                                        <div className="text-xs text-gray-400">{r.isOpen ? 'Ouvert' : 'Fermé'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium uppercase">{r.type}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{r.city}</td>
                            <td className="px-6 py-4 font-bold text-orange-500">{r.rating} ★</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button className="text-gray-400 hover:text-blue-600 transition-colors" title="Voir Menu">
                                    <Search size={18} />
                                </button>
                                <button className="text-gray-400 hover:text-red-500 transition-colors" title="Suspendre">
                                    <AlertTriangle size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderVerifications = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">Demandes de Vérification</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Restaurant</th>
                        <th className="px-6 py-4">Documents</th>
                        <th className="px-6 py-4">Paiement (5$)</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {pendingVerifications.length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-gray-500">Aucune demande en attente.</td></tr>
                    ) : (
                        pendingVerifications.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{r.name}</div>
                                    <div className="text-xs text-gray-400">{r.city}</div>
                                </td>
                                <td className="px-6 py-4 space-y-1">
                                    <div className="text-xs text-gray-600">
                                        <span className="font-bold text-gray-500">RCCM:</span> {r.verificationDocs?.registryNumber || 'N/A'}
                                    </div>
                                    {r.verificationDocs?.idCardUrl && (
                                        <a href={r.verificationDocs.idCardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center">
                                            <Search size={12} className="mr-1"/> Voir ID Card
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {r.verificationPaymentStatus === 'paid' ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold flex items-center w-fit">
                                            <CheckCircle size={12} className="mr-1"/> Payé
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold flex items-center w-fit">
                                            <XCircle size={12} className="mr-1"/> Non Payé
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button 
                                        onClick={() => handleVerification(r.id, 'verified')}
                                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700"
                                    >
                                        Valider
                                    </button>
                                    <button 
                                        onClick={() => handleVerification(r.id, 'rejected')}
                                        className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200"
                                    >
                                        Rejeter
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
                <div className="bg-white p-1 rounded-lg shadow-sm shadow-brand-900/50">
                    <img src={APP_LOGO_URL} alt="DashMeals" className="h-8 w-auto object-contain" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-white leading-none">DashMeals</h1>
                    <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Admin</span>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">Control Center v1.0</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setActiveView('overview')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === 'overview' ? 'bg-brand-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'}`}>
                <Activity size={20} /> <span>Vue d'ensemble</span>
            </button>
            <button onClick={() => setActiveView('users')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === 'users' ? 'bg-brand-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'}`}>
                <Users size={20} /> <span>Utilisateurs</span>
            </button>
            <button onClick={() => setActiveView('restaurants')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === 'restaurants' ? 'bg-brand-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'}`}>
                <Store size={20} /> <span>Restaurants</span>
            </button>
            <button onClick={() => setActiveView('verifications')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === 'verifications' ? 'bg-brand-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'}`}>
                <Shield size={20} /> <span>Vérifications</span>
                {stats.pendingVerifications > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.pendingVerifications}</span>}
            </button>
            <button onClick={() => setActiveView('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === 'products' ? 'bg-brand-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-800'}`}>
                <Database size={20} /> <span>Produits & Menus</span>
            </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
            <div className="mb-4">
                <label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold">Apparence</label>
                <div className="flex bg-gray-800 rounded-lg p-1">
                    <button 
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${theme === 'light' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Sun size={14} className="mr-1"/> Clair
                    </button>
                    <button 
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Moon size={14} className="mr-1"/> Sombre
                    </button>
                </div>
            </div>

            {font && setFont && (
                <div className="mb-4">
                    <label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold">Police</label>
                    <select 
                        value={font} 
                        onChange={(e) => setFont(e.target.value as AppFont)}
                        className="w-full bg-gray-800 text-gray-300 text-xs p-2 rounded-lg border border-gray-700 outline-none focus:border-brand-500"
                    >
                        <option value="inter">Inter (Défaut)</option>
                        <option value="roboto">Roboto</option>
                        <option value="opensans">Open Sans</option>
                        <option value="lato">Lato</option>
                        <option value="montserrat">Montserrat</option>
                    </select>
                </div>
            )}
            <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 text-red-400 hover:bg-red-900/20 p-2 rounded-lg transition-colors font-medium text-sm">
                <LogOut size={16} /> <span>Déconnexion</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
         <header className="flex justify-between items-center mb-8">
             <div>
                 <h2 className="text-2xl font-bold text-gray-900">
                     {activeView === 'overview' && 'Tableau de bord'}
                     {activeView === 'users' && 'Utilisateurs'}
                     {activeView === 'restaurants' && 'Restaurants Partenaires'}
                     {activeView === 'products' && 'Gestion des Produits'}
                 </h2>
                 <p className="text-gray-500 text-sm">Bienvenue, {user.name}</p>
             </div>
             <div className="flex items-center space-x-4">
                 <div className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                     <CheckCircle size={14} className="mr-1" /> Système Opérationnel
                 </div>
             </div>
         </header>

         {activeView === 'overview' && renderOverview()}
         {activeView === 'users' && renderUsers()}
         {activeView === 'restaurants' && renderRestaurants()}
         {activeView === 'verifications' && renderVerifications()}
         {activeView === 'products' && (
             <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                 <Database className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                 <h3 className="text-lg font-bold text-gray-900">Gestion des Produits</h3>
                 <p className="text-gray-500">Sélectionnez un restaurant pour voir ses produits.</p>
             </div>
         )}
      </main>
    </div>
  );
};
