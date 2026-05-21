'use client';

import { useEffect } from 'react';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[root-error]', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-[#0f172a] mb-2">Erro inesperado</h1>
          <p className="text-sm text-[#64748b] mb-6">
            A aplicação encontrou um erro. Tente recarregar a página.
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2 rounded-lg bg-[#4648d4] text-white text-sm font-semibold hover:bg-[#3a3cb8]"
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
