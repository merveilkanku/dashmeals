import React from 'react';
import { X, Trash2, ShoppingBag, CreditCard, Banknote } from 'lucide-react';
import { CartItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onCheckout: () => void;
  total: number;
  isLoading?: boolean;
}

export const CartDrawer: React.FC<Props> = ({ isOpen, onClose, items, onRemove, onCheckout, total, isLoading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold flex items-center">
            <ShoppingBag className="mr-2 text-brand-600" />
            Votre Panier
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <p>Votre panier est vide.</p>
              <button onClick={onClose} className="mt-4 text-brand-600 font-medium">Retourner aux restaurants</button>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex justify-between items-center bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.restaurantName}</p>
                  <p className="text-brand-600 font-bold mt-1">${(item.price || 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">x{item.quantity}</span>
                    <button onClick={() => onRemove(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-brand-700">${(total || 0).toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col items-center justify-center p-3 border-2 border-brand-100 bg-white rounded-lg cursor-pointer hover:border-brand-500 transition-colors">
                    <Banknote className="text-green-600 mb-1" />
                    <span className="text-xs font-bold text-gray-700">Cash à la livraison</span>
                </div>
                 <div className="flex flex-col items-center justify-center p-3 border border-gray-200 bg-white rounded-lg cursor-pointer hover:border-brand-500 transition-colors opacity-60">
                    <CreditCard className="text-blue-600 mb-1" />
                    <span className="text-xs font-bold text-gray-700">Mobile Money (Bientôt)</span>
                </div>
            </div>

            <button 
              onClick={onCheckout}
              disabled={isLoading}
              className={`w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all flex justify-center items-center ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Commander maintenant'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};