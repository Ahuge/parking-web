"use client";

import { useCallback } from "react";

interface TimeControlsProps {
  arrival: Date;
  departure: Date;
  onArrivalChange: (d: Date) => void;
  onDepartureChange: (d: Date) => void;
  onDurationChange: (hours: number) => void;
}

const DURATION_CHIPS = [1, 2, 4, 8] as const;

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): Date {
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function TimeControls({ arrival, departure, onArrivalChange, onDepartureChange, onDurationChange }: TimeControlsProps) {
  const handleArrival = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onArrivalChange(fromDatetimeLocal(e.target.value)),
    [onArrivalChange],
  );
  const handleDeparture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onDepartureChange(fromDatetimeLocal(e.target.value)),
    [onDepartureChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="w-16 shrink-0 text-xs font-medium text-zinc-500">Arrival</label>
          <input
            type="datetime-local"
            value={toLocalDatetimeString(arrival)}
            onChange={handleArrival}
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-16 shrink-0 text-xs font-medium text-zinc-500">Departure</label>
          <input
            type="datetime-local"
            value={toLocalDatetimeString(departure)}
            onChange={handleDeparture}
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-1">
        {DURATION_CHIPS.map((h) => (
          <button
            key={h}
            onClick={() => onDurationChange(h)}
            className="flex-1 rounded bg-zinc-100 py-1 text-xs font-medium text-zinc-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            {h}h
          </button>
        ))}
      </div>
    </div>
  );
}
