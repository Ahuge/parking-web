"use client";

import type { Filters } from "@/lib/schemas";
import { useMemo } from "react";

interface FiltersPanelProps {
  filters: Filters;
  onFilterChange: (key: string, value: unknown) => void;
  showClosed: boolean;
  onShowClosedChange: (v: boolean) => void;
  availableOperators?: string[];
}

export function FiltersPanel({ filters, onFilterChange, showClosed, onShowClosedChange, availableOperators = ["easypark", "indigo", "impark", "private"] }: FiltersPanelProps) {
  const operatorLabels: Record<string, string> = useMemo(() => ({
    easypark: "EasyPark",
    indigo: "Indigo",
    impark: "Impark",
    private: "Private",
  }), []);

  const toggleOperator = (op: string) => {
    const current = filters.operators ?? [];
    const next = current.includes(op)
      ? current.filter((o: string) => o !== op)
      : [...current, op];
    onFilterChange("operators", next.length > 0 ? next : undefined);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500">
          Max Walk: {filters.maxWalkingMinutes ?? 20} min
        </label>
        <input
          type="range"
          min={1}
          max={40}
          step={1}
          value={filters.maxWalkingMinutes ?? 20}
          onChange={(e) => onFilterChange("maxWalkingMinutes", Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>1 min</span>
          <span>40 min</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Operator</label>
        <div className="flex flex-wrap gap-1.5">
          {availableOperators.map((op) => {
            const active = filters.operators ? filters.operators.includes(op) : true;
            return (
              <button
                key={op}
                onClick={() => toggleOperator(op)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {operatorLabels[op] ?? op}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filters.ev}
            onChange={(e) => onFilterChange("ev", e.target.checked || undefined)}
            className="rounded border-zinc-300 text-blue-600 accent-blue-600"
          />
          <span className="text-xs font-medium text-zinc-600">EV Charging</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filters.covered}
            onChange={(e) => onFilterChange("covered", e.target.checked || undefined)}
            className="rounded border-zinc-300 text-blue-600 accent-blue-600"
          />
          <span className="text-xs font-medium text-zinc-600">Covered</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => onShowClosedChange(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-500 accent-zinc-500"
          />
          <span className="text-xs font-medium text-zinc-500">Show closed</span>
        </label>
      </div>
    </div>
  );
}
