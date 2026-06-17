"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ParkingLot, PricingRule, SearchResult, SortMode, Filters } from "@/lib/schemas";
import { computeResults } from "@/lib/pricing-engine";
import { MapView } from "./map";
import { SearchBar } from "./search-bar";
import { TimeControls } from "./time-controls";
import { ResultsPanel } from "./results-panel";
import { FiltersPanel } from "./filters-panel";

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

interface ParkingAppProps {
  lots: ParkingLot[];
  rules: PricingRule[];
}

export function ParkingApp({ lots, rules }: ParkingAppProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const syncing = useRef(false);

  const [destination, setDestination] = useState(() => searchParams.get("q") || "Vancouver, BC");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      const nlat = parseFloat(lat);
      const nlng = parseFloat(lng);
      if (!isNaN(nlat) && !isNaN(nlng)) return { lat: nlat, lng: nlng };
    }
    return { lat: 49.28, lng: -123.12 };
  });
  const [arrival, setArrival] = useState(() => {
    const param = searchParams.get("a");
    if (param) {
      const d = parseLocalInput(param);
      if (d) return d;
    }
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [departure, setDeparture] = useState(() => {
    const param = searchParams.get("d");
    if (param) {
      const d = parseLocalInput(param);
      if (d) return d;
    }
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 3);
    return d;
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const s = searchParams.get("s");
    if (s === "cheapest" || s === "closest" || s === "best-value") return s;
    return "best-value";
  });
  const [filters, setFilters] = useState<Filters>({});
  const [selectedLotId, setSelectedLotId] = useState<string | null>(() => searchParams.get("lot") || null);
  const [showClosed, setShowClosed] = useState(false);

  // Sync state → URL
  useEffect(() => {
    if (syncing.current) { syncing.current = false; return; }
    const params = new URLSearchParams();
    if (destination && destination !== "Vancouver, BC") params.set("q", destination);
    if (coordinates) {
      params.set("lat", coordinates.lat.toFixed(5));
      params.set("lng", coordinates.lng.toFixed(5));
    }
    const aStr = toLocalInput(arrival);
    const dStr = toLocalInput(departure);
    params.set("a", aStr);
    params.set("d", dStr);
    if (sortMode !== "best-value") params.set("s", sortMode);
    if (selectedLotId) params.set("lot", selectedLotId);
    const qs = params.toString();
    const current = window.location.search.replace("?", "");
    if (qs !== current) {
      router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
    }
  }, [destination, coordinates, arrival, departure, sortMode, selectedLotId, router, pathname]);

  // Sync URL → state (back/forward navigation)
  useEffect(() => {
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const a = searchParams.get("a");
    const d = searchParams.get("d");
    const s = searchParams.get("s");
    const lot = searchParams.get("lot");

    syncing.current = true;

    if (q && q !== destination) setDestination(q);
    if (lat && lng) {
      const nlat = parseFloat(lat);
      const nlng = parseFloat(lng);
      if (!isNaN(nlat) && !isNaN(nlng)) setCoordinates({ lat: nlat, lng: nlng });
    }
    if (a) { const da = parseLocalInput(a); if (da) setArrival(da); }
    if (d) { const dd = parseLocalInput(d); if (dd) setDeparture(dd); }
    if (s === "cheapest" || s === "closest" || s === "best-value") setSortMode(s);
    setSelectedLotId(lot || null);
  }, [searchParams]);

  const results: SearchResult[] = useMemo(() => {
    if (!coordinates) return [];
    const query = {
      destination,
      coordinates: { lat: coordinates.lat, lng: coordinates.lng },
      arrival: arrival.toISOString(),
      departure: departure.toISOString(),
    };
    return computeResults(lots, rules, query, sortMode, filters);
  }, [lots, rules, destination, coordinates, arrival, departure, sortMode, filters]);

  const handleSearch = useCallback((query: string, lat: number, lng: number) => {
    setDestination(query);
    setCoordinates({ lat, lng });
    setSelectedLotId(null);
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setSelectedLotId(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=ca&zoom=16`;
      const res = await fetch(url, { headers: { "User-Agent": "vancouver-parking/1.0" } });
      const data = await res.json() as { display_name?: string };
      const name = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setDestination(name);
    } catch {
      setDestination(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, []);

  const handleDurationChange = useCallback((hours: number) => {
    const newDeparture = new Date(arrival.getTime() + hours * 60 * 60 * 1000);
    setDeparture(newDeparture);
  }, [arrival]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col md:flex-row">
      <div className="flex flex-col border-r border-zinc-200 bg-white md:h-full md:w-[440px] md:min-w-[440px] md:flex-shrink-0">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">P</div>
          <span className="text-sm font-semibold text-zinc-800">Vancouver Parking</span>
        </div>
        <div className="flex-shrink-0 border-b border-zinc-100 px-4 py-3">
          <SearchBar onSearch={handleSearch} initialQuery={destination} />
        </div>
        <div className="flex-shrink-0 border-b border-zinc-100 px-4 pb-3 pt-2">
          <TimeControls
            arrival={arrival}
            departure={departure}
            onArrivalChange={setArrival}
            onDepartureChange={setDeparture}
            onDurationChange={handleDurationChange}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ResultsPanel
            results={results}
            sortMode={sortMode}
            onSortChange={setSortMode}
            selectedLotId={selectedLotId}
            onSelectLot={setSelectedLotId}
          />
        </div>
        <div className="flex-shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
          <FiltersPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
          />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <MapView
          lots={lots}
          results={results}
          selectedLotId={selectedLotId}
          onSelectLot={setSelectedLotId}
          onMapClick={handleMapClick}
          showClosed={showClosed}
        />
      </div>
    </div>
  );
}
