import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-8 text-center">
      {/* Giant watermark 404 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <span className="text-[20vw] font-bold leading-none text-primary select-none">404</span>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Illustration */}
        <div className="mb-6 w-full max-w-[320px] aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-[0_4px_24px_rgba(15,23,42,0.04)] transition-transform duration-700 ease-out hover:scale-105 flex items-center justify-center">
          <Image
            src="/404-illustration.png"
            alt="Página não encontrada"
            width={320}
            height={320}
            className="w-full h-full object-cover mix-blend-multiply"
            unoptimized
          />
        </div>

        <h1
          className="mb-2 text-4xl font-bold tracking-tight text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Página não encontrada
        </h1>
        <p className="mx-auto mb-8 max-w-md text-base text-muted-foreground">
          A consulta ou página que você está procurando parece não existir ou foi movida. Verifique
          o endereço ou retorne ao início.
        </p>

        <Link
          href="/dashboard"
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-xs font-semibold tracking-wider text-primary-foreground shadow-[0_4px_12px_rgba(70,72,212,0.25)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_6px_16px_rgba(70,72,212,0.35)] active:scale-95"
        >
          <span
            className="material-symbols-outlined text-lg leading-none transition-transform group-hover:-translate-x-1"
            aria-hidden="true"
          >
            arrow_back
          </span>
          Voltar para dashboard
        </Link>
      </div>
    </main>
  );
}
