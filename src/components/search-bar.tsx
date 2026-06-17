"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string, lat: number, lng: number) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searching) return;

    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1&countrycodes=ca`;
      const res = await fetch(url, {
        headers: { "User-Agent": "vancouver-parking/1.0" },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        onSearch(data[0].display_name, parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch {
      onSearch(trimmed, 49.28, -123.12);
    } finally {
      setSearching(false);
    }
  }

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=ca`;
          const res = await fetch(url, {
            headers: { "User-Agent": "vancouver-parking/1.0" },
          });
          const data = await res.json();
          const name = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setQuery(name);
          onSearch(name, lat, lng);
        } catch {
          const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setQuery(name);
          onSearch(name, lat, lng);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onSearch]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search destination..."
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        title="Use my location"
        className="rounded-lg border border-zinc-300 px-2.5 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 transition-colors"
      >
        {locating ? "..." : "📍"}
      </button>
      <button
        type="submit"
        disabled={searching || !query.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {searching ? "..." : "Search"}
      </button>
    </form>
  );
}
