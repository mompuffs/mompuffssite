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
  city: string;
  state: string;
};

// Continental US, roughly centered on Kansas.
const US_CENTER: [number, number] = [39.5, -98.35];
const US_ZOOM = 4;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Leaflet touches `window` on import, so it's loaded inside the effect
// instead of at module scope (keeps this component SSR-safe).
//
// "us" mode: every listing as a clustered pin, zoomable from the whole
// country down to street level. "single" mode: one business's pin.
export default function DirectoryMap({
  points,
  mode,
  fitToPoints = false,
  className = "",
}: {
  points: MapPoint[];
  mode: "us" | "single";
  fitToPoints?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const key = points.map((p) => p.id).join(",");

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
      mapRef.current = map;

      // OpenStreetMap's own tiles: free and keyless, but meant for modest
      // traffic. If the directory gets busy, swap in a keyed provider
      // (MapTiler, Stadia) here. (CARTO's basemaps now need an API key.)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markers = points.map((p) => {
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
            `<div style="min-width:160px"><a href="/directory/${encodeURIComponent(p.slug)}" style="font-weight:700;color:#6b2c63">${escapeHtml(p.name)}</a><div style="font-size:12px;color:#6b7280;margin-top:2px">${cat ? `${cat.icon} ${escapeHtml(cat.name)} · ` : ""}${escapeHtml(p.city)}, ${escapeHtml(p.state)}</div></div>`
          );
        }
        return m;
      });

      if (mode === "single") {
        markers.forEach((m) => m.addTo(map));
        if (points[0]) map.setView([points[0].lat, points[0].lng], 15);
      } else {
        const cluster = (L as any).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });
        markers.forEach((m) => cluster.addLayer(m));
        map.addLayer(cluster);
        if (fitToPoints && points.length > 0) {
          map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
            padding: [30, 30],
            maxZoom: 13,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode, fitToPoints]);

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
    // painting over the sticky navbar.
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
    </div>
  );
}
