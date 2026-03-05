import React from 'react';
import { Clock, Bike, Star, Footprints, Timer, Flame, Phone, MapPin, ChevronRight, CheckCircle } from 'lucide-react';
import { Restaurant } from '../types';
import { formatDistance, formatTime } from '../utils/geo';

interface Props {
  restaurant: Restaurant;
  onClick: () => void;
}

export const RestaurantCard: React.FC<Props> = ({ restaurant, onClick }) => {
  // Simulate "Popular" by taking the first 3 items from the menu
  const popularItems = restaurant.menu ? restaurant.menu.slice(0, 3) : [];

  return (
    <div 
      onClick={onClick}
      className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 cursor-pointer mb-6 transform hover:-translate-y-1"
    >
      {/* Image Header */}
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={restaurant.coverImage} 
          alt={restaurant.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
           {restaurant.isVerified && (
             <span className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg flex items-center">
               <CheckCircle size={10} className="mr-1" /> Vérifié
             </span>
           )}
           {restaurant.isOpen ? (
             <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg">
               Ouvert
             </span>
           ) : (
             <span className="bg-rose-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg">
               Fermé
             </span>
           )}
        </div>

        <div className="absolute top-3 right-3">
           <div className="flex items-center space-x-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-lg">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-black text-gray-800 dark:text-white">{restaurant.rating}</span>
            <span className="text-[10px] text-gray-400">({restaurant.reviewCount})</span>
          </div>
        </div>

        {/* Bottom Info on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div>
            <h3 className="text-xl font-black text-white leading-tight mb-0.5 drop-shadow-md">{restaurant.name}</h3>
            <div className="flex items-center text-gray-300 text-xs font-medium">
               <MapPin size={12} className="mr-1" />
               {restaurant.city} • {formatDistance(restaurant.distance)}
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-center min-w-[60px]">
             <p className="text-[10px] text-gray-300 uppercase font-bold">Livraison</p>
             <p className="text-white font-black text-sm">~{restaurant.estimatedDeliveryTime} min</p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-lg mr-3 text-orange-600 dark:text-orange-400">
               <Bike size={16} />
            </div>
            <div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Moto</p>
               <p className="text-sm font-bold text-gray-800 dark:text-white">{restaurant.timeMoto ? formatTime(restaurant.timeMoto) : '--'}</p>
            </div>
          </div>
          
          <div className="flex items-center p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg mr-3 text-blue-600 dark:text-blue-400">
               <Footprints size={16} />
            </div>
            <div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Marche</p>
               <p className="text-sm font-bold text-gray-800 dark:text-white">{restaurant.timeWalking ? formatTime(restaurant.timeWalking) : '--'}</p>
            </div>
          </div>
        </div>

        {/* Popular Items */}
        {popularItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-1 rounded-md mr-2">
                   <Flame size={12} className="text-rose-500 fill-rose-500" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Populaires</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {popularItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1.5 rounded-lg transition-colors -mx-1.5">
                   <div className="flex items-center overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded-md object-cover mr-3 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-[140px]">{item.name}</span>
                   </div>
                   <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">${(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
           <div className="flex items-center text-gray-400 text-xs font-medium">
             <Clock size={14} className="mr-1.5" />
             <span>Préparation ~{restaurant.preparationTime} min</span>
           </div>

           <div className="flex items-center space-x-2">
              {restaurant.phoneNumber && (
                <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${restaurant.phoneNumber}`;
                    }}
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                >
                    <Phone size={16} />
                </button>
              )}
              <button className="flex items-center text-brand-600 dark:text-brand-400 text-xs font-bold hover:underline">
                  Voir le menu <ChevronRight size={14} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
