import React, { useEffect, useState } from 'react';
import { APP_LOGO_URL } from '../constants';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-brand-600 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative w-full h-full">
        <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
            alt="DashMeals Splash" 
            className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end pb-20">
            <div className="bg-white p-6 rounded-3xl shadow-2xl mb-8 animate-bounce">
                <img src={APP_LOGO_URL} alt="DashMeals Logo" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2">
                Dash<span className="text-brand-500">Meals</span>
            </h1>
            <p className="text-white/90 text-lg font-medium tracking-widest uppercase">Rapide. Frais. Facile.</p>
            <div className="mt-8 w-16 h-1 bg-brand-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
