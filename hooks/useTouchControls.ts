"use client";

export function useTouchControls() {
  const press = (key: string) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };

  const release = (key: string) => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  };

  return { press, release };
}
