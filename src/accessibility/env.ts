import { useEffect, useState } from "react";

export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("nowebgl") === "1") return false; // manual switch for testing and for readers
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query); const h = () => setM(mq.matches);
    mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
export const useIsMobile = () => useMedia("(max-width: 820px), (max-height: 500px)");
export const useCoarsePointer = () => useMedia("(pointer: coarse)");
