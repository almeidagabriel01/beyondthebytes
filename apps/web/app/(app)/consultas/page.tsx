import type { Metadata } from 'next';
import { ConsultasClient } from './ConsultasClient';

export const metadata: Metadata = { title: 'Consultas' };

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <ConsultasClient selectedId={id ?? null} />;
}
