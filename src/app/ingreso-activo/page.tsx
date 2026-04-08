import { Suspense } from 'react';
import IngresoActivoClient from './IngresoActivoClient';

export const dynamic = 'force-dynamic';

export default function IngresoActivoPage() {
  return (
    <Suspense fallback={null}>
      <IngresoActivoClient />
    </Suspense>
  );
}
