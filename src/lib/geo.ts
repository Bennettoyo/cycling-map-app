// lib/geo.ts

export type LatLng = [number, number];

const toRad = (value: number) => (value * Math.PI) / 180;

export const haversineDistance = (a: LatLng, b: LatLng) => {
  const R = 6371; // km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h)); // km
};

export const getTotalDistanceKm = (route: LatLng[]) => {
  let distance = 0;
  for (let i = 1; i < route.length; i++) {
    distance += haversineDistance(route[i - 1], route[i]);
  }
  return distance;
};

export const kmToMiles = (km: number) => km * 0.621371;

export const getTimeHours = (distanceKm: number, speedKmh: number) =>
  distanceKm / speedKmh;

export const formatTime = (hours: number) => {
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
