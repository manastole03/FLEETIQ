import { Truck } from "lucide-react";

export default function Loading() {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-5 text-white">
      <div className="truck-loader-stage">
        <div className="map-pulse" />
        <div className="loader-truck">
          <Truck className="h-9 w-9 text-white" />
        </div>
        <div className="loader-road" />
        <p className="mt-8 text-center text-sm font-black">
          Syncing loads, HOS, margin, and route risk
        </p>
      </div>
    </main>
  );
}
