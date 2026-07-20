'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSocket } from '../../../../hooks/useSocket';
import { KOT, Table, WaiterCall } from '../../../../types';
import api from '../../../../lib/api';
import { useToastStore } from '../../../../store/useToastStore';
import { useDashboard } from '../DashboardContext';
import { ButtonLoader, InlineLoader, PageLoader } from '../../../../components/LoadingComponents';
import { Coffee, Users, ShoppingCart, Check, RefreshCw, Bell } from 'lucide-react';

export default function WaiterHubPage() {
  const { tenantId } = useDashboard();
  const { subscribeToEvent, emitEvent } = useSocket(tenantId || undefined);

  const [tables, setTables] = useState<Table[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [kots, setKots] = useState<KOT[]>([]);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const [updatingKotId, setUpdatingKotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isRefreshing = isLoading && !isInitialLoad;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [tablesRes, ordersRes, waiterCallsRes] = await Promise.all([
        api.get(`/restaurants/${tenantId}/tables`),
        api.get('/orders/active'),
        api.get(`/restaurants/${tenantId}/waiter-calls`).catch(() => ({ data: [] })),
      ]);
      if (tablesRes.data) setTables(tablesRes.data);
      if (ordersRes.data) {
        const statusMap: Record<string, KOT['status']> = {
          pending: 'PENDING', confirmed: 'ACCEPTED', preparing: 'PREPARING',
          ready: 'READY', served: 'SERVED', completed: 'COMPLETED', cancelled: 'CANCELLED',
        };
        setKots(ordersRes.data.map((order: any) => {
          const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          return {
            id: order.id, tableId: order.tableId,
            kotNumber: order.kotNumber || order.id.slice(0, 8).toUpperCase(),
            tableName: order.table?.name || order.tableId?.slice(0, 8) || 'T',
            status: statusMap[order.status] || 'PENDING',
            items: (order.items || []).map((item: any) => ({
              name: item.menuItem?.name || item.name || 'Item',
              quantity: item.quantity, isVeg: item.menuItem?.isVeg ?? item.isVeg ?? true,
              customizations: ((item.selectedAddons || item.customizations || []) as any[]).map((a: any) =>
                typeof a === 'string' ? a : a.optionName || a.addonName || a.name || ''
              ).filter(Boolean),
            })),
            specialInstructions: order.specialInstructions || '',
            createdAt: order.createdAt, elapsedMinutes: elapsed,
          };
        }));
      }
      if (waiterCallsRes?.data) setWaiterCalls(waiterCallsRes.data);
    } catch (err) {
      console.error('Failed to load waiter data:', err);
    } finally {
      setIsLoading(false); setIsInitialLoad(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeToEvent('order:create', () => fetchData());
    const unsub2 = subscribeToEvent('order_status_update', () => fetchData());
    const unsub3 = subscribeToEvent('waiter:call', (call: WaiterCall) => setWaiterCalls(prev => [call, ...prev]));
    const unsub4 = subscribeToEvent('waiter:resolve', (payload: { id: string }) => setWaiterCalls(prev => prev.filter(c => c.id !== payload.id)));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [tenantId, subscribeToEvent, fetchData]);

  const handleUpdateTableStatus = async (tableId: string, nextStatus: 'VACANT' | 'OCCUPIED') => {
    setUpdatingTableId(tableId);
    try {
      await api.patch(`/restaurants/tables/${tableId}`, { status: nextStatus });
      setTables(prev => prev.map(t => (t.id === tableId ? { ...t, status: nextStatus } : t)));
      useToastStore.getState().showSuccess(`Table status updated to ${nextStatus}.`);
    } catch (err) {
      useToastStore.getState().showError('Failed to update table status.');
    } finally { setUpdatingTableId(null); }
  };

  const handleUpdateOrderStatus = async (kotId: string, nextStatus: KOT['status']) => {
    const frontendToDbStatusMap: Record<KOT['status'], string> = {
      PENDING: 'pending', ACCEPTED: 'confirmed', PREPARING: 'preparing',
      READY: 'ready', SERVED: 'served', COMPLETED: 'completed', CANCELLED: 'cancelled',
    };
    setUpdatingKotId(kotId);
    try {
      await api.patch(`/orders/${kotId}/status`, { status: frontendToDbStatusMap[nextStatus] });
      emitEvent('order_status_update', { orderId: kotId, status: nextStatus });
      await fetchData();
    } catch (err) {
      useToastStore.getState().showError('Failed to update order status.');
    } finally { setUpdatingKotId(null); }
  };

  const activeTickets = useMemo(() => kots.filter(kot => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(kot.status)), [kots]);

  if (isInitialLoad) return <PageLoader message="Loading Waiter Hub..." theme="admin" />;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Waiter Operations Hub
            <span className="text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
              Waiter Mode
            </span>
            {isRefreshing && <InlineLoader message="Syncing..." className="ml-2" />}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage dining floor, active tickets, and customer assistance alerts.</p>
        </div>
        <button onClick={fetchData} disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-all text-white disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dining Floor Occupancy</p>
          <h3 className="text-lg font-black text-white mt-1">{tables.filter(t => t.status === 'OCCUPIED').length} / {tables.length} tables active</h3>
        </div>
        <Users className="w-6 h-6 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-6 shadow-lg">
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
                <Coffee className="w-4 h-4 text-purple-400" /> Table Layout & Active Tickets
              </h2>
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl py-16 text-slate-500 text-sm">
                  <Coffee className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                  <p className="font-semibold text-slate-400">No tables loaded.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map(table => {
                    const isOccupied = table.status === 'OCCUPIED';
                    const statusBg = isOccupied ? 'bg-purple-950/20 border-purple-500/40' : 'bg-slate-900/40 border-slate-800';
                    const badgeColor = isOccupied ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    const tableTickets = activeTickets.filter(kot => kot.tableId === table.id);
                    return (
                      <div key={table.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all duration-300 ${statusBg}`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-sm text-white">{table.name}</span>
                            <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>{table.status}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Status</label>
                            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800/80">
                              {(['VACANT', 'OCCUPIED'] as const).map(st => (
                                <button key={st} disabled={updatingTableId === table.id}
                                  onClick={() => handleUpdateTableStatus(table.id, st)}
                                  className={`text-[8px] font-bold py-1 rounded transition-all ${table.status === st ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{st}</button>
                              ))}
                            </div>
                          </div>
                          {tableTickets.length > 0 && (
                            <div className="space-y-2 border-t border-slate-800/80 pt-3">
                              <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3 text-purple-400" /> Active ({tableTickets.length})
                              </p>
                              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                {tableTickets.map(kot => (
                                  <div key={kot.id} className="bg-slate-950/60 border border-slate-850/80 p-2.5 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-black text-slate-300">{kot.kotNumber}</span>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${kot.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : kot.status === 'PENDING' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : kot.status === 'ACCEPTED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{kot.status}</span>
                                    </div>
                                    <div className="space-y-0.5 text-[10px] text-slate-300 pl-1.5 border-l border-slate-800">
                                      {kot.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span>{item.quantity}x {item.name}</span>
                                          {item.customizations.length > 0 && <span className="text-[8px] text-slate-500">({item.customizations.join(', ')})</span>}
                                        </div>
                                      ))}
                                    </div>
                                    {kot.status === 'READY' && (
                                      <ButtonLoader loading={updatingKotId === kot.id} onClick={() => handleUpdateOrderStatus(kot.id, 'SERVED')}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1 rounded text-[8px] transition-all flex items-center justify-center gap-1 shadow-sm">
                                        Mark Served
                                      </ButtonLoader>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-400" /> Live Service Requests
            {waiterCalls.length > 0 && <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>}
          </h2>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 min-h-[300px] flex flex-col gap-3 shadow-lg">
            {waiterCalls.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center py-12">
                <Coffee className="w-10 h-10 text-slate-800 mb-2" />
                <p className="text-xs">No active service alerts.</p>
              </div>
            ) : (
              waiterCalls.map(call => (
                <div key={call.id} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex justify-between items-center animate-pulse">
                  <div>
                    <h3 className="font-extrabold text-xs text-white">{call.tableName} • {call.requestType?.toUpperCase()}</h3>
                    <p className="text-[9px] text-slate-500 mt-1" suppressHydrationWarning>
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => { setWaiterCalls(prev => prev.filter(c => c.id !== call.id)); emitEvent('waiter:resolve', { id: call.id, tenantId }); }}
                    className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg" title="Resolve">
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
