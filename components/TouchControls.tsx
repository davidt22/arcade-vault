"use client";

import { useTouchControls } from "@/hooks/useTouchControls";

interface Props {
  keyMap: Record<string, string>; // label → KeyboardEvent.key
}

const btnStyle: React.CSSProperties = {
  fontFamily: "var(--pixel)",
  fontSize: 20,
  color: "var(--cyan)",
  background: "rgba(0,245,255,0.08)",
  border: "2px solid rgba(0,245,255,0.4)",
  borderRadius: 8,
  width: 64,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  WebkitUserSelect: "none",
  touchAction: "none",
  cursor: "pointer",
};

export function TouchControls({ keyMap }: Props) {
  const { press, release } = useTouchControls();

  return (
    <div
      className="hidden [@media(pointer:coarse)]:flex"
      style={{
        gap: 12,
        padding: "12px 0",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      {Object.entries(keyMap).map(([label, key]) => (
        <button
          key={label}
          style={btnStyle}
          onTouchStart={(e) => {
            e.preventDefault();
            press(key);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            release(key);
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            release(key);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
