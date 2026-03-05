import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Restaurant, Location } from '../types';
import { Navigation, Info, Bike, Footprints } from 'lucide-react';
import { formatTime } from '../utils/geo';

// On fixe les icônes par défaut de Leaflet qui buggent souvent avec les imports ESM/Webpack
// Nous utiliserons plutôt des L.divIcon personnalisés pour un look moderne

interface Props {
  restaurants: Restaurant[];
  userLocation: Location | null;
  onSelect: (r: Restaurant) => void;
}

// Composant utilitaire pour recentrer la carte
const RecenterMap = ({ center }: { center: Location }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.latitude, center.longitude], 15, {
        animate: true,
        duration: 1.5
    });
  }, [center, map]);
  return null;
};

export const MapView: React.FC<Props> = ({ restaurants, userLocation, onSelect }) => {
  const [mapCenter, setMapCenter] = useState<Location>({ latitude: -4.301, longitude: 15.301 }); // Kinshasa par défaut

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  // Icône Utilisateur (Point bleu pulsant)
  const userIcon = L.divIcon({
    className: 'custom-user-icon',
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Icône Restaurant (Pin Orange SVG)
  const createRestoIcon = (isOpen: boolean) => L.divIcon({
    className: 'custom-resto-icon',
    html: `
      <div class="relative w-8 h-8 flex flex-col items-center justify-center transition-transform hover:scale-110">
        <svg viewBox="0 0 24 24" fill="${isOpen ? '#ea580c' : '#9ca3af'}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32], // La pointe du pin est en bas au centre
    popupAnchor: [0, -32]
  });

  return (
    <div className="relative w-full h-[calc(100vh-180px)] rounded-xl overflow-hidden border border-gray-300 bg-gray-100 z-0">
      
      <MapContainer 
        center={[mapCenter.latitude, mapCenter.longitude]} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // On cache le zoom par défaut pour un look plus "App"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Composant pour gérer le recentrage programmatique */}
        <RecenterMap center={mapCenter} />

        {/* Marqueur Utilisateur */}
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
             <Popup closeButton={false} offset={[0, -10]}>
                <span className="font-bold text-blue-600">Vous êtes ici</span>
             </Popup>
          </Marker>
        )}

        {/* Marqueurs Restaurants */}
        {restaurants.map((resto) => (
          <Marker 
            key={resto.id} 
            position={[resto.latitude, resto.longitude]} 
            icon={createRestoIcon(resto.isOpen)}
            eventHandlers={{
                click: () => onSelect(resto), // Sélectionne le resto au clic sur le pin
            }}
          >
            <Popup className="rounded-xl overflow-hidden p-0 shadow-lg">
              <div 
                className="w-48 cursor-pointer"
                onClick={() => onSelect(resto)}
              >
                 <div className="relative h-24 bg-gray-200">
                    <img src={resto.coverImage} className="w-full h-full object-cover rounded-t-lg" alt={resto.name} />
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${resto.isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
                        {resto.isOpen ? 'Ouvert' : 'Fermé'}
                    </span>
                 </div>
                 <div className="p-3">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">{resto.name}</h3>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        {resto.timeMoto && (
                            <span className="flex items-center text-orange-600 font-bold">
                                <Bike size={12} className="mr-1"/> {formatTime(resto.timeMoto)}
                            </span>
                        )}
                        <span className="flex items-center">
                            ★ {resto.rating}
                        </span>
                    </div>
                 </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Bouton de recentrage flottant */}
      <button 
        onClick={() => {
            if (userLocation) setMapCenter(userLocation);
        }}
        className="absolute bottom-6 right-4 bg-white p-3 rounded-full shadow-lg text-brand-600 hover:bg-brand-50 transition-colors z-[400] active:scale-95"
      >
        <Navigation size={20} className={userLocation ? "fill-current" : ""} />
      </button>

      {/* Légende rapide */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-md z-[400] text-xs pointer-events-none">
          <div className="flex items-center space-x-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-white"></span>
              <span className="text-gray-700 font-bold">Moi</span>
          </div>
          <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-brand-500 border border-white"></span>
              <span className="text-gray-700 font-bold">Restaurant</span>
          </div>
      </div>

    </div>
  );
};