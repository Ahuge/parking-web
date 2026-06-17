"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { ParkingLot, SearchResult } from "@/lib/schemas";

interface MapViewProps {
  lots: ParkingLot[];
  results: SearchResult[];
  selectedLotId: string | null;
  onSelectLot: (id: string | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  showClosed: boolean;
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const OPERATOR_COLORS: Record<string, { match: string; selected: string }> = {
  indigo: { match: "#3b82f6", selected: "#2563eb" },
  easypark: { match: "#10b981", selected: "#059669" },
  impark: { match: "#f59e0b", selected: "#d97706" },
  private: { match: "#94a3b8", selected: "#64748b" },
};

function bookingUrl(lot: ParkingLot): string | null {
  if (lot.operator === "impark") {
    const slug = lot.id.replace("impark-", "");
    return `https://imparknow.com/ca/product/${slug}/`;
  }
  return null;
}

function pinHtml(color: string, text: string, size: number): string {
  return `<div class="parking-pin" style="width:${size}px;height:${size}px;background:${color};font-size:${Math.round(size * 0.4)}px;line-height:${size}px">${text}</div>`;
}

export function MapView({ lots, results, selectedLotId, onSelectLot, onMapClick, showClosed }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
        : FALLBACK_STYLE,
      center: [-123.12, 49.28],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.getCanvas().style.cursor = "crosshair";

    map.on("click", (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    popupRef.current?.remove();
    popupRef.current = null;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const resultMap = new Map(results.map((r) => [r.lot.id, r]));
    const selectedLot = selectedLotId ? lots.find((l) => l.id === selectedLotId) : null;
    const selectedResult = selectedLotId ? resultMap.get(selectedLotId) : null;

    for (const lot of lots) {
      const result = resultMap.get(lot.id);
      const isMatch = !!result;
      const isSelected = lot.id === selectedLotId;
      const isClosed = !isMatch;
      const colors = OPERATOR_COLORS[lot.operator] || OPERATOR_COLORS.private;

      if (isClosed && !showClosed) continue;

      const el = document.createElement("div");
      el.className = "parking-marker cursor-pointer";

      if (isSelected) {
        el.innerHTML = pinHtml(colors.selected, `$${Math.round(result!.price)}`, 36);
      } else if (isMatch) {
        el.innerHTML = pinHtml(colors.match, `$${Math.round(result.price)}`, 30);
      } else {
        el.innerHTML = pinHtml("#94a3b8", "P", 22);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectLot(isSelected ? null : lot.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lot.coordinates.lng, lot.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    if (selectedLot && selectedResult) {
      const url = bookingUrl(selectedLot);
      const html = `
        <div class="font-sans text-sm leading-snug max-w-56">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-white text-[10px] font-medium px-1.5 py-0.5 rounded" style="background:#2563eb">${selectedLot.operator}</span>
            <span class="font-semibold text-zinc-900 truncate">${selectedLot.name}</span>
          </div>
          <div class="text-zinc-500 text-xs mb-1">${selectedLot.address}</div>
          <div class="flex items-center gap-3 text-sm">
            <span class="font-bold text-zinc-900">$${selectedResult.price.toFixed(2)}</span>
            <span class="text-zinc-400">${selectedResult.walkingMinutes} min walk</span>
            <span class="text-zinc-400">${selectedResult.distanceKm < 1 ? `${Math.round(selectedResult.distanceKm * 1000)}m` : `${selectedResult.distanceKm.toFixed(1)}km`}</span>
          </div>
          ${selectedLot.features.ev || selectedLot.features.covered ? `<div class="flex gap-2 mt-1 text-[10px] font-medium">${selectedLot.features.ev ? '<span class="text-green-600">⚡ EV</span>' : ''}${selectedLot.features.covered ? '<span class="text-blue-600">Covered</span>' : ''}</div>` : ''}
          ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">Book now ↗</a>` : ''}
        </div>
      `;

      popupRef.current = new maplibregl.Popup({ offset: 25, closeButton: false, maxWidth: "260px" })
        .setLngLat([selectedLot.coordinates.lng, selectedLot.coordinates.lat])
        .setHTML(html)
        .addTo(map);
    }
  }, [lots, results, selectedLotId, onSelectLot, showClosed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedLotId) {
      const lot = lots.find((l) => l.id === selectedLotId);
      if (lot) {
        map.flyTo({ center: [lot.coordinates.lng, lot.coordinates.lat], zoom: 16, duration: 800 });
        return;
      }
    }

    if (results.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const r of results) {
        bounds.extend([r.lot.coordinates.lng, r.lot.coordinates.lat]);
      }
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
    }
  }, [results, selectedLotId, lots]);

  return (
    <>
      <style>{`
        .parking-pin {
          border-radius: 50%;
          color: #fff;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.8);
          transition: box-shadow 0.15s;
        }
        .parking-marker:hover .parking-pin {
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        }
        .maplibregl-popup-content {
          padding: 10px 12px !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
        }
        .maplibregl-popup-tip {
          border-top-color: #fff !important;
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}
