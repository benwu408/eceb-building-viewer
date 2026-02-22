"use client";

const LEGEND_ITEMS = [
  { color: "#002060", label: "Admin" },
  { color: "#4472C4", label: "Classroom" },
  { color: "#00B0F0", label: "Circulation" },
  { color: "#E48F24", label: "Lab" },
  { color: "#70AD47", label: "Office" },
  { color: "#FF66CC", label: "Student Space" },
  { color: "#B0B8C0", label: "General / Corridor" },
];

export default function Legend() {
  return (
    <div className="overlay-panel" style={{ position: "fixed", bottom: 20, left: 20 }}>
      <h3>ROOM TYPES</h3>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="legend-item">
          <div className="legend-swatch" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
