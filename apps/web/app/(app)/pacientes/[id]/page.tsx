import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import type { PatientResponse } from '@medschedule/shared';
import { PatientDetailClient } from './patient-detail-client';

async function fetchPatient(id: string, cookieHeader: string): Promise<PatientResponse | null> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/patients/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch patient: ${res.status}`);
  return res.json() as Promise<PatientResponse>;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const patient = await fetchPatient(id, cookieHeader);
  if (!patient) notFound();

  return <PatientDetailClient patient={patient} />;
}
