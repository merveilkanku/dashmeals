import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Promotion, Restaurant } from '../types';

interface Props {
  restaurant: Restaurant;
  promotions: Promotion[];
  onClose: () => void;
  onVisitRestaurant: () => void;
  initialIndex?: number;
}

export const StoryViewer: React.FC<Props> = ({ restaurant, promotions, onClose, onVisitRestaurant, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentPromo = promotions[currentIndex];
  const DURATION = 5000; // 5 seconds per image

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      if (currentPromo && currentPromo.mediaType === 'image') {
        setProgress(old => {
          const newProgress = old + (100 / (DURATION / 50)); // Update every 50ms
          if (newProgress >= 100) {
             return 100;
          }
          return newProgress;
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, currentPromo]);

  // Watch progress to trigger next story
  useEffect(() => {
      if (progress >= 100) {
          if (currentPromo && currentPromo.mediaType === 'image') {
              nextStory();
          }
      }
  }, [progress]);

  // Handle Video Progress manually via event listeners
  const handleVideoUpdate = () => {
      if (videoRef.current) {
          const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
          setProgress(percent);
      }
  };

  const handleVideoEnd = () => {
      nextStory();
  };

  const nextStory = () => {
    if (currentIndex < promotions.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
    }
  };
  
  if (!currentPromo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Container simulating mobile screen on desktop */}
      <div className="relative w-full h-full md:w-[400px] md:h-[800px] md:rounded-2xl overflow-hidden bg-gray-900">
        
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex space-x-1 z-20">
          {promotions.map((_, idx) => (
            <div key={idx} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white transition-all duration-100 linear`}
                style={{ 
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-4 right-4 z-20 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <img src={restaurant.coverImage} className="w-8 h-8 rounded-full border-2 border-brand-500 object-cover" />
                <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{restaurant.name}</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full bg-black/20 text-white backdrop-blur-md">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center bg-black">
            {currentPromo.mediaType === 'video' ? (
                <video 
                    ref={videoRef}
                    src={currentPromo.mediaUrl} 
                    className="w-full h-full object-cover"
                    autoPlay 
                    playsInline
                    onTimeUpdate={handleVideoUpdate}
                    onEnded={handleVideoEnd}
                />
            ) : (
                <img 
                    src={currentPromo.mediaUrl} 
                    className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" 
                    alt="Story"
                />
            )}
        </div>

        {/* Click Areas for Navigation */}
        <div className="absolute inset-0 z-10 flex">
            <div className="w-1/3 h-full" onClick={prevStory}></div>
            <div className="w-2/3 h-full" onClick={nextStory}></div>
        </div>

        {/* Footer / Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/90 to-transparent pt-20">
            {currentPromo.caption && (
                <p className="text-white text-lg font-medium mb-4 drop-shadow-md text-center">
                    {currentPromo.caption}
                </p>
            )}
            
            <button 
                onClick={() => { onClose(); onVisitRestaurant(); }}
                className="w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
                Commander maintenant
            </button>
        </div>

      </div>
    </div>
  );
};