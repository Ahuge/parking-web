import { describe, it, expect } from "vitest";
import { computeResults } from "@/lib/pricing-engine";
import type { ParkingLot, PricingRule, SearchQuery } from "@/lib/schemas";

const mockLot: ParkingLot = {
  id: "lot-1",
  operator: "easypark",
  name: "EasyPark Plaza",
  address: "123 Main St, Vancouver",
  coordinates: { lat: 49.282, lng: -123.12 },
  features: { ev: false, covered: true },
  hours: {
    mon: { open: "06:00", close: "23:00" },
    tue: { open: "06:00", close: "23:00" },
    wed: { open: "06:00", close: "23:00" },
    thu: { open: "06:00", close: "23:00" },
    fri: { open: "06:00", close: "23:00" },
    sat: { open: "07:00", close: "22:00" },
    sun: { open: "08:00", close: "20:00" },
  },
  metadata: {
    source: "test",
    confidence: 1,
    lastUpdated: "2026-06-16T00:00:00Z",
  },
};

const mockRule: PricingRule = {
  id: "rule-1",
  lotId: "lot-1",
  type: "hourly",
  hourlyRate: 3,
  maxDaily: 18,
  timeRanges: [{ start: "00:00", end: "23:59", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }],
};

function makeQuery(overrides?: Partial<SearchQuery>): SearchQuery {
  return {
    destination: "Rogers Arena",
    coordinates: { lat: 49.2775, lng: -123.1088 },
    arrival: "2026-06-17T18:30:00Z",
    departure: "2026-06-17T22:30:00Z",
    ...overrides,
  };
}

describe("pricing engine", () => {
  describe("basic price computation", () => {
    it("computes price for hourly rate", () => {
      const results = computeResults([mockLot], [mockRule], makeQuery());
      expect(results).toHaveLength(1);
      // 18:30-22:30 = 4 hours = 4 * $3 = $12
      expect(results[0].price).toBe(12);
    });

    it("caps at max daily", () => {
      const rule = { ...mockRule, hourlyRate: 10, maxDaily: 25 };
      const query = makeQuery({
        arrival: "2026-06-17T14:00:00Z",
        departure: "2026-06-18T04:00:00Z",
      });
      const results = computeResults([mockLot], [rule], query);
      // 14 hours × $10 = $140, capped at $25
      expect(results[0].price).toBe(25);
    });

    it("handles flat rate", () => {
      const rule = { ...mockRule, type: "flat" as const, amount: 15, hourlyRate: undefined };
      const results = computeResults([mockLot], [rule], makeQuery());
      expect(results[0].price).toBe(15);
    });

    it("handles incremental pricing", () => {
      const rule = {
        ...mockRule,
        type: "incremental" as const,
        increments: [
          { minutes: 60, price: 5 },
          { minutes: 60, price: 3 },
        ],
        hourlyRate: undefined,
      };
      const results = computeResults([mockLot], [rule], makeQuery());
      // 4 hours: first hour $5 + 3 hours * $3 = $14
      expect(results[0].price).toBe(14);
    });
  });

  describe("effective price with walking penalty", () => {
    it("applies $1/min walking penalty", () => {
      const results = computeResults([mockLot], [mockRule], makeQuery());
      const { price, walkingMinutes, effectivePrice } = results[0];
      expect(effectivePrice).toBe(price + walkingMinutes);
    });
  });

  describe("sort modes", () => {
    it("defaults to best-value sort", () => {
      const lotA = { ...mockLot, id: "a", name: "Far Cheap", coordinates: { lat: 49.3, lng: -123.1 } };
      const lotB = { ...mockLot, id: "b", name: "Near Expensive", coordinates: { lat: 49.278, lng: -123.109 } };
      const ruleA: PricingRule = { ...mockRule, id: "ra", lotId: "a", hourlyRate: 2 };
      const ruleB: PricingRule = { ...mockRule, id: "rb", lotId: "b", hourlyRate: 10 };
      const results = computeResults([lotA, lotB], [ruleA, ruleB], makeQuery());
      // Should sort by effectivePrice ascending
      expect(results[0].effectivePrice).toBeLessThanOrEqual(results[1].effectivePrice);
    });

    it("sorts by cheapest", () => {
      const lotA = { ...mockLot, id: "a", name: "Cheap", coordinates: { lat: 49.3, lng: -123.1 } };
      const lotB = { ...mockLot, id: "b", name: "Expensive", coordinates: { lat: 49.278, lng: -123.109 } };
      const ruleA: PricingRule = { ...mockRule, id: "ra", lotId: "a", hourlyRate: 2, maxDaily: undefined };
      const ruleB: PricingRule = { ...mockRule, id: "rb", lotId: "b", hourlyRate: 10, maxDaily: undefined };
      const results = computeResults([lotA, lotB], [ruleA, ruleB], makeQuery(), "cheapest");
      expect(results[0].price).toBe(8);
      expect(results[1].price).toBe(40);
    });

    it("sorts by closest", () => {
      const lotA = { ...mockLot, id: "a", name: "Far", coordinates: { lat: 49.3, lng: -123.1 } };
      const lotB = { ...mockLot, id: "b", name: "Close", coordinates: { lat: 49.278, lng: -123.109 } };
      const ruleA: PricingRule = { ...mockRule, id: "ra", lotId: "a", hourlyRate: 2, maxDaily: undefined };
      const ruleB: PricingRule = { ...mockRule, id: "rb", lotId: "b", hourlyRate: 10, maxDaily: undefined };
      const results = computeResults([lotA, lotB], [ruleA, ruleB], makeQuery(), "closest");
      expect(results[0].lot.id).toBe("b");
      expect(results[1].lot.id).toBe("a");
    });
  });

  describe("filters", () => {
    it("filters by EV charging", () => {
      const evLot = { ...mockLot, id: "ev", features: { ev: true, covered: false } };
      const noEvLot = { ...mockLot, id: "no-ev", features: { ev: false, covered: false } };
      const rule: PricingRule = { ...mockRule, id: "r", lotId: "ev" };
      const rule2: PricingRule = { ...mockRule, id: "r2", lotId: "no-ev" };
      const results = computeResults([evLot, noEvLot], [rule, rule2], makeQuery(), "best-value", { ev: true });
      expect(results).toHaveLength(1);
      expect(results[0].lot.id).toBe("ev");
    });

    it("filters by covered parking", () => {
      const covered = { ...mockLot, id: "c", features: { ev: false, covered: true } };
      const uncovered = { ...mockLot, id: "u", features: { ev: false, covered: false } };
      const rc: PricingRule = { ...mockRule, id: "rc", lotId: "c" };
      const ru: PricingRule = { ...mockRule, id: "ru", lotId: "u" };
      const results = computeResults([covered, uncovered], [rc, ru], makeQuery(), "best-value", { covered: true });
      expect(results).toHaveLength(1);
      expect(results[0].lot.id).toBe("c");
    });

    it("filters by operator", () => {
      const impark = { ...mockLot, id: "impark", operator: "impark" as const };
      const ep = { ...mockLot, id: "ep", operator: "easypark" as const };
      const ri: PricingRule = { ...mockRule, id: "ri", lotId: "impark" };
      const re: PricingRule = { ...mockRule, id: "re", lotId: "ep" };
      const results = computeResults([impark, ep], [ri, re], makeQuery(), "best-value", { operators: ["impark"] });
      expect(results).toHaveLength(1);
      expect(results[0].lot.id).toBe("impark");
    });

    it("filters by max walking distance", () => {
      const far = { ...mockLot, id: "far", coordinates: { lat: 49.35, lng: -123.1 } };
      const close = { ...mockLot, id: "close", coordinates: { lat: 49.278, lng: -123.109 } };
      const rf: PricingRule = { ...mockRule, id: "rf", lotId: "far", maxDaily: undefined };
      const rc: PricingRule = { ...mockRule, id: "rc", lotId: "close", maxDaily: undefined };
      const results = computeResults([far, close], [rf, rc], makeQuery(), "best-value", { maxWalkingMinutes: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].lot.id).toBe("close");
    });
  });

  describe("edge cases", () => {
    it("skips lots closed at arrival", () => {
      const closed = { ...mockLot, hours: { ...mockLot.hours, wed: null } };
      const rule: PricingRule = { ...mockRule, id: "r", lotId: "closed" };
      const results = computeResults([closed], [rule], makeQuery());
      expect(results).toHaveLength(0);
    });

    it("skips lots with no matching rules", () => {
      const results = computeResults([mockLot], [], makeQuery());
      expect(results).toHaveLength(0);
    });

    it("handles cross-midnight windows", () => {
      const rule = { ...mockRule, hourlyRate: 2 };
      const query = makeQuery({
        arrival: "2026-06-17T22:00:00Z",
        departure: "2026-06-18T07:00:00Z",
      });
      const results = computeResults([mockLot], [rule], query);
      // 3pm-midnight Vancouver: departure is after 23:00 close → excluded
      expect(results).toHaveLength(0);
    });
  });
});
