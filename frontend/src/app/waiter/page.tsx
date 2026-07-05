'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LegacyWaiterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
      <p className="text-xs font-bold uppercase tracking-wider">Redirecting to terminal...</p>
    </div>
  );
}
