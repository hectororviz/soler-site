import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../services/api';
import { ApiError } from '../../types';

export function useAdminList<T>(key: string, path: string | null) {
  return useQuery({
    queryKey: [key, path],
    queryFn: () => api.get<T>(path as string, { admin: true }),
    enabled: !!path,
    retry: 1,
  });
}

export function useAdminWrite(onDone: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, keys: string[] = []) => {
    setError(null);
    try {
      await fn();
      for (const k of keys) await qc.invalidateQueries({ queryKey: [k] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operación fallida.');
    }
  };
  return { run, error };
}
