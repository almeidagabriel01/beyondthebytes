import type { Metadata } from 'next';
import { HistoricoClient } from './HistoricoClient';

export const metadata: Metadata = { title: 'Histórico' };

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <HistoricoClient selectedId={id ?? null} />;
}
