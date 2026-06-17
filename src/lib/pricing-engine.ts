import type { ParkingLot, PricingRule, SearchQuery, SearchResult, SortMode, Filters } from "./schemas";

const WALKING_PENALTY_PER_MINUTE = 1.0;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateWalkingMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / 5) * 60);
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const VANCOUVER_TZ = "America/Vancouver";

function getLocalMinutes(date: Date, tz: string): number {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = formatter.format(date).split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function getLocalDay(date: Date, tz: string): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    weekday: "short",
  });
  return days[["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(formatter.format(date).toLowerCase())];
}

function isOpenAt(
  hours: Record<string, { open: string; close: string } | null>,
  date: Date
): boolean {
  const dayLabel = getLocalDay(date, VANCOUVER_TZ);
  const entry = hours[dayLabel];
  if (!entry) return false;
  const minutes = getLocalMinutes(date, VANCOUVER_TZ);
  return minutes >= parseTime(entry.open) && minutes < parseTime(entry.close);
}

function computeDurationMinutes(arrival: Date, departure: Date): number {
  return (departure.getTime() - arrival.getTime()) / 60000;
}

function computePrice(rule: PricingRule, durationMinutes: number): number {
  const hours = durationMinutes / 60;

  if (rule.conditions) {
    if (rule.conditions.minHours && hours < rule.conditions.minHours) {
      return Infinity;
    }
    if (rule.conditions.maxHours && hours > rule.conditions.maxHours) {
      return Infinity;
    }
  }

  switch (rule.type) {
    case "flat":
      return rule.amount ?? 0;

    case "hourly": {
      const rate = rule.hourlyRate ?? 0;
      const total = Math.ceil(hours) * rate;
      return rule.maxDaily ? Math.min(total, rule.maxDaily) : total;
    }

    case "incremental": {
      if (!rule.increments || rule.increments.length === 0) return 0;
      let total = 0;
      let remaining = durationMinutes;
      for (const inc of rule.increments) {
        if (remaining <= 0) break;
        const used = Math.min(remaining, inc.minutes);
        total += Math.ceil(used / inc.minutes) * inc.price;
        remaining -= inc.minutes;
      }
      if (remaining > 0) {
        const lastInc = rule.increments[rule.increments.length - 1];
        total += Math.ceil(remaining / lastInc.minutes) * lastInc.price;
      }
      return rule.maxDaily ? Math.min(total, rule.maxDaily) : total;
    }

    default:
      return 0;
  }
}

export function computeResults(
  lots: ParkingLot[],
  rules: PricingRule[],
  query: SearchQuery,
  sortMode: SortMode = "best-value",
  filters?: Filters
): SearchResult[] {
  const arrival = new Date(query.arrival);
  const departure = new Date(query.departure);
  const durationMinutes = computeDurationMinutes(arrival, departure);

  const qLat = query.coordinates.lat;
  const qLng = query.coordinates.lng;

  const results: SearchResult[] = [];

  for (const lot of lots) {
    if (!isOpenAt(lot.hours, arrival)) continue;
    if (!isOpenAt(lot.hours, departure)) continue;

    if (filters) {
      if (filters.ev === true && !lot.features.ev) continue;
      if (filters.covered === true && !lot.features.covered) continue;
      if (filters.operators && !filters.operators.includes(lot.operator)) continue;
    }

    const distanceKm = haversineDistance(qLat, qLng, lot.coordinates.lat, lot.coordinates.lng);
    const walkingMinutes = estimateWalkingMinutes(distanceKm);

    if (filters?.maxWalkingMinutes && walkingMinutes > filters.maxWalkingMinutes) continue;

    const lotRules = rules.filter((r) => r.lotId === lot.id);
    if (lotRules.length === 0) continue;

    const distances = lotRules.map((r) => computePrice(r, durationMinutes));
    const price = Math.min(...distances);
    if (price === Infinity) continue;

    const effectivePrice = price + walkingMinutes * WALKING_PENALTY_PER_MINUTE;

    results.push({ lot, price, walkingMinutes, effectivePrice, distanceKm });
  }

  switch (sortMode) {
    case "best-value":
      results.sort((a, b) => a.effectivePrice - b.effectivePrice);
      break;
    case "cheapest":
      results.sort((a, b) => a.price - b.price);
      break;
    case "closest":
      results.sort((a, b) => a.distanceKm - b.distanceKm);
      break;
  }

  return results;
}
