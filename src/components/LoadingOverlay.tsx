"use client";

export default function LoadingOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        color: "#e0e0ff",
      }}
    >
      <h2 style={{ fontSize: "1.6rem", marginBottom: 20, letterSpacing: 2 }}>
        ECEB Building Viewer
      </h2>
      <div
        style={{
          width: 360,
          height: 14,
          background: "#2a2a4e",
          borderRadius: 7,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "60%",
            background: "linear-gradient(90deg, #4472C4, #00B0F0)",
            borderRadius: 7,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ marginTop: 14, fontSize: "0.9rem", color: "#8888bb" }}>
        Loading building data...
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
