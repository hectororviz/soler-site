import { Suspense, lazy } from 'react';
import { Container } from '../components/layout/Container';
import { Skeleton } from '../components/ui/feedback';

export function PageLoader() {
  return (
    <Container className="py-10" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-64" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <p className="sr-only">Cargando página…</p>
    </Container>
  );
}

export const lazyPage = <T extends object>(loader: () => Promise<T>, name: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[name] as unknown as React.ComponentType })));

export const susp = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
