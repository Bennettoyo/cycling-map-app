"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvent,
  useMap,
} from "react-leaflet";
import { getTotalDistanceKm, kmToMiles } from "../lib/geo";

import L from "leaflet";
import { useState, useEffect } from "react";

type LatLng = [number, number];

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjBlOTFmZWQyZmM5ZTQxMDU5NDc0ODBlZTA5NTg3YmJlIiwiaCI6Im11cm11cjY0In0="; // replace with your key

// Helper to fetch route from OpenRouteService
async function fetchCurvedRoute(route: LatLng[]): Promise<LatLng[]> {
  if (route.length < 2) return route;

  const coords = route.map(([lat, lng]) => [lng, lat]); // OpenRouteService expects [lng, lat]

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/cycling-regular/geojson",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify({ coordinates: coords }),
    }
  );

  const data = await res.json();

  // Extract geometry coordinates
  const curvedRoute: LatLng[] = data.features[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  return curvedRoute;
}

// Handle click to add route points
const ClickHandler = ({ addPoint }: { addPoint: (latlng: LatLng) => void }) => {
  useMapEvent("click", (e) => addPoint([e.latlng.lat, e.latlng.lng]));
  return null;
};

// Show user location and optionally update as they move
const UserLocation = ({
  setUserPos,
}: {
  setUserPos: (pos: LatLng) => void;
}) => {
  const map = useMap();
  const [localPos, setLocalPos] = useState<LatLng | null>(null);

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 });

    const onLocationFound = (e: any) => {
      const coords: LatLng = [e.latitude, e.longitude];
      setLocalPos(coords);
      setUserPos(coords);
      map.setView(coords, 16);
    };

    map.on("locationfound", onLocationFound);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setLocalPos(coords);
        setUserPos(coords);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => {
      map.off("locationfound", onLocationFound);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, setUserPos]);

  if (!localPos) return null;

  return (
    <Marker
      position={localPos}
      icon={L.icon({
        iconUrl: "../public/bicycle-32.png",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      })}
    />
  );
};

export default function Map() {
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>(() => {
    const saved = localStorage.getItem("route");
    return saved ? JSON.parse(saved) : [];
  });
  const [curvedRoute, setCurvedRoute] = useState<LatLng[]>(route);

  const distanceKm = getTotalDistanceKm(curvedRoute);
  const distanceMiles = kmToMiles(distanceKm);

  const updateCurvedRoute = async (newRoute: LatLng[]) => {
    if (userPos && newRoute.length > 0) {
      const routeForAPI = [userPos, ...newRoute];
      const newCurved = await fetchCurvedRoute(routeForAPI);
      setCurvedRoute(newCurved);
    } else {
      setCurvedRoute(newRoute);
    }
  };

  const addPoint = async (latlng: LatLng) => {
    const newRoute = [...route, latlng];
    setRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
    await updateCurvedRoute(newRoute);
  };

  const removePoint = async (index: number) => {
    const newRoute = route.filter((_, i) => i !== index);
    setRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
    await updateCurvedRoute(newRoute);
  };

  const resetRoute = () => {
    setRoute([]);
    setCurvedRoute([]);
    localStorage.removeItem("route");
  };

  const markerIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png", // bike icon
    iconSize: [35, 35],
    iconAnchor: [17, 35],
  });

  return (
    <div>
      <MapContainer
        center={[50.7184, -3.5339]}
        zoom={13}
        className="h-[500px] w-full rounded-2xl border-2 border-black"
      >
        <TileLayer
          url="https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=a13f9f936b4a44359f98da8ce26fe1f6"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <UserLocation setUserPos={setUserPos} />
        <ClickHandler addPoint={addPoint} />

        {route.map((pos, i) => (
          <Marker
            key={i}
            position={pos}
            icon={markerIcon}
            eventHandlers={{
              click: () => removePoint(i),
            }}
          />
        ))}

        {curvedRoute.length > 1 && (
          <Polyline
            positions={curvedRoute}
            pathOptions={{
              color: "red",
              weight: 4,
              dashArray: "10,10",
            }}
          />
        )}
      </MapContainer>

      <div className="mt-2 flex justify-between items-center">
        <div>
          <div>
            <strong className="text-red-600">Distance:</strong>{" "}
            {distanceMiles.toFixed(2)} miles
          </div>
        </div>
        <button
          onClick={resetRoute}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset Route
        </button>
      </div>
    </div>
  );
}
