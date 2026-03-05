// Speed constants in km/h
const SPEED_WALKING = 5;
const SPEED_MOTO = 30;

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates distance between two coordinates in Kilometers using Haversine formula
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Returns estimated time in minutes
 */
export function calculateTime(distanceKm: number, speedKmh: number): number {
  const timeHours = distanceKm / speedKmh;
  return Math.ceil(timeHours * 60);
}

export function formatDistance(km: number | undefined | null): string {
  if (km === undefined || km === null) return '--';
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatTime(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null) return '--';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
  }
  return `${minutes} min`;
}