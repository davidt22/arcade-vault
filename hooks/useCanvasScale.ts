"use client";

import { useEffect, useState } from "react";

export function useCanvasScale(nativeW: number, nativeH: number) {
  const getScale = () => {
    const vp = window.visualViewport;
    const vw = vp ? vp.width : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;
    return Math.min(vw / nativeW, vh / nativeH, 1);
  };

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => setScale(getScale());
    update();

    const vp = window.visualViewport;
    if (vp) {
      vp.addEventListener("resize", update);
      return () => vp.removeEventListener("resize", update);
    } else {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
  }, [nativeW, nativeH]);

  return scale;
}
