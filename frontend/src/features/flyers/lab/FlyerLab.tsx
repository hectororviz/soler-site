/**
 * Laboratorio de flyers — SOLO desarrollo (ruta /flyer-lab, eliminada en prod).
 * Renderiza la matriz plantillas × formatos con datos de prueba y reporta
 * dimensiones + varianza de píxeles para verificación automatizada.
 */
import { useEffect, useRef, useState } from 'react';
import { FORMATS, TEMPLATES, defaultOptions, type FlyerContent, type FlyerOptions } from '../types';
import { renderFlyerCanvas } from '../engine';

function demoContent(full: boolean): FlyerContent {
  const cats = full
    ? ['2011', '2012', '2013', '2014', '2015', '2016', '2017']
    : ['Sub 9', 'Sub 11', 'Sub 13', 'Sub 15', 'Sub 17', 'Primera', 'Damas', 'Reserva', 'Senior', 'Veteranos', 'Mixto'];
  return {
    tournamentName: full ? 'Juveniles Domingos' : 'Fútbol Femenino Extra Largo Para Probar Ajuste',
    roundLabel: 'Fecha 8',
    dayTitle: full ? 'DOMINGO 23 DE NOVIEMBRE' : 'DÍA A CONFIRMAR',
    daySubtitle: full ? '23/11/2026' : 'Horarios sujetos a cambios',
    homeName: 'Soler',
    homeCrest: '/escudo.svg',
    awayName: full ? 'Torino' : 'Atlético Deportivo Social y Cultural de Grand Bourg',
    awayCrest: null,
    venue: full ? 'Cancha Soler' : null,
    rows: cats.map((c, i) => ({
      category: c,
      time: full ? `${9 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}` : i % 3 === 0 ? 'A confirmar' : `1${i}:00`,
    })),
  };
}

interface LabResult {
  template: string;
  format: string;
  w: number;
  h: number;
  distinct: number;
  ok: boolean;
}

export function FlyerLab() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<LabResult[]>([]);
  const [phase, setPhase] = useState('renderizando…');

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: LabResult[] = [];
      const full = demoContent(true);
      const stress = demoContent(false);
      for (const t of TEMPLATES) {
        const combos: { opts: FlyerOptions; content: FlyerContent; tag: string }[] = [
          ...Object.values(FORMATS).map((f) => ({
            opts: { ...defaultOptions(), template: t.id, format: f.id },
            content: t.id === 'social-bold' ? stress : full,
            tag: `${t.id} / ${f.id}`,
          })),
          // Configuración completa: ejercita composición asimétrica, fecha
          // doble, placa de escudo, variante tabla e intensidad alta.
          {
            opts: {
              ...defaultOptions(),
              template: t.id,
              format: 'story',
              composition: 'asymmetric',
              dateStyle: 'both',
              crest: 'plate',
              schedule: 'table',
              intensity: 'high',
              show: { tournament: true, round: true, day: true, venue: true, homeAway: true, slogan: true, web: true },
            },
            content: stress,
            tag: `${t.id} / story / full`,
          },
        ];
        for (const c of combos) {
          try {
            const canvas = await renderFlyerCanvas(c.content, c.opts);
            const dimOk = canvas.width === FORMATS[c.opts.format].w && canvas.height === FORMATS[c.opts.format].h;
            // Varianza: contar colores distintos en una muestra (detecta canvas en blanco/negro plano).
            const g = canvas.getContext('2d');
            const sample = g?.getImageData(0, 0, canvas.width, canvas.height);
            const seen = new Set<number>();
            if (sample) {
              const step = Math.max(1, Math.floor(sample.data.length / 4 / 400));
              for (let i = 0; i < sample.data.length / 4; i += step) {
                const o = i * 4;
                const key = (sample.data[o] << 16) | (sample.data[o + 1] << 8) | sample.data[o + 2];
                seen.add(key);
                if (seen.size > 60) break;
              }
            }
            const ok = dimOk && seen.size > 20;
            out.push({ template: t.id, format: c.opts.format, w: canvas.width, h: canvas.height, distinct: seen.size, ok });
            if (alive && hostRef.current) {
              canvas.style.cssText = 'width:180px;height:auto;border:1px solid #ccc;';
              const wrap = document.createElement('figure');
              const cap = document.createElement('figcaption');
              cap.textContent = `${c.tag} ${ok ? 'OK' : 'FALLO'}`;
              wrap.append(cap, canvas);
              hostRef.current.append(wrap);
            }
          } catch (e) {
            out.push({ template: t.id, format: c.opts.format, w: 0, h: 0, distinct: 0, ok: false });
            console.error('flyer-lab', c.tag, e);
          }
        }
      }
      if (alive) {
        setResults(out);
        setPhase(out.every((r) => r.ok) ? 'done-ok' : 'done-fail');
        document.title = 'flyer-lab-done';
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Flyer lab (dev)</h1>
      <p id="flyer-lab-phase">{phase}</p>
      <pre id="flyer-lab-results">{JSON.stringify(results)}</pre>
      <div ref={hostRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} />
    </main>
  );
}
