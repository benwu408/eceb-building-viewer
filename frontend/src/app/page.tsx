"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Legend from "@/components/Legend";
import FloorControls from "@/components/FloorControls";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { FloorData, Config } from "@/components/BuildingViewer";

const BuildingViewer = dynamic(() => import("@/components/BuildingViewer"), {
  ssr: false,
});

interface ApiResponse {
  floors: FloorData[];
  config: Config;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [visibleFloors, setVisibleFloors] = useState<boolean[]>([]);

  useEffect(() => {
    fetch("/floors.json")
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        setData(json);
        setVisibleFloors(json.floors.map(() => true));
      });
  }, []);

  if (!data) return <LoadingOverlay />;

  return (
    <>
      <BuildingViewer
        floors={data.floors}
        config={data.config}
        visibleFloors={visibleFloors}
      />

      <div
        style={{
          position: "fixed",
          top: 16,
          left: 20,
          color: "#e0e8ff",
          fontSize: "1.1rem",
          fontWeight: 600,
          letterSpacing: 1,
          textShadow: "0 2px 8px #000a",
          pointerEvents: "none",
        }}
      >
        ECEB Building Viewer
      </div>
      <div
        style={{
          position: "fixed",
          top: 40,
          left: 20,
          color: "#8888bb",
          fontSize: "0.75rem",
          pointerEvents: "none",
        }}
      >
        Electrical &amp; Computer Engineering Building — UIUC
      </div>

      <Legend />

      <FloorControls
        labels={data.floors.map((f) => f.label)}
        visibleFloors={visibleFloors}
        onChange={setVisibleFloors}
      />

      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          color: "#666699",
          fontSize: "0.72rem",
          textAlign: "right",
          pointerEvents: "none",
        }}
      >
        Drag to orbit · Scroll to zoom · Right-drag to pan
      </div>
    </>
  );
}
