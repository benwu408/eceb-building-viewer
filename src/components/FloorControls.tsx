"use client";

interface FloorControlsProps {
  labels: string[];
  visibleFloors: boolean[];
  onChange: (visibleFloors: boolean[]) => void;
}

export default function FloorControls({ labels, visibleFloors, onChange }: FloorControlsProps) {
  const toggle = (index: number) => {
    const next = [...visibleFloors];
    next[index] = !next[index];
    onChange(next);
  };

  return (
    <div className="overlay-panel" style={{ position: "fixed", top: 16, right: 20 }}>
      <h3>FLOORS</h3>
      {labels.map((label, i) => (
        <div key={label} className="floor-item" onClick={() => toggle(i)}>
          <input
            type="checkbox"
            checked={visibleFloors[i]}
            onChange={() => toggle(i)}
            id={`fl${i}`}
          />
          <label htmlFor={`fl${i}`}>{label}</label>
        </div>
      ))}
    </div>
  );
}
