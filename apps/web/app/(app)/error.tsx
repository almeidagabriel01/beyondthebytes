'use client';

import { useEffect } from 'react';

export default function AppSegmentError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[app-segment-error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#f8fafc]">
      <div className="max-w-md bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
        <span className="material-symbols-outlined text-[#ba1a1a] text-[48px] mb-4 block">
          error_outline
        </span>
        <h1 className="text-[18px] font-semibold text-[#0f172a] mb-2">Algo deu errado</h1>
        <p className="text-[13px] text-[#64748b] mb-6">
          Ocorreu um erro inesperado nesta página. Tente novamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#4648d4] text-white text-[13px] font-semibold hover:bg-[#3a3cb8]"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
