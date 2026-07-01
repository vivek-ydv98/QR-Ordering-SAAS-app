'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { KOT, WaiterCall } from '../../../types';
import { Bell, Check, TrendingUp, Users, Clock, ShoppingCart, RefreshCw, QrCode, Search, Award, Loader2, LogOut, Copy } from 'lucide-react';
import api from '../../../lib/api';
import { useToastStore } from '../../../store/useToastStore';
import { useDashboard } from './DashboardContext';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlayLoader, CardSkeleton, ButtonLoader, InlineLoader } from '../../../components/LoadingComponents';

export default function RestaurantAdminDashboard() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [qrTableId, setQrTableId] = useState('');
  const [qrResolvedUrl, setQrResolvedUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrError, setQrError] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingKotId, setUpdatingKotId] = useState<string | null>(null);

  // Dashboard Stats state
  const [stats, setStats] = useState({
    todayRevenue: 0,
    liveKots: 0,
    tableOccupancy: { occupied: 0, total: 0 },
    avgPrepSpeed: null as number | null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = useMemo(() => [
    'Connecting to live kitchen feed...',
    'Syncing active order registries...',
    'Aggregating live dashboard metrics...',
    'Retrieving table occupancy states...',
    'Securing terminal websocket links...',
  ], []);

  const { tenantId, restaurantName, adminName } = useDashboard();
  const { subscribeToEvent, emitEvent } = useSocket(tenantId || undefined);
  
  const isRefreshing = isLoading && !isInitialLoad;

  // Map database orders to frontend KOT structure
  const mapDbOrderToKot = React.useCallback((order: any): KOT => {
    const statusMap: Record<string, KOT['status']> = {
      pending: 'PENDING',
      confirmed: 'ACCEPTED',
      preparing: 'PREPARING',
      ready: 'READY',
      served: 'SERVED',
      completed: 'SERVED',
      cancelled: 'CANCELLED',
    };

    return {
      id: order.id,
      kotNumber: order.kotNumber,
      tableId: order.tableId,
      tableName: order.table?.name || 'Unknown Table',
      createdAt: order.createdAt,
      elapsedMinutes: Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000),
      status: statusMap[order.status] || 'PENDING',
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        isVeg: item.menuItem?.isVeg ?? true,
        customizations: Array.isArray(item.customizations)
          ? item.customizations.map((c: any) => c.optionName || c)
          : [],
      })),
      specialInstructions: order.specialInstructions || undefined,
    };
  }, []);

  // Fetch dynamic stats and active orders
  const fetchDashboardData = React.useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/orders/stats')
      ]);

      if (ordersRes.data) {
        const mapped = ordersRes.data.map(mapDbOrderToKot);
        setKots(mapped);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [tenantId, mapDbOrderToKot]);

  // Fetch on mount/change
  useEffect(() => {
    setIsInitialLoad(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Rotate through loading step descriptions
  useEffect(() => {
    if (!isInitialLoad) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
    }, 850);
    return () => clearInterval(interval);
  }, [isInitialLoad, loadingSteps.length]);

  // Fetch actual restaurant slug from API
  useEffect(() => {
    if (tenantId) {
      api.get(`/restaurants/by-id/${tenantId}`)
        .then(res => {
          if (res.data?.slug) {
            setRestaurantSlug(res.data.slug);
          }
        })
        .catch(err => {
          console.error('Failed to fetch restaurant slug:', err);
        });
    }
  }, [tenantId]);

  // Synthesize buzzer sound
  const triggerBuzzer = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.warn('Web Audio API is not supported or was blocked by browser policies.', err);
    }
  };

  // Subscribe to real-time events
  useEffect(() => {
    if (!tenantId) return;

    // 1. Listening for new orders -> Refresh statistics and orders
    const unsubscribeNewOrder = subscribeToEvent('order:create', (newOrder: any) => {
      triggerBuzzer();
      fetchDashboardData();
    });

    // 2. Listening for status updates from other terminals (e.g. KDS)
    const unsubscribeStatusUpdate = subscribeToEvent('order_status_update', (payload: any) => {
      fetchDashboardData();
    });

    // 3. Listening for waiter help calls
    const unsubscribeWaiterCall = subscribeToEvent('waiter:call', (call: WaiterCall) => {
      triggerBuzzer();
      setWaiterCalls(prev => [call, ...prev]);
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
      unsubscribeWaiterCall();
    };
  }, [tenantId, subscribeToEvent, fetchDashboardData]);

  // Keep timers ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setKots(prev =>
        prev.map(kot => {
          const elapsed = Math.round((Date.now() - new Date(kot.createdAt).getTime()) / 60000);
          return { ...kot, elapsedMinutes: elapsed };
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (kotId: string, nextStatus: KOT['status']) => {
    const frontendToDbStatusMap: Record<KOT['status'], string> = {
      PENDING: 'pending',
      ACCEPTED: 'confirmed',
      PREPARING: 'preparing',
      READY: 'ready',
      SERVED: 'served',
      CANCELLED: 'cancelled',
    };

    const dbStatus = frontendToDbStatusMap[nextStatus];
    setUpdatingKotId(kotId);

    try {
      await api.patch(`/orders/${kotId}/status`, { status: dbStatus });

      // Emit socket status broadcast
      emitEvent('order_status_update', { orderId: kotId, status: nextStatus });

      // Refresh metrics and order state from DB
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update order status:', err);
      useToastStore.getState().showError('Failed to update order status. Please try again.');
    } finally {
      setUpdatingKotId(null);
    }
  };

  const handleResolveWaiterCall = (callId: string) => {
    setWaiterCalls(prev => prev.filter(c => c.id !== callId));
  };

  const handleGenerateQR = React.useCallback(async () => {
    const formattedId = qrTableId.trim().toLowerCase();
    if (!formattedId) {
      setQrError('Table ID cannot be empty.');
      setQrCodeDataUrl('');
      setQrResolvedUrl('');
      return;
    }
    setIsGeneratingQr(true);
    setQrError('');
    try {
      const targetUrl = `${window.location.origin}/r/${restaurantSlug}/table/${formattedId}`;
      setQrResolvedUrl(targetUrl);
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err: any) {
      console.error('QR code generation failed:', err);
      setQrError('Failed to generate QR Code. Please check the Table ID.');
    } finally {
      setIsGeneratingQr(false);
    }
  }, [qrTableId, restaurantSlug]);

  // Auto-generate initial QR Code when slug is ready
  useEffect(() => {
    if (restaurantSlug) {
      handleGenerateQR();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantSlug]);

  const filteredKots = useMemo(() => {
    return kots.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || kot.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [kots, searchTerm, statusFilter]);

  return (
    <div className="relative min-h-screen bg-slate-950">
      <AnimatePresence mode="wait">
        {isInitialLoad && (
          <motion.div
            key="initial-loading-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6"
          >
            {/* Centered Branded Glassmorphic Loading Card */}
            <OverlayLoader message={loadingSteps[loadingStep]} theme="dark" />

            {/* Layout Skeleton in background */}
            <div className="opacity-20 select-none pointer-events-none">
              {/* Header Skeleton */}
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
                <div>
                  <div className="w-48 h-7 bg-slate-900 rounded-lg animate-shimmer" />
                  <div className="w-64 h-3 bg-slate-900 rounded-md mt-2 animate-shimmer" />
                </div>
                <div className="w-24 h-9 bg-slate-900 rounded-lg animate-shimmer" />
              </header>

              {/* Metrics Row Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-xl flex items-center justify-between h-[82px]">
                    <div className="space-y-2">
                      <div className="w-20 h-3 bg-slate-900 rounded-md animate-shimmer" />
                      <div className="w-16 h-5 bg-slate-900 rounded-md animate-shimmer" />
                    </div>
                    <div className="w-6 h-6 bg-slate-900 rounded-lg animate-shimmer" />
                  </div>
                ))}
              </div>

              {/* Grid Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Filter Bar Skeleton */}
                  <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/20 border border-slate-900/60 p-3.5 rounded-xl">
                    <div className="w-full h-8 bg-slate-900 rounded-lg animate-shimmer" />
                    <div className="flex gap-1.5 w-full md:w-auto">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-16 h-8 bg-slate-900 rounded-lg animate-shimmer shrink-0" />
                      ))}
                    </div>
                  </div>

                  {/* KOT Cards Skeleton Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col h-[220px] justify-between">
                        <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                          <div className="space-y-1.5">
                            <div className="w-24 h-4 bg-slate-900 rounded-md animate-shimmer" />
                            <div className="w-16 h-3 bg-slate-900 rounded-md animate-shimmer" />
                          </div>
                          <div className="w-16 h-4 bg-slate-900 rounded-md animate-shimmer" />
                        </div>
                        <div className="flex-1 py-4 space-y-2">
                          <div className="w-3/4 h-3.5 bg-slate-900 rounded-md animate-shimmer" />
                          <div className="w-1/2 h-3.5 bg-slate-900 rounded-md animate-shimmer" />
                          <div className="w-2/3 h-3.5 bg-slate-900 rounded-md animate-shimmer" />
                        </div>
                        <div className="border-t border-slate-900 pt-3 flex gap-2">
                          <div className="w-full h-8 bg-slate-900 rounded-lg animate-shimmer" />
                          <div className="w-12 h-8 bg-slate-900 rounded-lg animate-shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 1 col */}
                <div className="flex flex-col gap-6">
                  {/* Waiter log */}
                  <div className="bg-slate-900/40 border border-slate-900/80 rounded-xl p-4 h-[250px] flex flex-col justify-between">
                    <div className="w-36 h-4 bg-slate-900 rounded-md animate-shimmer mb-4" />
                    <div className="flex-1 space-y-2">
                      <div className="h-10 bg-slate-900 rounded-xl animate-shimmer" />
                      <div className="h-10 bg-slate-900 rounded-xl animate-shimmer" />
                    </div>
                  </div>

                  {/* QR Widget */}
                  <div className="bg-slate-900/40 border border-slate-900/80 rounded-xl p-4 h-[250px] flex flex-col justify-between">
                    <div className="w-44 h-4 bg-slate-900 rounded-md animate-shimmer mb-4" />
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-slate-900 rounded-md animate-shimmer" />
                      <div className="flex gap-2">
                        <div className="flex-1 h-8 bg-slate-900 rounded-lg animate-shimmer" />
                        <div className="w-20 h-8 bg-slate-900 rounded-lg animate-shimmer" />
                      </div>
                    </div>
                    <div className="h-20 bg-slate-900 rounded-xl animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">

      {/* Top Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Live Orders Terminal
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Active Session
            </span>
            {isRefreshing && (
              <InlineLoader message="Syncing..." className="ml-2" />
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time KOT tracking terminal for kitchen operators.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-all text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-lg font-black text-white mt-1">₹{stats.todayRevenue.toLocaleString()}</h3>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live KOTs</p>
            <h3 className="text-lg font-black text-white mt-1">
              {stats.liveKots} Active
            </h3>
          </div>
          <ShoppingCart className="w-6 h-6 text-blue-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Table Occupancy</p>
            <h3 className="text-lg font-black text-white mt-1">
              {stats.tableOccupancy.occupied} / {stats.tableOccupancy.total}
            </h3>
          </div>
          <Users className="w-6 h-6 text-purple-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg. Prep Speed</p>
            <h3 className="text-lg font-black text-white mt-1">
              {stats.avgPrepSpeed !== null ? `${stats.avgPrepSpeed} Mins` : '—'}
            </h3>
          </div>
          <Clock className="w-6 h-6 text-orange-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Order Operations */}
        <div className={`lg:col-span-2 flex flex-col gap-6 transition-all duration-300 relative ${isRefreshing ? 'pointer-events-none opacity-50' : ''}`}>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/20 border border-slate-800/60 p-3.5 rounded-xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search KOT / Table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800/80 pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {(['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === f
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-slate-900 text-slate-400 border border-slate-800/60 hover:text-slate-200'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* KOT Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKots.map(kot => {
              // Age border colors
              const isLate = kot.elapsedMinutes >= 15;
              const isWarning = kot.elapsedMinutes >= 10 && kot.elapsedMinutes < 15;

              const borderStyles = isLate
                ? 'border-rose-500 shadow-rose-950/20'
                : isWarning
                  ? 'border-amber-500 shadow-amber-950/20'
                  : 'border-slate-800/80 hover:border-slate-700';

              return (
                <div
                  key={kot.id}
                  className={`bg-slate-950/40 border-2 rounded-xl flex flex-col p-4 shadow-lg transition-all ${borderStyles}`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        {kot.tableName}
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          {kot.kotNumber}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                        Placed: {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded ${isLate
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                        : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                      {kot.elapsedMinutes}m elapsed
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    {kot.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={it.isVeg ? 'veg-stamp scale-75' : 'nonveg-stamp scale-75'}></span>
                            <span className="font-bold text-slate-200">{it.name}</span>
                          </div>
                          {it.customizations.length > 0 && (
                            <p className="text-[10px] text-slate-500 ml-5 mt-0.5">{it.customizations.join(', ')}</p>
                          )}
                        </div>
                        <span className="font-black text-slate-400 ml-2">x{it.quantity}</span>
                      </div>
                    ))}

                    {kot.specialInstructions && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2 text-[10px] text-amber-400 leading-relaxed">
                        <strong>Notes: </strong> {kot.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-900 flex gap-2">
                    {kot.status === 'PENDING' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'ACCEPTED')}
                        className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-lg text-xs hover:opacity-95"
                      >
                        Accept Order
                      </ButtonLoader>
                    )}
                    {kot.status === 'ACCEPTED' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'PREPARING')}
                        className="flex-1 bg-amber-500 text-slate-950 font-bold py-2 rounded-lg text-xs hover:bg-amber-400"
                      >
                        Start Cooking
                      </ButtonLoader>
                    )}
                    {kot.status === 'PREPARING' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'READY')}
                        className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs hover:bg-emerald-400"
                      >
                        Mark Ready
                      </ButtonLoader>
                    )}
                    {kot.status === 'READY' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                        className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg text-xs hover:bg-blue-400"
                      >
                        Served / Complete
                      </ButtonLoader>
                    )}
                    {kot.status !== 'SERVED' && kot.status !== 'CANCELLED' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'CANCELLED')}
                        className="px-3 py-2 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-950 rounded-lg text-xs"
                      >
                        Cancel
                      </ButtonLoader>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Waiter & QR Generator */}
        <div className="flex flex-col gap-6">

          {/* Waiter Assistance Panel */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 shadow-lg">
            <h2 className="text-sm font-extrabold text-white flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <span className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400" /> Live Assistance Log
              </span>
              {waiterCalls.length > 0 && (
                <span className="h-2 w-2 bg-amber-400 rounded-full animate-ping"></span>
              )}
            </h2>

            {waiterCalls.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No active waiter assistance requested.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                {waiterCalls.map(call => (
                  <div
                    key={call.id}
                    className="flex justify-between items-center p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl"
                  >
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        {call.tableName} • {call.requestType.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1" suppressHydrationWarning>
                        {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleResolveWaiterCall(call.id)}
                      className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg transition-all"
                      title="Resolve Alert"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR Generator Widget */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 shadow-lg">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-4">
              <QrCode className="w-4 h-4 text-primary" /> Dynamic QR Code Generator
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dining Table ID</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="E.g., T12"
                    value={qrTableId}
                    onChange={(e) => {
                      setQrTableId(e.target.value);
                      if (qrError) setQrError('');
                    }}
                    className={`flex-1 bg-slate-900 border text-xs px-3 py-2 rounded-lg text-white focus:outline-none transition-colors duration-200 ${qrError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800/85 focus:border-slate-700'
                      }`}
                  />
                  <ButtonLoader
                    loading={isGeneratingQr}
                    onClick={handleGenerateQR}
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                  >
                    Generate
                  </ButtonLoader>
                </div>
                {qrError && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">
                    {qrError}
                  </p>
                )}
              </div>

              {qrResolvedUrl && !qrError && (
                <div className="border border-slate-800/60 p-4 rounded-xl flex flex-col items-center gap-3 bg-slate-900/40 transition-all duration-300">
                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2 relative overflow-hidden shadow-inner group">
                    {isGeneratingQr ? (
                      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-500 text-[10px] font-bold animate-pulse">
                        <QrCode className="w-8 h-8 text-emerald-500/40 mb-1" />
                        Rendering...
                      </div>
                    ) : qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt={`Table ${qrTableId} QR Code`}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full border border-slate-200 flex flex-col items-center justify-center text-slate-800 text-[10px] text-center font-bold font-sans">
                        <QrCode className="w-10 h-10 text-primary mb-1 animate-pulse" />
                        QR CODE
                      </div>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <p className="text-[10px] text-slate-400 font-semibold block">Scan URL Target:</p>
                    <div className="relative mt-1 flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={qrResolvedUrl}
                        className="w-full bg-slate-950 border border-slate-850 px-2 py-1.5 text-[9px] text-slate-300 rounded text-center truncate focus:outline-none pr-8"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrResolvedUrl);
                          useToastStore.getState().showSuccess('Target URL copied to clipboard!');
                        }}
                        className="absolute right-1 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
