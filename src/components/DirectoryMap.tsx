"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { categoryFor } from "@/lib/directory";

export type MapPoint = {
  id: string;
  slug: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  city: string | null;
  state: string;
};

// Continental US, roughly centered on Kansas.
const US_CENTER: [number, number] = [39.5, -98.35];
const US_ZOOM = 4;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Rows from /api/directory/pins: [slug, name, category, lat, lng, city, state].
type PinRow = [string, string, string, number, number, string | null, string];

// Leaflet touches `window` on import, so it's loaded inside the effect
// instead of at module scope (keeps this component SSR-safe).
//
// "us" mode: listings as clustered pins, zoomable from the whole country
// down to street level. Pass pinsUrl (an /api/directory/pins URL) to load
// them after the page renders instead of shipping them in the HTML.
// "single" mode: one business's pin, passed in points.
export default function DirectoryMap({
  points,
  pinsUrl,
  mode,
  fitToPoints = false,
  className = "",
}: {
  points?: MapPoint[];
  pinsUrl?: string;
  mode: "us" | "single";
  fitToPoints?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [fetched, setFetched] = useState<MapPoint[] | null>(null);
  const [loadingPins, setLoadingPins] = useState(false);

  // 1. The map itself, created once.
  useEffect(() => {
    let cancelled = false;
    let map: any;
    (async () => {
      const L = (await import("leaflet")).default;
      if (mode === "us") await import("leaflet.markercluster");
      if (cancelled || !el.current) return;
      map = L.map(el.current, {
        center: US_CENTER,
        zoom: US_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        scrollWheelZoom: mode === "us",
        worldCopyJump: true,
      });
      // OpenStreetMap's own tiles: free and keyless, but meant for modest
      // traffic. If the directory gets busy, swap in a keyed provider
      // (MapTiler, Stadia) here. (CARTO's basemaps now need an API key.)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, [mode]);

  // 2. Pins from the API, when given a URL.
  useEffect(() => {
    if (!pinsUrl) return;
    const controller = new AbortController();
    setLoadingPins(true);
    fetch(pinsUrl, { signal: controller.signal })
      .then((r) => r.json())
      .then((rows: PinRow[]) => {
        setFetched(
          rows.map(([slug, name, category, lat, lng, city, state]) => ({ id: slug, slug, name, category, lat, lng, city, state }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingPins(false));
    return () => controller.abort();
  }, [pinsUrl]);

  const pts = pinsUrl ? fetched : points ?? [];
  const dataKey = pinsUrl ? `${pinsUrl}|${fetched?.length ?? "loading"}` : (points ?? []).map((p) => p.id).join(",");

  // 3. Markers, redrawn whenever the data changes.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || !pts) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const markers = pts.map((p) => {
      const cat = categoryFor(p.category);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${cat?.color ?? "#7c3aed"};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-size:14px;line-height:1">${cat?.icon ?? "📍"}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
      const m = L.marker([p.lat, p.lng], { icon, title: p.name });
      if (mode === "us") {
        m.bindPopup(
          `<div style="min-width:160px"><a href="/directory/${encodeURIComponent(p.slug)}" style="font-weight:700;color:#6b2c63">${escapeHtml(p.name)}</a><div style="font-size:12px;color:#6b7280;margin-top:2px">${cat ? `${cat.icon} ${escapeHtml(cat.name)} · ` : ""}${p.city ? `${escapeHtml(p.city)}, ` : ""}${escapeHtml(p.state)}</div></div>`
        );
      }
      return m;
    });

    if (mode === "single") {
      const group = L.layerGroup(markers).addTo(map);
      layerRef.current = group;
      if (pts[0]) map.setView([pts[0].lat, pts[0].lng], 15);
    } else {
      const cluster = (L as any).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, chunkedLoading: true });
      cluster.addLayers(markers);
      map.addLayer(cluster);
      layerRef.current = cluster;
      if (fitToPoints && pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, dataKey, mode, fitToPoints]);

  function nearMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 11);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  }

  return (
    // `isolate` keeps Leaflet's internal z-indexes (up to 1000) from
    // painting over the navbar and search popup.
    <div className={`relative isolate ${className}`}>
      <div ref={el} className="absolute inset-0 rounded-xl overflow-hidden bg-brand-50" />
      {mode === "us" && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={nearMe}
            className="bg-white text-sm font-semibold text-brand-700 px-3 py-1.5 rounded-lg shadow hover:bg-brand-50"
          >
            {locating ? "Locating…" : "📍 Near me"}
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.setView(US_CENTER, US_ZOOM)}
            className="bg-white text-sm font-semibold text-brand-700 px-3 py-1.5 rounded-lg shadow hover:bg-brand-50"
          >
            Whole US
          </button>
        </div>
      )}
      {loadingPins && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 text-xs font-semibold text-brand-700 px-2.5 py-1 rounded-lg shadow">
          Loading map pins…
        </div>
      )}
    </div>
  );
}
