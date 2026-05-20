import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-3">
        <p className="text-8xl font-black tracking-tighter select-none" style={{ color: 'hsl(var(--foreground) / 0.1)' }}>
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          A página que você está procurando não existe ou foi movida para outro
          endereço.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
        }}
      >
        ← Voltar ao dashboard
      </Link>
    </main>
  );
}
