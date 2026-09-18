import { useEffect, useState } from "react";

const QUERY = "(max-width: 768px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => (typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
