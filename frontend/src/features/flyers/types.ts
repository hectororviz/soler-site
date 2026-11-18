/**
 * Motor de flyers deportivos: tipos, formatos, plantillas y opciones.
 * Un único renderer Canvas sirve a la vista previa y a la exportación PNG,
 * por lo que ambas son idénticas por construcción.
 */

export type TemplateId = 'editorial-clean' | 'matchday-stadium' | 'social-bold';

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
  { id: 'editorial-clean', label: 'Editorial Clean', hint: 'Premium claro, aire y tipografía' },
  { id: 'matchday-stadium', label: 'Matchday Stadium', hint: 'Noche de estadio, VS protagonista' },
  { id: 'social-bold', label: 'Social Bold', hint: 'Impacto para stories y difusión' },
];

/** Colores institucionales configurables (se mezclan sobre los defaults de cada plantilla). */
export interface Palette {
  primary: string;
  accent: string;
  bg: string;
  ink: string;
}

export type DateStyle = 'long' | 'short' | 'both';
export type CrestTreatment = 'auto' | 'none' | 'ring' | 'glow' | 'plate';
export type ScheduleVariant = 'auto' | 'list' | 'columns' | 'cards' | 'table';
export type Composition = 'center' | 'compact' | 'asymmetric' | 'impact';
export type Intensity = 'low' | 'medium' | 'high';

export interface FlyerShow {
  tournament: boolean;
  round: boolean;
  day: boolean;
  venue: boolean;
  homeAway: boolean;
  slogan: boolean;
  web: boolean;
}

export interface FlyerOptions {
  template: TemplateId;
  format: FormatId;
  palette: Partial<Palette>;
  show: FlyerShow;
  /** Fondo personalizado (dataURL). Si es null se usa el fondo de la plantilla. */
  customBg: string | null;
  /** Formato de fecha. Por defecto solo largo (sin duplicar). */
  dateStyle: DateStyle;
  /** Tratamiento del escudo. `auto` = default de la plantilla. */
  crest: CrestTreatment;
  /** Variante de horarios. `auto` = reacomoda hasta mostrar todo antes de resumir. */
  schedule: ScheduleVariant;
  composition: Composition;
  intensity: Intensity;
}

export interface FlyerRow {
  category: string;
  time: string;
}

/** Contenido real del fixture. Nada se inventa: todo viene del cruce. */
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

export const DEFAULT_SHOW: FlyerShow = {
  tournament: true,
  round: true,
  day: true,
  venue: true,
  homeAway: true,
  slogan: true,
  web: true,
};

export function defaultOptions(): FlyerOptions {
  return {
    template: 'social-bold',
    format: 'story',
    palette: {},
    show: { ...DEFAULT_SHOW },
    customBg: null,
    dateStyle: 'long',
    crest: 'auto',
    schedule: 'auto',
    composition: 'center',
    intensity: 'medium',
  };
}

/** Tratamiento de escudo por defecto de cada plantilla. */
export const TEMPLATE_CREST_DEFAULT: Record<TemplateId, Exclude<CrestTreatment, 'auto'>> = {
  'editorial-clean': 'plate',
  'matchday-stadium': 'glow',
  'social-bold': 'ring',
};

export function resolveCrest(opts: FlyerOptions): Exclude<CrestTreatment, 'auto'> {
  return opts.crest === 'auto' ? TEMPLATE_CREST_DEFAULT[opts.template] : opts.crest;
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
