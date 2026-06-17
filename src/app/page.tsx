import { Suspense } from "react";
import { ParkingApp } from "@/components/parking-app";
import data from "@/data/parking-data.json";

interface ParkingData {
  lots: import("@/lib/schemas").ParkingLot[];
  rules: import("@/lib/schemas").PricingRule[];
  generatedAt: string;
  schema: string;
}

export default function Home() {
  const { lots, rules } = data as unknown as ParkingData;
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-zinc-400 text-sm">Loading...</div>}>
      <ParkingApp lots={lots} rules={rules} />
    </Suspense>
  );
}
