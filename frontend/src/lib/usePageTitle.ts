import { useEffect } from 'react';

/** Título de página sin violar reglas de render (oxlint react/immutability). */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
