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
export type CrestTreatment = 'auto' | 'original' | 'none' | 'ring' | 'glow' | 'plate' | 'card' | 'crop';
export type ScheduleVariant = 'auto' | 'list' | 'columns' | 'cards' | 'table';
export type Composition = 'center' | 'compact' | 'asymmetric' | 'impact';
export type Intensity = 'low' | 'medium' | 'high';
export type Density = 'compact' | 'balanced' | 'airy';

export interface LayoutTuning {
  headerScale: number;
  headerDx: number;
  headerDy: number;
  /** Posición vertical del bloque fecha (pastilla + día). */
  dateDy: number;
  crestScale: number;
  crestHome: number;
  crestAway: number;
  crestGap: number;
  matchupScale: number;
  matchupDx: number;
  matchupDy: number;
  vsScale: number;
  scheduleScale: number;
  scheduleDy: number;
  rowScale: number;
  /** 0 = auto, 1/2 = forzar columnas en auto/columnas */
  scheduleCols: number;
  footerScale: number;
  footerDy: number;
  separation: number;
}

export interface TypographyTuning {
  /** Multiplicadores 0.8–1.4 */
  title: number;
  dateNum: number;
  dateText: number;
  names: number;
  category: number;
  time: number;
  weight: 600 | 700 | 800;
  /** Tracking px para titulares */
  tracking: number;
  align: 'auto' | 'center' | 'left';
}

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
  /** Quitar fondo blanco automáticamente (fotos/JPG de escudos). */
  removeWhite: boolean;
  /** Tolerancia del quita-fondo (10-60). */
  removeWhiteTol: number;
  layout: LayoutTuning;
  typography: TypographyTuning;
  density: Density;
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
    removeWhite: false,
    removeWhiteTol: 26,
    dateStyle: 'long',
    crest: 'auto',
    schedule: 'auto',
    composition: 'center',
    intensity: 'medium',
    layout: {
      headerScale: 1,
      headerDx: 0,
      headerDy: 0,
      dateDy: 0,
      crestScale: 1,
      crestHome: 1,
      crestAway: 1,
      crestGap: 0,
      matchupScale: 1,
      matchupDx: 0,
      matchupDy: 0,
      vsScale: 1,
      scheduleScale: 1,
      scheduleDy: 0,
      rowScale: 1,
      scheduleCols: 0,
      footerScale: 1,
      footerDy: 0,
      separation: 0,
    },
    typography: {
      title: 1,
      dateNum: 1,
      dateText: 1,
      names: 1,
      category: 1,
      time: 1,
      weight: 800,
      tracking: 0,
      align: 'auto',
    },
    density: 'balanced',
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
