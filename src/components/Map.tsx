import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvent,
} from "react-leaflet";
import L from "leaflet";
import { useState } from "react";

type LatLng = [number, number];

const ClickHandler = ({ addPoint }: { addPoint: (latlng: LatLng) => void }) => {
  useMapEvent("click", (e) => addPoint([e.latlng.lat, e.latlng.lng]));
  return null;
};

export default function Map() {
  const [route, setRoute] = useState<LatLng[]>(() => {
    const saved = localStorage.getItem("route");
    return saved ? JSON.parse(saved) : [];
  });

  const addPoint = (latlng: LatLng) => {
    const newRoute = [...route, latlng];
    setRoute(newRoute);
    localStorage.setItem("route", JSON.stringify(newRoute));
  };

  const resetRoute = () => {
    setRoute([]);
    localStorage.removeItem("route");
  };

  const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  return (
    <div>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        className="h-[500px] w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler addPoint={addPoint} />
        {route.map((pos, i) => (
          <Marker key={i} position={pos} icon={markerIcon} />
        ))}
        {route.length > 1 && <Polyline positions={route} color="red" />}
      </MapContainer>

      <div className="mt-2 flex justify-between items-center">
        <span>Points: {route.length}</span>
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
