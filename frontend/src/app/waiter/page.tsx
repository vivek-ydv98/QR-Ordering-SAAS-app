'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Table, WaiterCall } from '../../types';
import { Bell, Check, Coffee } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function WaiterDashboard() {
  const [tables, setTables] = useState<Table[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [staffName, setStaffName] = useState<string>('');

  // Resolve tenantId and staff name from auth token stored after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          if (profile.restaurantId) {
            setTenantId(profile.restaurantId);
          }
          if (profile.fullName) {
            setStaffName(profile.fullName);
          }
        } catch {
          // Profile is malformed — socket will remain disconnected
        }
      }
    }
  }, []);

  const { subscribeToEvent } = useSocket(tenantId);

  useEffect(() => {
    const unsubscribeCall = subscribeToEvent('waiter:call', (call: WaiterCall) => {
      setCalls(prev => [call, ...prev]);
      useToastStore.getState().showWarning(`Service Call: ${call.tableName} requested ${call.requestType.toUpperCase()}`);
    });

    return () => {
      unsubscribeCall();
    };
  }, [subscribeToEvent]);

  const handleUpdateStatus = (tableId: string, status: Table['status']) => {
    setTables(prev =>
      prev.map(t => (t.id === tableId ? { ...t, status } : t))
    );
    useToastStore.getState().showSuccess(`Table status updated to ${status}.`);
  };

  const handleResolveCall = (callId: string) => {
    setCalls(prev => prev.filter(c => c.id !== callId));
    useToastStore.getState().showSuccess('Service request resolved.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans select-none">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wider text-white">WAITER OPERATIONS HUB</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {staffName ? `Staff: ${staffName}` : 'Floor Operations Terminal'}
          </p>
        </div>
        <div className="relative">
          <Bell className="w-5 h-5 text-slate-400" />
          {calls.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </div>
      </header>

      {/* Auth Warning */}
      {!tenantId && (
        <div className="mb-6 bg-amber-950/60 border border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-300 font-semibold">
          ⚠ No authenticated session found. Please log in via the admin portal to receive live service alerts.
        </div>
      )}

      {/* Main Grid split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Table Management (Left 2 Columns) */}
        <div className="md:col-span-2">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Table Layout Statuses</h2>
          
          {tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-slate-800 rounded-xl py-16 text-slate-500 text-sm">
              <Coffee className="w-10 h-10 text-slate-700 mb-3" />
              <p className="font-semibold">No tables loaded.</p>
              <p className="text-xs text-slate-600 mt-1">Table data will appear here once connected.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tables.map(table => {
                let statusBg = 'bg-slate-950 border-slate-800';
                let badgeColor = 'bg-slate-800 text-slate-400';
                
                if (table.status === 'OCCUPIED') {
                  statusBg = 'bg-primary/5 border-primary/20';
                  badgeColor = 'bg-primary text-primary-foreground';
                } else if (table.status === 'WAITING_BILL') {
                  statusBg = 'bg-amber-500/5 border-amber-500/20';
                  badgeColor = 'bg-amber-500 text-slate-950';
                } else if (table.status === 'DIRTY') {
                  statusBg = 'bg-rose-500/5 border-rose-500/20';
                  badgeColor = 'bg-rose-500 text-white';
                }

                return (
                  <div key={table.id} className={`p-4 rounded-xl border flex flex-col justify-between h-32 ${statusBg}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm text-white">{table.name}</span>
                      <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                        {table.status}
                      </span>
                    </div>

                    {/* Actions Selector */}
                    <div className="mt-4 flex flex-col gap-1.5">
                      <label className="text-[8px] text-slate-500 font-bold uppercase">Change Status</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                        {(['VACANT', 'OCCUPIED', 'DIRTY'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => handleUpdateStatus(table.id, st)}
                            className={`text-[8px] font-bold py-1 rounded transition-all ${
                              table.status === st ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {st.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Requests Log (Right Column) */}
        <div>
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Live Service Requests</h2>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 min-h-[300px] flex flex-col gap-3">
            {calls.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center py-12">
                <Coffee className="w-10 h-10 text-slate-800 mb-2" />
                <p className="text-xs">No active service alerts.</p>
              </div>
            ) : (
              calls.map(call => (
                <div key={call.id} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex justify-between items-center animate-pulse">
                  <div>
                    <h3 className="font-extrabold text-xs text-white">
                      {call.tableName} • {call.requestType.toUpperCase()}
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-1" suppressHydrationWarning>
                      Requested:{' '}
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveCall(call.id)}
                    className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg"
                    title="Mark resolved"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
