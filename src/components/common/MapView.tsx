import { useEffect, useRef } from "react";
import L, { type LatLngExpression, type LayerGroup, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Vite bundling
const defaultIcon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  className?: string;
  onMarkerClick?: (id: string) => void;
}

// Default to Casablanca
const DEFAULT_CENTER = { lat: 33.5731, lng: -7.5898 };

export function MapView({
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  height = "100%",
  className,
  onMarkerClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng] as LatLngExpression,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: defaultIcon, title: m.title });
      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif"><strong>${m.title}</strong>${
          m.subtitle ? `<br/><span style="color:#6b7280;font-size:12px">${m.subtitle}</span>` : ""
        }</div>`,
      );
      if (onMarkerClick) marker.on("click", () => onMarkerClick(m.id));
      marker.addTo(layer);
    });
    if (markers.length > 1 && mapRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as LatLngExpression));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", borderRadius: "inherit", overflow: "hidden", zIndex: 0 }}
      role="region"
      aria-label="Carte interactive des prestataires de santé"
    />
  );
}