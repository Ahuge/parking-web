import { z } from "zod";

export const Coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const Features = z.object({
  ev: z.boolean(),
  covered: z.boolean(),
});

export const Metadata = z.object({
  source: z.string(),
  confidence: z.number().min(0).max(1),
  lastUpdated: z.string().datetime(),
});

export const OperatingHours = z.record(
  z.string(),
  z
    .object({
      open: z.string(),
      close: z.string(),
    })
    .nullable()
);

export const ParkingLot = z.object({
  id: z.string(),
  operator: z.enum(["easypark", "indigo", "impark", "private"]),
  name: z.string(),
  address: z.string(),
  coordinates: Coordinates,
  features: Features,
  hours: OperatingHours,
  metadata: Metadata,
});

export const PricingIncrement = z.object({
  minutes: z.number().positive(),
  price: z.number().nonnegative(),
});

export const TimeRange = z.object({
  start: z.string(),
  end: z.string(),
  days: z.array(z.string()),
});

export const PricingRule = z.object({
  id: z.string(),
  lotId: z.string(),
  type: z.enum(["flat", "hourly", "incremental"]),
  amount: z.number().nonnegative().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  increments: z.array(PricingIncrement).optional(),
  maxDaily: z.number().nonnegative().optional(),
  timeRanges: z.array(TimeRange),
  conditions: z
    .object({
      minHours: z.number().nonnegative().optional(),
      maxHours: z.number().nonnegative().optional(),
    })
    .optional(),
});

export const SearchQuery = z.object({
  destination: z.string(),
  coordinates: Coordinates,
  arrival: z.string().datetime(),
  departure: z.string().datetime(),
});

export const SearchResult = z.object({
  lot: ParkingLot,
  price: z.number().nonnegative(),
  walkingMinutes: z.number().nonnegative(),
  effectivePrice: z.number().nonnegative(),
  distanceKm: z.number().nonnegative(),
});

export const SortMode = z.enum(["best-value", "cheapest", "closest"]);

export const Filters = z.object({
  maxWalkingMinutes: z.number().nonnegative().optional(),
  operators: z.array(z.string()).optional(),
  ev: z.boolean().optional(),
  covered: z.boolean().optional(),
});

export type ParkingLot = z.infer<typeof ParkingLot>;
export type PricingRule = z.infer<typeof PricingRule>;
export type SearchQuery = z.infer<typeof SearchQuery>;
export type SearchResult = z.infer<typeof SearchResult>;
export type SortMode = z.infer<typeof SortMode>;
export type Filters = z.infer<typeof Filters>;
export type Metadata = z.infer<typeof Metadata>;
