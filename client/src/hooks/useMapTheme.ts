/*
 * useMapTheme — Reactive hook that returns the Mapbox style URL
 * matching the current app theme (dark-v11 / light-v11).
 * Updates automatically when the user toggles the theme.
 */

import { useEffect, useState } from "react";

export const MAP_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
export const MAP_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";

function currentStyle(): string {
  return document.documentElement.classList.contains("dark")
    ? MAP_DARK_STYLE
    : MAP_LIGHT_STYLE;
}

export function useMapTheme() {
  const [style, setStyle] = useState<string>(currentStyle);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setStyle(currentStyle());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return {
    /** Reactive style URL — updates when theme changes */
    mapStyle: style,
    /** Imperatively read the current style without re-render */
    getMapStyle: currentStyle,
    MAP_DARK_STYLE,
    MAP_LIGHT_STYLE,
  };
}
