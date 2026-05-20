import { AgendaClient } from './AgendaClient';

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1b1b23]">Agenda Diária</h1>
        <p className="text-sm text-[#475569] mt-0.5">Gerencie os atendimentos do dia</p>
      </div>
      <AgendaClient />
    </div>
  );
}
