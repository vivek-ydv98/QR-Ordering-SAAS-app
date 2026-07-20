'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { KOT } from '../../../../types';
import api from '../../../../lib/api';
import { useToastStore } from '../../../../store/useToastStore';
import { useDashboard } from '../DashboardContext';
import { ButtonLoader, InlineLoader, PageLoader } from '../../../../components/LoadingComponents';
import { ShoppingCart, Clock, Search, RefreshCw } from 'lucide-react';

export default function KdsPage() {
  const { tenantId } = useDashboard();

  const [kots, setKots] = useState<KOT[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED'>('ALL');
  const [updatingKotId, setUpdatingKotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [stats, setStats] = useState({ avgPrepSpeed: null as number | null });

  const isRefreshing = isLoading && !isInitialLoad;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/orders/stats'),
      ]);

      if (ordersRes.data) {
        const statusMap: Record<string, KOT['status']> = {
          pending: 'PENDING', confirmed: 'ACCEPTED', preparing: 'PREPARING',
          ready: 'READY', served: 'SERVED', completed: 'COMPLETED', cancelled: 'CANCELLED',
        };
        const mapped = ordersRes.data.map((order: any) => {
          const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          return {
            id: order.id,
            kotNumber: order.kotNumber || order.id.slice(0, 8).toUpperCase(),
            tableName: order.table?.name || order.tableId?.slice(0, 8) || 'T',
            status: statusMap[order.status] || 'PENDING',
            items: (order.items || []).map((item: any) => ({
              name: item.menuItem?.name || item.name || 'Item',
              quantity: item.quantity,
              isVeg: item.menuItem?.isVeg ?? item.isVeg ?? true,
              customizations: ((item.selectedAddons || item.customizations || []) as any[]).map((a: any) =>
                typeof a === 'string' ? a : a.optionName || a.addonName || a.name || ''
              ).filter(Boolean),
            })),
            specialInstructions: order.specialInstructions || '',
            createdAt: order.createdAt,
            elapsedMinutes: elapsed,
          };
        });
        setKots(mapped);
      }
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load KDS data:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (kotId: string, nextStatus: KOT['status']) => {
    const frontendToDbStatusMap: Record<KOT['status'], string> = {
      PENDING: 'pending', ACCEPTED: 'confirmed', PREPARING: 'preparing',
      READY: 'ready', SERVED: 'served', COMPLETED: 'completed', CANCELLED: 'cancelled',
    };
    setUpdatingKotId(kotId);
    try {
      await api.patch(`/orders/${kotId}/status`, { status: frontendToDbStatusMap[nextStatus] });
      await fetchData();
    } catch (err) {
      console.error('Failed to update order status:', err);
      useToastStore.getState().showError('Failed to update order status.');
    } finally {
      setUpdatingKotId(null);
    }
  };

  const kitchenKots = useMemo(() => {
    return kots.filter(kot => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'].includes(kot.status));
  }, [kots]);

  const filteredKots = useMemo(() => {
    return kitchenKots.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'ALL' ? kot.status !== 'SERVED' : kot.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [kitchenKots, searchTerm, statusFilter]);

  if (isInitialLoad) {
    return <PageLoader message="Loading Kitchen Display System..." theme="admin" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Kitchen KDS Terminal
            <span className="text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">
              Kitchen Mode
            </span>
            {isRefreshing && <InlineLoader message="Syncing..." className="ml-2" />}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time KOT display and ticket fulfillment for chefs.</p>
        </div>
        <button onClick={fetchData} disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-all text-white disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Kitchen Tickets</p>
            <h3 className="text-lg font-black text-white mt-1">{kitchenKots.filter(k => k.status !== 'READY').length} cooking</h3>
          </div>
          <ShoppingCart className="w-6 h-6 text-blue-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg. Prep Speed</p>
            <h3 className="text-lg font-black text-white mt-1">{stats.avgPrepSpeed !== null ? `${stats.avgPrepSpeed} Mins` : '—'}</h3>
          </div>
          <Clock className="w-6 h-6 text-orange-500" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/20 border border-slate-800/60 p-3.5 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search active tickets..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600" />
        </div>
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === f
                ? 'bg-white text-slate-900 shadow'
                : 'bg-slate-900 text-slate-400 border border-slate-800/60 hover:text-slate-200'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {filteredKots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
          <ShoppingCart className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
          <p className="text-xs font-bold text-slate-400">No active kitchen tickets</p>
          <p className="text-[10px] text-slate-500 mt-1 text-center max-w-xs">
            {statusFilter === 'ALL' ? 'No tickets in the kitchen. New orders will appear here automatically.' : `No tickets are currently in ${statusFilter.toLowerCase()} status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKots.map(kot => {
            const isLate = kot.elapsedMinutes >= 15;
            const isWarning = kot.elapsedMinutes >= 10 && kot.elapsedMinutes < 15;
            const borderStyles = isLate ? 'border-rose-500 shadow-rose-950/20' : isWarning ? 'border-amber-500 shadow-amber-950/20' : 'border-slate-800/80 hover:border-slate-700';
            return (
              <div key={kot.id} className={`bg-slate-950/40 border-2 rounded-xl flex flex-col p-4 shadow-lg transition-all ${borderStyles}`}>
                <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      {kot.tableName}
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">{kot.kotNumber}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Placed: {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded ${isLate ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' : isWarning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-300'}`}>
                    {kot.elapsedMinutes}m elapsed
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                  {kot.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={it.isVeg ? 'veg-stamp scale-75' : 'nonveg-stamp scale-75'}></span>
                          <span className="font-bold text-slate-200 text-sm">{it.name}</span>
                        </div>
                        {it.customizations.length > 0 && <p className="text-[10px] text-slate-500 ml-5 mt-0.5">{it.customizations.join(', ')}</p>}
                      </div>
                      <span className="font-black text-slate-200 text-sm ml-2">x{it.quantity}</span>
                    </div>
                  ))}
                  {kot.specialInstructions && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2 text-[10px] text-amber-400 leading-relaxed">
                      <strong>Notes: </strong> {kot.specialInstructions}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900 flex gap-2">
                  {kot.status === 'PENDING' && (
                    <ButtonLoader loading={updatingKotId === kot.id} onClick={() => handleUpdateStatus(kot.id, 'ACCEPTED')}
                      className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-lg text-xs hover:opacity-95">Accept Ticket</ButtonLoader>
                  )}
                  {kot.status === 'ACCEPTED' && (
                    <ButtonLoader loading={updatingKotId === kot.id} onClick={() => handleUpdateStatus(kot.id, 'PREPARING')}
                      className="flex-1 bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-amber-400">Start Cooking</ButtonLoader>
                  )}
                  {kot.status === 'PREPARING' && (
                    <ButtonLoader loading={updatingKotId === kot.id} onClick={() => handleUpdateStatus(kot.id, 'READY')}
                      className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-emerald-400">Mark Ready</ButtonLoader>
                  )}
                  {kot.status === 'READY' && (
                    <ButtonLoader loading={updatingKotId === kot.id} onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                      className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 rounded-lg text-xs transition-all">Mark Served</ButtonLoader>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
