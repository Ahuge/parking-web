"use client";

import type { SearchResult, SortMode } from "@/lib/schemas";

interface ResultsPanelProps {
  results: SearchResult[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  selectedLotId: string | null;
  onSelectLot: (id: string | null) => void;
}

const OPERATOR_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  easypark: { bg: "bg-emerald-100", text: "text-emerald-700", label: "EasyPark" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Indigo" },
  impark: { bg: "bg-amber-100", text: "text-amber-700", label: "Impark" },
  private: { bg: "bg-zinc-100", text: "text-zinc-600", label: "Private" },
};

export function ResultsPanel({ results, sortMode, onSortChange, selectedLotId, onSelectLot }: ResultsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {results.length} {results.length === 1 ? "result" : "results"}
        </span>
        <select
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as SortMode)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 outline-none focus:border-blue-500"
        >
          <option value="best-value">Best Value</option>
          <option value="cheapest">Cheapest</option>
          <option value="closest">Closest</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
            <div className="text-2xl">📍</div>
            <p className="text-sm font-medium text-zinc-500">No parking results</p>
            <p className="text-xs text-zinc-400 max-w-56">
              Try searching a different destination, adjusting your time range, or widening filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {results.map((r, i) => {
              const isSelected = r.lot.id === selectedLotId;
              const badge = OPERATOR_BADGES[r.lot.operator] || OPERATOR_BADGES.private;
              const rank = i + 1;
              return (
                <div
                  key={r.lot.id}
                  onClick={() => onSelectLot(isSelected ? null : r.lot.id)}
                  className={`group cursor-pointer px-4 py-3 transition-colors ${
                    isSelected
                      ? "bg-blue-50"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
                    }`}>
                      {rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-900">{r.lot.name}</span>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">{r.lot.address}</span>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-zinc-300">↔</span>
                          {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)}km`}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-zinc-300">🚶</span>
                          {r.walkingMinutes} min
                        </span>
                        {r.lot.features.ev && <span className="rounded bg-green-50 px-1 py-0.5 text-[10px] font-medium text-green-600">EV</span>}
                        {r.lot.features.covered && <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] font-medium text-blue-600">Covered</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-sm font-bold text-zinc-900">${r.price.toFixed(2)}</span>
                      <span className="whitespace-nowrap text-[10px] text-zinc-400">+${r.walkingMinutes} walk</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
