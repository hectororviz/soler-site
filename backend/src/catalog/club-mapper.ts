/** Compat: la DB guarda `crestPath` (/files/crests/...), el frontend consume `crestUrl`. */
export function toPublicClub<T extends { crestPath?: string | null }>(club: T | null | undefined) {
  if (!club || typeof club !== 'object') return club as unknown as T;
  if ('crestUrl' in (club as Record<string, unknown>)) return club as T & { crestUrl: string | null };
  return { ...(club as Record<string, unknown>), crestUrl: club.crestPath ?? null } as unknown as T & {
    crestUrl: string | null;
  };
}
