import { useState } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Default leaflet marker icons don't resolve correctly under Vite's bundler
// without this manual fix.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLOR_HEX = {
  red: "#dc4a2f",
  orange: "#c2703d",
  green: "#4b7c5a",
  gray: "#6b7280",
};

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const DEFAULT_CENTER = [26.2006, 92.9376]; // roughly North Eastern Region, India

// gridPoints: [{ latitude, longitude, color, probability }] - optional
// susceptibility overlay drawn around the selected point (red = high risk,
// orange = moderate, green = low), from the /predict/grid endpoint.
export default function MapPicker({ position, onChange, gridPoints = [] }) {
  const [center] = useState(position || DEFAULT_CENTER);

  return (
    <MapContainer center={center} zoom={7} className="h-80 sm:h-96">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={(lat, lng) => onChange(lat, lng)} />

      {gridPoints.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.latitude, p.longitude]}
          radius={16}
          pathOptions={{
            color: COLOR_HEX[p.color] || COLOR_HEX.gray,
            fillColor: COLOR_HEX[p.color] || COLOR_HEX.gray,
            fillOpacity: 0.45,
            weight: 1,
          }}
        >
          {p.probability !== null && p.probability !== undefined && (
            <Tooltip direction="top" opacity={0.9}>
              {(p.probability * 100).toFixed(0)}% risk
            </Tooltip>
          )}
        </CircleMarker>
      ))}

      {position && <Marker position={position} />}
    </MapContainer>
  );
}
