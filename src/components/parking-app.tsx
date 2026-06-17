"use client";

import { useState, useCallback, useMemo } from "react";
import type { ParkingLot, PricingRule, SearchResult, SortMode, Filters } from "@/lib/schemas";
import { computeResults } from "@/lib/pricing-engine";
import { MapView } from "./map";
import { SearchBar } from "./search-bar";
import { TimeControls } from "./time-controls";
import { ResultsPanel } from "./results-panel";
import { FiltersPanel } from "./filters-panel";

interface ParkingAppProps {
  lots: ParkingLot[];
  rules: PricingRule[];
}

export function ParkingApp({ lots, rules }: ParkingAppProps) {
  const [destination, setDestination] = useState("Vancouver, BC");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({
    lat: 49.28,
    lng: -123.12,
  });
  const [arrival, setArrival] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [departure, setDeparture] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 3);
    return d;
  });
  const [sortMode, setSortMode] = useState<SortMode>("best-value");
  const [filters, setFilters] = useState<Filters>({});
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

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
          <SearchBar onSearch={handleSearch} />
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
