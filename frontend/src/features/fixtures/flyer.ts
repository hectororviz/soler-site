/**
 * Compatibilidad: la API anterior del flyer único ahora delega en el motor
 * de plantillas (Matchday Pro, historia 9:16 por defecto).
 * Los botones existentes siguen funcionando y heredan el nuevo diseño.
 */
import type { FixtureClash, FixtureRound } from '../../types';
import { buildContent, contentFromPublicRound } from '../flyers/content';
import { downloadBlob, renderFlyerCanvas } from '../flyers/engine';
import { defaultOptions, flyerFileName as engineFileName, type FlyerContent } from '../flyers/types';

export type FlyerData = FlyerContent;

export interface FlyerClubInput {
  name: string;
  shortName: string;
  crestUrl?: string | null;
  crestPath?: string | null;
  mapsUrl?: string | null;
}

export interface FlyerCategoryInput {
  categoryName: string;
  kickoff: string | null;
  venue?: string | null;
}

export const FLYER_W = 1080;
export const FLYER_H = 1920;

export function flyerFileName(data: FlyerData): string {
  return engineFileName(data, defaultOptions());
}

export function buildFlyerData(args: {
  tournamentName: string;
  roundLabel: string;
  roundDate?: string | null;
  home: FlyerClubInput;
  away: FlyerClubInput;
  categories: FlyerCategoryInput[];
}): FlyerData {
  return buildContent(args);
}

export function flyerFromPublicRound(tournamentName: string, round: FixtureRound, clash: FixtureClash): FlyerData {
  return contentFromPublicRound(tournamentName, round, clash);
}

export async function renderFlyer(data: FlyerData): Promise<HTMLCanvasElement> {
  return renderFlyerCanvas(data, defaultOptions());
}

export async function downloadFlyer(data: FlyerData): Promise<string> {
  const opts = defaultOptions();
  const blob = await renderFlyerCanvas(data, opts).then(
    async (canvas) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen.'))), 'image/png');
      }),
  );
  const name = engineFileName(data, opts);
  downloadBlob(blob, name);
  return name;
}
