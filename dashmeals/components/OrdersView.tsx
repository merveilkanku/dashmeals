import React, { useState } from 'react';
import { Receipt, ShoppingBag, Phone, MessageSquare, CheckCircle2, Circle, Bike, ChefHat, Clock, Camera, Star, X } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  orders: Order[];
  onChat: (order: Order) => void;
  onBrowse: () => void;
  onOrderUpdated?: () => void; // Callback to refresh orders
}

export const OrdersView: React.FC<Props> = ({ orders, onChat, onBrowse, onOrderUpdated }) => {
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-gray-100 text-gray-700';
        case 'preparing': return 'bg-yellow-100 text-yellow-800';
        case 'ready': return 'bg-blue-100 text-blue-800';
        case 'delivering': return 'bg-orange-100 text-orange-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return 'En attente';
        case 'preparing': return 'En cuisine';
        case 'ready': return 'Prêt';
        case 'delivering': return 'En livraison';
        case 'completed': return 'Livré';
        case 'cancelled': return 'Annulé';
        default: return status;
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmingOrder) return;
      setIsSubmitting(true);

      try {
          let proofUrl = null;

          // 1. Upload proof if exists
          if (proofFile) {
              const fileExt = proofFile.name.split('.').pop();
              const fileName = `proof_${confirmingOrder.id}_${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('images').upload(fileName, proofFile);
              
              if (uploadError) {
                  console.error("Upload proof failed:", uploadError);
                  // Continue anyway
              } else {
                  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                  proofUrl = publicUrl;
              }
          }

          // 2. Update Order Status
          const { error: updateError } = await supabase
              .from('orders')
              .update({ 
                  status: 'completed',
                  proof_url: proofUrl
              })
              .eq('id', confirmingOrder.id);

          if (updateError) throw updateError;

          // 3. Insert Review
          const { error: reviewError } = await supabase
              .from('reviews')
              .insert({
                  order_id: confirmingOrder.id,
                  restaurant_id: confirmingOrder.restaurantId,
                  user_id: confirmingOrder.userId,
                  rating: rating,
                  comment: comment
              });

          if (reviewError) console.warn("Review insert failed:", reviewError);

          // 4. Close and Refresh
          setConfirmingOrder(null);
          setProofFile(null);
          setComment('');
          setRating(5);
          if (onOrderUpdated) onOrderUpdated();

      } catch (err) {
          console.error("Error confirming receipt:", err);
          alert("Une erreur est survenue lors de la confirmation.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // Composant interne pour une étape de la timeline
  const TimelineStep = ({ 
      active, 
      completed, 
      icon: Icon, 
      title, 
      isLast = false 
  }: { active: boolean, completed: boolean, icon: any, title: string, isLast?: boolean }) => (
      <div className="flex relative pb-6">
          {!isLast && (
              <div className={`absolute left-3 top-6 bottom-0 w-0.5 ${completed ? 'bg-brand-500' : 'bg-gray-200'}`}></div>
          )}
          <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 mr-4 flex-shrink-0 ${
              active || completed 
              ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-200' 
              : 'bg-white border-gray-300 text-gray-300'
          }`}>
              <Icon size={12} />
          </div>
          <div>
              <p className={`text-xs font-bold ${active || completed ? 'text-gray-900' : 'text-gray-400'}`}>{title}</p>
              {active && <p className="text-[10px] text-brand-600 font-medium animate-pulse">En cours...</p>}
          </div>
      </div>
  );

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-20 relative">
        <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center">
            <Receipt className="mr-2 text-brand-600"/> Historique
        </h2>
        {orders.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
                <ShoppingBag size={48} className="mx-auto mb-2 opacity-20"/>
                <p>Aucune commande effectuée.</p>
                <button onClick={onBrowse} className="mt-4 text-brand-600 font-bold underline">Commander un plat</button>
            </div>
        ) : (
            <div className="space-y-6">
                {orders.map(order => {
                   const isCompleted = order.status === 'completed';
                   const isCancelled = order.status === 'cancelled';
                   
                   // Déterminer l'état pour la timeline
                   const s = order.status;
                   const isPending = s === 'pending';
                   const isPrep = s === 'preparing';
                   const isReady = s === 'ready';
                   const isDelivering = s === 'delivering';
                   
                   // Logique un peu verbeuse pour la démo, mais claire
                   const step1Complete = !isPending && !isCancelled;
                   const step2Complete = (isReady || isDelivering || isCompleted) && !isCancelled;
                   const step3Complete = (isDelivering || isCompleted) && !isCancelled;
                   const step4Complete = isCompleted && !isCancelled;

                   return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header de la carte */}
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{order.restaurant?.name || 'Restaurant inconnu'}</h3>
                                    <p className="text-xs text-gray-400">Commande #{order.id.slice(0,6)} • {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                            </div>
                        </div>

                        {/* Contenu principal */}
                        <div className="p-4">
                            {/* TIMELINE DE SUIVI (Seulement si pas annulé) */}
                            {!isCancelled && !isCompleted && (
                                <div className="mb-6 pl-2 mt-2">
                                    <TimelineStep 
                                        active={isPending} 
                                        completed={step1Complete} 
                                        icon={Clock} 
                                        title="Commande reçue" 
                                    />
                                    <TimelineStep 
                                        active={isPrep} 
                                        completed={step2Complete} 
                                        icon={ChefHat} 
                                        title="Préparation en cuisine" 
                                    />
                                    <TimelineStep 
                                        active={isReady || isDelivering} 
                                        completed={step3Complete} 
                                        icon={Bike} 
                                        title="En route vers vous" 
                                    />
                                    <TimelineStep 
                                        active={false} 
                                        completed={step4Complete} 
                                        icon={CheckCircle2} 
                                        title="Livré et savouré" 
                                        isLast
                                    />
                                </div>
                            )}

                            {/* Liste des articles simplifiée */}
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center mb-1 last:mb-0">
                                        <div className="flex items-center text-gray-600">
                                            <span className="font-bold mr-2 text-xs text-gray-400">x{item.quantity}</span>
                                            <span>{item.name}</span>
                                        </div>
                                        <span className="font-medium text-gray-800">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-600">Total</span>
                                    <span className="font-black text-brand-600 text-lg">${(order.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            {!isCompleted && !isCancelled && (
                                <div className="space-y-3">
                                    {/* Bouton de confirmation de réception (Visible seulement si 'delivering' ou 'ready') */}
                                    {(isDelivering || isReady) && (
                                        <button 
                                            onClick={() => setConfirmingOrder(order)}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 animate-pulse hover:animate-none transition-transform active:scale-95 flex items-center justify-center"
                                        >
                                            <CheckCircle2 className="mr-2" size={20}/> Confirmer la réception
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => window.open(`tel:${order.restaurant?.phone_number || '+243999999999'}`)} 
                                            className="flex items-center justify-center py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                                        >
                                            <Phone size={16} className="mr-2" /> Appeler
                                        </button>
                                        <button 
                                            onClick={() => onChat(order)} 
                                            className="flex items-center justify-center py-3 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95 relative overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            <MessageSquare size={16} className="mr-2 relative z-10" /> 
                                            <span className="relative z-10">Discuter avec le resto</span>
                                        </button>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg flex items-start space-x-3">
                                        <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 mt-0.5">
                                            <MessageSquare size={12} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-800">Besoin d'aide ?</p>
                                            <p className="text-[10px] text-blue-600 leading-tight mt-0.5">
                                                Vous pouvez contacter le restaurant directement pour toute modification ou question sur votre commande.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {isCompleted && (
                                <div className="text-center bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p className="text-green-800 font-bold text-sm flex items-center justify-center">
                                        <CheckCircle2 size={16} className="mr-2"/> Commande terminée
                                    </p>
                                    <button onClick={onBrowse} className="text-xs text-green-700 underline mt-1">Commander à nouveau</button>
                                </div>
                            )}
                        </div>
                    </div>
                   );
                })}
            </div>
        )}

        {/* Modal de Confirmation */}
        {confirmingOrder && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmingOrder(null)}></div>
                <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
                    <div className="bg-brand-600 p-4 text-white text-center relative">
                        <button onClick={() => setConfirmingOrder(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                            <X size={20} />
                        </button>
                        <CheckCircle2 size={48} className="mx-auto mb-2 text-green-300" />
                        <h3 className="text-xl font-black">Commande Reçue ?</h3>
                        <p className="text-brand-100 text-xs">Aidez-nous à améliorer le service</p>
                    </div>
                    
                    <form onSubmit={handleConfirmReceipt} className="p-6 space-y-4">
                        {/* Note */}
                        <div className="text-center">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Notez votre expérience</label>
                            <div className="flex justify-center space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star} 
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                        <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Commentaire */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Un commentaire ? (Optionnel)</label>
                            <textarea 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                rows={3}
                                placeholder="C'était délicieux..."
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                            />
                        </div>

                        {/* Preuve Photo */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Photo du plat (Preuve)</label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                {proofFile ? (
                                    <div className="text-center">
                                        <p className="text-green-600 font-bold text-xs truncate max-w-[200px]">{proofFile.name}</p>
                                        <p className="text-gray-400 text-[10px]">Cliquez pour changer</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <Camera size={24} className="mx-auto mb-1" />
                                        <p className="text-xs">Ajouter une photo</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                            </label>
                        </div>

                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-brand-700 transition-colors flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Confirmer la réception'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};