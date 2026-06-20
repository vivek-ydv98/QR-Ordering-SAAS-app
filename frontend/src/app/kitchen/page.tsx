'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { KOT } from '../../types';
import { Clock, CheckCircle, Flame, Check } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function KitchenDisplaySystem() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);

  // Resolve tenantId from auth token stored after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          if (profile.restaurantId) {
            setTenantId(profile.restaurantId);
          }
        } catch {
          // Profile is malformed — socket will remain disconnected
        }
      }
    }
  }, []);

  const { subscribeToEvent, emitEvent } = useSocket(tenantId);

  // Play synthesized alarm sound
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Simple high-low chime
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);

      osc1.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.12);

      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio synthesis failed or was blocked by browser permissions.', e);
    }
  };

  // Subscribe to socket events
  useEffect(() => {
    const unsubscribeNewOrder = subscribeToEvent('order:create', (newOrder: any) => {
      playAlertSound();
      const mappedOrder: KOT = {
        id: newOrder.orderId,
        kotNumber: newOrder.orderId.replace('ord_', '#').toUpperCase().substring(0, 5),
        tableId: newOrder.tableId,
        tableName: newOrder.tableName,
        createdAt: newOrder.createdAt,
        elapsedMinutes: 0,
        status: 'PENDING',
        items: newOrder.items,
        specialInstructions: newOrder.specialInstructions
      };
      setKots(prev => [...prev, mappedOrder]);
    });

    return () => {
      unsubscribeNewOrder();
    };
  }, [subscribeToEvent]);

  // Handle ticking timers
  useEffect(() => {
    const interval = setInterval(() => {
      setKots(prev =>
        prev.map(kot => {
          const elapsed = Math.round((Date.now() - new Date(kot.createdAt).getTime()) / 60000);
          return { ...kot, elapsedMinutes: elapsed };
        })
      );
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = (kotId: string, nextStatus: KOT['status']) => {
    let statusMsg = '';
    switch (nextStatus) {
      case 'ACCEPTED':
        statusMsg = 'Order ticket accepted.';
        break;
      case 'PREPARING':
        statusMsg = 'Order is now preparing in the kitchen.';
        break;
      case 'READY':
        statusMsg = 'Order is ready for serving!';
        break;
      case 'SERVED':
        statusMsg = 'Order marked as served.';
        break;
    }
    if (statusMsg) {
      useToastStore.getState().showSuccess(statusMsg);
    }

    setKots(prev =>
      prev.map(kot => {
        if (kot.id === kotId) {
          // Fire order status socket trigger
          emitEvent('order_status_update', { orderId: kotId, status: nextStatus });
          return { ...kot, status: nextStatus };
        }
        return kot;
      }).filter(kot => nextStatus !== 'SERVED' ? true : kot.id !== kotId)
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* KDS Control Header */}
      <header className="flex justify-between items-center bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-wider text-white flex items-center gap-2">
            KITCHEN DISPLAY TERMINAL (KDS)
          </h1>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5">
            {tenantId ? 'CONNECTED' : 'AUTH REQUIRED'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="font-extrabold text-slate-300">
              Queue: {kots.filter(k => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(k.status)).length} Tickets
            </span>
          </div>
        </div>
      </header>

      {/* Auth Warning */}
      {!tenantId && (
        <div className="bg-amber-950/60 border-b border-amber-800 px-6 py-3 text-xs text-amber-300 font-semibold">
          ⚠ No authenticated session found. Please log in via the admin portal to receive live kitchen orders.
        </div>
      )}

      {/* Main KDS Grid */}
      <main className="flex-1 overflow-x-auto p-6 flex gap-6 items-start hide-scrollbar">
        {kots
          .filter(k => k.status !== 'SERVED' && k.status !== 'CANCELLED')
          .map(kot => {
            const isLate = kot.elapsedMinutes >= 15;
            const isWarning = kot.elapsedMinutes >= 10 && kot.elapsedMinutes < 15;

            let headerBg = 'bg-slate-900 border-slate-800';
            let elapsedBadge = 'bg-slate-800 text-slate-400';
            
            if (isLate) {
              headerBg = 'bg-rose-950/80 border-rose-800 text-rose-100 animate-pulse';
              elapsedBadge = 'bg-rose-500 text-rose-950 font-black';
            } else if (isWarning) {
              headerBg = 'bg-amber-950/60 border-amber-800 text-amber-100';
              elapsedBadge = 'bg-amber-500 text-amber-950 font-black';
            }

            return (
              <div
                key={kot.id}
                className={`w-[300px] flex-shrink-0 bg-slate-900/60 border-2 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
                  isLate ? 'border-rose-500' : isWarning ? 'border-amber-500' : 'border-slate-800/80'
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex justify-between items-start ${headerBg}`}>
                  <div>
                    <h2 className="text-base font-black text-white leading-tight">{kot.tableName}</h2>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono" suppressHydrationWarning>
                      KOT: {kot.kotNumber} • Placed:{' '}
                      {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${elapsedBadge}`}>
                    {kot.elapsedMinutes} MINS
                  </span>
                </div>

                {/* Items Container */}
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto max-h-[400px]">
                  {kot.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-slate-900/60 pb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={item.isVeg ? 'veg-stamp scale-90' : 'nonveg-stamp scale-90'}></span>
                          <span className="font-extrabold text-sm text-slate-100">{item.name}</span>
                        </div>
                        {item.customizations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1 ml-5">
                            {item.customizations.map((c, cIdx) => (
                              <span key={cIdx} className="text-[9px] font-bold bg-slate-950 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-base font-black text-white ml-2 bg-slate-950 border border-slate-800 w-8 h-8 rounded-lg flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                  ))}

                  {kot.specialInstructions && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-[11px] leading-relaxed">
                      <strong>Cooking Notes:</strong> {kot.specialInstructions}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/40">
                  {kot.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'ACCEPTED')}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:opacity-95"
                    >
                      Accept Ticket
                    </button>
                  )}
                  {kot.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'PREPARING')}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-amber-400"
                    >
                      <Flame className="w-4 h-4" /> Start Preparing
                    </button>
                  )}
                  {kot.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'READY')}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-400"
                    >
                      <CheckCircle className="w-4 h-4" /> Complete / Ready
                    </button>
                  )}
                  {kot.status === 'READY' && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-400"
                    >
                      <Check className="w-4 h-4" /> Served / Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        {kots.filter(k => k.status !== 'SERVED' && k.status !== 'CANCELLED').length === 0 && (
          <div className="flex-1 h-64 flex flex-col justify-center items-center text-slate-500 text-sm">
            <CheckCircle className="w-12 h-12 text-slate-700 mb-2 animate-bounce" />
            No active orders in the queue. You&apos;re all caught up!
          </div>
        )}
      </main>
    </div>
  );
}
