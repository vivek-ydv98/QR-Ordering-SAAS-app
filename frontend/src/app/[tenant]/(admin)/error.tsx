'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-black text-white mb-2">Something went wrong</h2>
      <p className="text-xs text-slate-400 mb-6 max-w-md">
        {error.message || 'An unexpected error occurred in the admin panel.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
      >
        Try again
      </button>
    </div>
  );
}
