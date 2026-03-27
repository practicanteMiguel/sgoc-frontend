// hooks/use-has-hydrated.ts
import { useState, useEffect } from "react";
import { useAuthStore } from "@/src/stores/auth.store";

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    
    setHydrated(true);
  }, []);

  return hydrated;
}