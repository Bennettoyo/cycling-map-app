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
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjBlOTFmZWQyZmM5ZTQxMDU5NDc0ODBlZTA5NTg3YmJlIiwiaCI6Im11cm11cjY0In0=";

// Fetch route from OpenRouteService
async function fetchCurvedRoute(route: LatLng[]): Promise<LatLng[]> {
  if (route.length < 2) return route;

  const coords = route.map(([lat, lng]) => [lng, lat]);

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

  if (data.error) throw new Error(data.error.message);

  return data.features[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
}

// Handle click to add route points
const ClickHandler = ({ addPoint }: { addPoint: (latlng: LatLng) => void }) => {
  useMapEvent("click", (e) => addPoint([e.latlng.lat, e.latlng.lng]));
  return null;
};

// Show user location
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
      localStorage.setItem("userPos", JSON.stringify(coords));
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
        iconUrl: "/bicycle-32.png",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      })}
      zIndexOffset={9999999999999} // always on top
    />
  );
};

export default function Map() {
  const [userPos, setUserPos] = useState<LatLng | null>(() => {
    const saved = localStorage.getItem("userPos");
    return saved ? JSON.parse(saved) : null;
  });

  const [route, setRoute] = useState<LatLng[]>(() => {
    const savedRoute = localStorage.getItem("route");
    if (savedRoute) return JSON.parse(savedRoute);
    return []; // start empty if no saved route
  });

  const [curvedRoute, setCurvedRoute] = useState<LatLng[]>(route);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const distanceKm = getTotalDistanceKm(curvedRoute);
  const distanceMiles = kmToMiles(distanceKm);

  // Initialize route on first load if no saved route
  useEffect(() => {
    const savedRoute = localStorage.getItem("route");
    if (userPos && !savedRoute) {
      const newRoute = [userPos];
      setRoute(newRoute);
      setCurvedRoute(newRoute);
      localStorage.setItem("route", JSON.stringify(newRoute));
      setRouteError(null);
    }
  }, [userPos]);

  // Update curved route asynchronously
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (route.length < 2) {
        setCurvedRoute(route);
        setRouteError(null);
        return;
      }

      setLoadingRoute(true);
      try {
        const curved = await fetchCurvedRoute(route);
        if (!cancelled) {
          setCurvedRoute(curved);
          setRouteError(null);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setRouteError("Could not find route");
          // Remove the last marker
          setRoute((prev) => {
            const newRoute = prev.slice(0, -1);
            localStorage.setItem("route", JSON.stringify(newRoute));
            return newRoute;
          });
        }
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [route]);

  const addPoint = async (latlng: LatLng) => {
    setRouteError(null); // clear previous error
    const newRoute = [...route, latlng];
    setRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
  };

  const removePoint = async (index: number) => {
    if (index === 0) return; // cannot remove user location
    const newRoute = route.filter((_, i) => i !== index);
    setRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
  };

  const resetRoute = () => {
    const newRoute = userPos ? [userPos] : [];
    setRoute(newRoute);
    setCurvedRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
    setRouteError(null);
  };

  const markerIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
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
            zIndexOffset={i === 0 ? 999999 : 0} // user location on top
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
          {routeError ? (
            <span className="text-red-600 font-semibold">{routeError}</span>
          ) : (
            <span>
              <strong className="text-red-600">Distance:</strong>{" "}
              {loadingRoute
                ? "Loading..."
                : `${distanceMiles.toFixed(2)} miles`}
            </span>
          )}
        </div>
        <button
          onClick={resetRoute}
          disabled={loadingRoute}
          className={`px-4 py-2 rounded text-white ${
            loadingRoute
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          Reset Route
        </button>
      </div>
    </div>
  );
}
