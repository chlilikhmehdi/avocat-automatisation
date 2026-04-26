import { useState, useEffect } from 'react';

/**
 * Retarde la mise à jour d'une valeur après un délai (debounce).
 * Utile pour les champs de recherche.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}