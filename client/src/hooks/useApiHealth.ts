import { useState, useEffect } from "react";

let cachedStatus: boolean | null = null;

export function useApiHealth() {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(cachedStatus);

  useEffect(() => {
    if (cachedStatus !== null) return;
    const controller = new AbortController();
    fetch("/api/trpc/catalog.count", {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => {
        const ok = res.ok && (res.headers.get("content-type") || "").includes("json");
        cachedStatus = ok;
        setIsApiAvailable(ok);
      })
      .catch(() => {
        cachedStatus = false;
        setIsApiAvailable(false);
      });
    return () => controller.abort();
  }, []);

  return { isApiAvailable, isStaticMode: isApiAvailable === false };
}
