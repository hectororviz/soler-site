import { useState } from 'react';
import { Download, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { downloadFlyer, type FlyerData } from './flyer';

export function FlyerButton({
  data,
  size = 'sm',
  label = 'Descargar flyer',
}: {
  data: FlyerData | null;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      await downloadFlyer(data);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError('No se pudo generar el flyer.');
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" size={size === 'sm' ? 'sm' : 'md'} onClick={run} disabled={pending}>
        {done ? <Check size={15} /> : <Download size={15} />}
        {pending ? 'Generando…' : done ? '¡Descargado!' : label}
      </Button>
      {error && (
        <span role="alert" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          <AlertTriangle size={14} /> {error}
        </span>
      )}
    </span>
  );
}
