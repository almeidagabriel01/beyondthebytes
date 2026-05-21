import type { Metadata } from 'next';
import { PacientesClient } from './PacientesClient';

export const metadata: Metadata = { title: 'Pacientes' };

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <PacientesClient selectedId={id ?? null} />;
}
