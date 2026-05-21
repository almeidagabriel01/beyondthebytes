import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import type { AppointmentResponse, AppointmentEventResponse } from '@medschedule/shared';
import { AppointmentDetailClient } from './appointment-detail-client';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function fetchAppointment(
  id: string,
  cookieHeader: string,
): Promise<AppointmentResponse | null> {
  const res = await fetch(`${API}/appointments/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch appointment: ${res.status}`);
  return res.json() as Promise<AppointmentResponse>;
}

async function fetchEvents(id: string, cookieHeader: string): Promise<AppointmentEventResponse[]> {
  const res = await fetch(`${API}/appointments/${id}/events`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json() as Promise<AppointmentEventResponse[]>;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const [appointment, events] = await Promise.all([
    fetchAppointment(id, cookieHeader),
    fetchEvents(id, cookieHeader),
  ]);

  if (!appointment) notFound();

  return <AppointmentDetailClient appointment={appointment} events={events} />;
}
