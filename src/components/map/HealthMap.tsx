import { useEffect, useRef } from "react";
import L, {
  type LatLngExpression,
  type Map as LeafletMap,
  type Marker as LMarker,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  buildMarkerSvg,
  CATEGORY_COLORS,
  CATEGORY_GLYPHS,
  DEFAULT_MAP_CENTER,
} from "@/lib/map-utils";
import type { ProviderCategory } from "@/lib/format";

export type MapKind = ProviderCategory | "blood_request";

export interface HealthMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MapKind;
  title: string;
  subtitle?: string;
  urgent?: boolean;
}

interface HealthMapProps {
  markers: HealthMarker[];
  userPosition?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  dark?: boolean;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function iconFor(kind: MapKind, urgent?: boolean): L.Icon {
  const color = urgent ? "#dc2626" : CATEGORY_COLORS[kind];
  const glyph =
    kind === "blood_request" ? "!" : CATEGORY_GLYPHS[kind as ProviderCategory] ?? "•";
  return L.icon({
    iconUrl: buildMarkerSvg(color, glyph),
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  });
}

let _userIcon: L.DivIcon | null = null;
function getUserIcon(): L.DivIcon {
  if (_userIcon) return _userIcon;
  _userIcon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:22px;height:22px">
      <div style="position:absolute;inset:-10px;border-radius:9999px;background:rgba(14,159,110,.18);animation:hlpulse 1.8s ease-out infinite"></div>
      <div style="position:absolute;inset:0;border-radius:9999px;background:#0e9f6e;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.3)"></div>
    </div>
    <style>@keyframes hlpulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(1.6);opacity:0}}</style>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  return _userIcon;
}

export function HealthMap({
  markers,
  userPosition,
  selectedId,
  center,
  zoom = 12,
  dark = false,
  onMarkerClick,
  className,
}: HealthMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<LMarker | null>(null);
  const markersIndex = useRef<Map<string, LMarker>>(new Map());

  // Init map
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const c = center ?? DEFAULT_MAP_CENTER;
    const map = L.map(ref.current, {
      center: [c.lat, c.lng] as LatLngExpression,
      zoom,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });
    tileRef.current = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution("© OpenStreetMap · © CARTO")
      .addTo(map);
    clusterRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      iconCreateFunction: (cluster) => {
        const n = cluster.getChildCount();
        const size = n < 10 ? 36 : n < 50 ? 44 : 54;
        return L.divIcon({
          html: `<div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(14,159,110,.92);color:white;font-weight:700;font-family:Inter,Arial;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,.25)">${n}</div>`,
          className: "",
          iconSize: [size, size],
        });
      },
    });
    map.addLayer(clusterRef.current);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      clusterRef.current = null;
      markersIndex.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    tileRef.current.setUrl(dark ? DARK_TILES : LIGHT_TILES);
  }, [dark]);

  // Recenter when center prop changes
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo([center.lat, center.lng], Math.max(mapRef.current.getZoom(), zoom), {
      duration: 0.8,
    });
  }, [center?.lat, center?.lng, zoom]);

  // User position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userPosition) {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: getUserIcon(),
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(map);
    }
  }, [userPosition?.lat, userPosition?.lng]);

  // Markers
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersIndex.current.clear();
    const batch: LMarker[] = [];
    markers.forEach((m) => {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
      const marker = L.marker([m.lat, m.lng], {
        icon: iconFor(m.kind, m.urgent),
        title: m.title,
        alt: m.title,
        riseOnHover: true,
      });
      marker.bindTooltip(
        `<strong>${m.title}</strong>${
          m.subtitle ? `<br/><span style="color:#6b7280;font-size:12px">${m.subtitle}</span>` : ""
        }`,
        { direction: "top", offset: [0, -34], opacity: 0.95 },
      );
      if (onMarkerClick) marker.on("click", () => onMarkerClick(m.id));
      markersIndex.current.set(m.id, marker);
      batch.push(marker);
    });
    cluster.addLayers(batch);
  }, [markers, onMarkerClick]);

  // Selected marker zoom
  useEffect(() => {
    if (!selectedId || !mapRef.current || !clusterRef.current) return;
    const m = markersIndex.current.get(selectedId);
    if (!m) return;
    const ll = m.getLatLng();
    clusterRef.current.zoomToShowLayer(m, () => {
      mapRef.current?.flyTo(ll, Math.max(mapRef.current.getZoom(), 15), { duration: 0.6 });
      m.openTooltip();
    });
  }, [selectedId]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", borderRadius: "inherit", overflow: "hidden" }}
      role="region"
      aria-label="Carte interactive Vytalma"
    />
  );
}