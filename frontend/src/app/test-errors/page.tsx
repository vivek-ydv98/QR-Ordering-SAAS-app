'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Bomb, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';

export default function TestErrorsPage() {
  const [triggeredError, setTriggeredError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [shouldCrash, setShouldCrash] = useState(false);

  // Simulated React component crash
  if (shouldCrash) {
    throw new Error('Simulated React component crash triggered by audit test.');
  }

  const triggerError = async (status: number) => {
    const statusStr = String(status);
    setLoading(statusStr);
    setTriggeredError(null);
    try {
      await api.get(`/auth/test-error/${status}`);
      setTriggeredError(`Success (no error thrown for status ${status})`);
    } catch (err: any) {
      console.log('Caught error in sandbox page:', err);
      const message = err.response?.data?.message || err.message;
      setTriggeredError(`[Caught Status ${status}] Message: ${Array.isArray(message) ? message[0] : message}`);
    } finally {
      setLoading(null);
    }
  };

  const triggerNetworkTimeout = async () => {
    const id = 'timeout';
    setLoading(id);
    setTriggeredError(null);
    try {
      // Trigger request with 1ms timeout to force timeout interceptor trigger
      await api.get('/auth/test-error/200', {
        timeout: 1,
      });
      setTriggeredError('Timeout did not trigger');
    } catch (err: any) {
      console.log('Caught timeout error:', err);
      setTriggeredError(`[Caught Timeout] Message: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const triggerNetworkOffline = async () => {
    const id = 'offline';
    setLoading(id);
    setTriggeredError(null);
    try {
      // Query a completely non-existent server to simulate network connection error
      await api.get('http://localhost:9999/v1/auth/test-error/400');
      setTriggeredError('Offline request did not fail');
    } catch (err: any) {
      console.log('Caught offline error:', err);
      setTriggeredError(`[Caught Network Error] Message: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-2xl w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
        
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
          </Link>
          <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-slate-950 border border-slate-850 text-slate-400 rounded-full">
            QA Sandbox
          </span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-black text-xl shadow-lg shadow-rose-500/20 mb-3">
            ⚠️
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Resilience & Interceptor Sandbox
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate and audit error responses, toast alerts, network recovery, and crash boundaries.
          </p>
        </div>

        {/* Console Result Output */}
        <div className="mb-8 p-4 bg-slate-950/50 border border-slate-850 rounded-xl min-h-[70px] flex items-center justify-center text-center">
          {triggeredError ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{triggeredError}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-550">Click a button below to trigger an error scenario and observe the UI toast alert.</span>
          )}
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          
          <button
            onClick={() => triggerError(400)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === '400' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger 400 Bad Request'}
          </button>

          <button
            onClick={() => triggerError(401)} // Triggers unauthorized mock by custom status or 401
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Trigger 401 Redirect Test
          </button>

          <button
            onClick={() => triggerError(403)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === '403' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger 403 Forbidden'}
          </button>

          <button
            onClick={() => triggerError(404)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === '404' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger 404 Not Found'}
          </button>

          <button
            onClick={() => triggerError(429)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === '429' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger 429 Rate Limit'}
          </button>

          <button
            onClick={() => triggerError(500)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === '500' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger 500 Server Error'}
          </button>

          <button
            onClick={triggerNetworkTimeout}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === 'timeout' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger Timeout Request'}
          </button>

          <button
            onClick={triggerNetworkOffline}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading === 'offline' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Trigger Network Offline'}
          </button>

        </div>

        {/* Separator */}
        <div className="mt-8 pt-6 border-t border-slate-850 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            UI Crash Recovery
          </h2>
          
          <button
            onClick={() => setShouldCrash(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-xs font-bold text-rose-400 rounded-xl transition-all active:scale-[0.98]"
          >
            <Bomb className="w-4 h-4" />
            Crash React Component (Error Boundary)
          </button>
        </div>

      </div>
    </div>
  );
}
