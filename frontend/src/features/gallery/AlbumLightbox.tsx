import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { resolveCrest } from '../../services/api';
import { MiniMd } from '../../lib/miniMd';

export interface LightboxPhoto { imagePath: string; caption: string | null }

export function AlbumLightbox({
  title,
  body,
  photos,
  index,
  onIndex,
  onClose,
}: {
  title: string;
  body: string | null;
  photos: LightboxPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = photos.length;
  const photo = photos[Math.min(Math.max(index, 0), total - 1)];
  const src = photo ? resolveCrest(photo.imagePath) : null;
  const prev = () => onIndex((index - 1 + total) % total);
  const next = () => onIndex((index + 1) % total);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 text-white">
        <p className="truncate font-display text-lg font-bold uppercase">
          {title} <span className="ml-1 text-sm font-normal normal-case text-white/60">{index + 1}/{total}</span>
        </p>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Cerrar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-white/10 hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>
      <div
        className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 items-center justify-center gap-2 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <button
            onClick={prev}
            aria-label="Foto anterior"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {src && (
          <img
            src={src}
            alt={photo.caption ?? title}
            className="max-h-[62vh] w-auto max-w-full rounded-card object-contain"
          />
        )}
        {total > 1 && (
          <button
            onClick={next}
            aria-label="Foto siguiente"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div
        className="mx-auto w-full max-w-4xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {photo?.caption && <p className="text-sm font-semibold">{photo.caption}</p>}
        {body?.trim() && (
          <div className="mt-1 max-h-24 overflow-y-auto text-sm text-white/70">
            <MiniMd text={body} className="space-y-1" linkClassName="font-semibold text-gold hover:underline" />
          </div>
        )}
      </div>
    </div>
  );
}
