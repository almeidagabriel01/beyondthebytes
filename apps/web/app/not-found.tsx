import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-4">
        <p className="select-none text-8xl font-black tracking-tighter text-foreground/10">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          A consulta ou página que você está procurando parece não existir ou foi movida para outro
          endereço.
        </p>
      </div>
      <Link
        href="/calendario"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="material-symbols-outlined text-lg leading-none" aria-hidden="true">
          arrow_back
        </span>
        Voltar para agenda
      </Link>
    </main>
  );
}
