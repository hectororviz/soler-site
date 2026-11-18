/**
 * Motor de flyers deportivos: tipos, formatos, plantillas y opciones.
 * Un único renderer Canvas sirve a la vista previa y a la exportación PNG,
 * por lo que ambas son idénticas por construcción.
 */

export type TemplateId = 'matchday-pro' | 'minimal-premium' | 'football-energy';

export type FormatId = 'story' | 'feed' | 'square';

export interface FormatSpec {
  id: FormatId;
  label: string;
  w: number;
  h: number;
}

export const FORMATS: Record<FormatId, FormatSpec> = {
  story: { id: 'story', label: 'Historia 9:16', w: 1080, h: 1920 },
  feed: { id: 'feed', label: 'Feed 4:5', w: 1080, h: 1350 },
  square: { id: 'square', label: 'Cuadrado 1:1', w: 1080, h: 1080 },
};

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  hint: string;
}

export const TEMPLATES: TemplateMeta[] = [
  { id: 'matchday-pro', label: 'Matchday Pro', hint: 'Estadio nocturno, focos y dorado' },
  { id: 'minimal-premium', label: 'Minimal Premium', hint: 'Editorial claro, alto contraste' },
  { id: 'football-energy', label: 'Football Energy', hint: 'Diagonales y energía de campaña' },
];

/** Colores institucionales configurables (se mezclan sobre los defaults de cada plantilla). */
export interface Palette {
  primary: string;
  accent: string;
  bg: string;
  ink: string;
}

export interface FlyerShow {
  venue: boolean;
  day: boolean;
  round: boolean;
  footer: boolean;
}

export interface FlyerOptions {
  template: TemplateId;
  format: FormatId;
  palette: Partial<Palette>;
  show: FlyerShow;
  /** Fondo personalizado (dataURL). Si es null se usa el fondo de la plantilla. */
  customBg: string | null;
}

export interface FlyerRow {
  category: string;
  time: string;
}

/** Contenido real del fixture. Nada se inventa: todo viene del cruce publicado. */
export interface FlyerContent {
  tournamentName: string;
  roundLabel: string;
  dayTitle: string;
  daySubtitle: string;
  homeName: string;
  homeCrest: string | null;
  awayName: string;
  awayCrest: string | null;
  venue: string | null;
  rows: FlyerRow[];
}

export const DEFAULT_SHOW: FlyerShow = { venue: true, day: true, round: true, footer: true };

export function defaultOptions(): FlyerOptions {
  return { template: 'matchday-pro', format: 'story', palette: {}, show: { ...DEFAULT_SHOW }, customBg: null };
}

export function flyerFileName(content: FlyerContent, opts: FlyerOptions): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  return `flyer-${opts.template}-${opts.format}-${slug(content.tournamentName)}-${slug(content.roundLabel)}-${slug(content.homeName)}-vs-${slug(content.awayName)}.png`;
}
