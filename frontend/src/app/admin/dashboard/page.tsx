'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { KOT, WaiterCall, Table } from '../../../types';
import { Bell, Check, TrendingUp, Users, Clock, ShoppingCart, RefreshCw, QrCode, Search, Award, Loader2, LogOut, Copy, Receipt, Printer, Landmark, Coffee } from 'lucide-react';
import api from '../../../lib/api';
import { useToastStore } from '../../../store/useToastStore';
import { useDashboard } from './DashboardContext';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlayLoader, CardSkeleton, ButtonLoader, InlineLoader } from '../../../components/LoadingComponents';

import { mapDbOrderToKot, CashierDashboardComponent } from './components/CashierDashboard';

export default function RestaurantAdminDashboard() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
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

  const { tenantId, restaurantName, adminName, role } = useDashboard();
  const { subscribeToEvent, emitEvent } = useSocket(tenantId || undefined);

  const isRefreshing = isLoading && !isInitialLoad;



  // Fetch dynamic stats and active orders
  const fetchDashboardData = React.useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [ordersRes, statsRes, tablesRes, waiterCallsRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/orders/stats'),
        api.get(`/restaurants/${tenantId}/tables`),
        api.get(`/restaurants/${tenantId}/waiter-calls`).catch(() => ({ data: [] }))
      ]);

      if (ordersRes.data) {
        const mapped = ordersRes.data.map(mapDbOrderToKot);
        setKots(mapped);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (tablesRes.data) {
        setTables(tablesRes.data);
      }

      if (waiterCallsRes && waiterCallsRes.data) {
        setWaiterCalls(waiterCallsRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [tenantId]);

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

    // 4. Listening for waiter call resolutions
    const unsubscribeWaiterResolve = subscribeToEvent('waiter:resolve', (payload: { id: string }) => {
      setWaiterCalls(prev => prev.filter(c => c.id !== payload.id));
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
      unsubscribeWaiterCall();
      unsubscribeWaiterResolve();
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
      COMPLETED: 'completed',
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
    emitEvent('waiter:resolve', { id: callId, tenantId });
  };

  const handleGenerateQR = React.useCallback(async (showErrorIfEmpty = true) => {
    const formattedId = qrTableId.trim().toLowerCase();
    if (!formattedId) {
      if (showErrorIfEmpty) {
        setQrError('Table ID cannot be empty.');
      }
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
      handleGenerateQR(false);
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

  // Dynamically resolve dashboard based on user role
  if (role === 'KITCHEN_STAFF') {
    return (
      <KitchenStaffDashboard
        kots={kots}
        updatingKotId={updatingKotId}
        handleUpdateStatus={handleUpdateStatus}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        fetchDashboardData={fetchDashboardData}
        stats={stats}
        restaurantName={restaurantName}
        adminName={adminName}
      />
    );
  }

  if (role === 'WAITER') {
    return (
      <WaiterDashboardComponent
        tables={tables}
        waiterCalls={waiterCalls}
        handleResolveWaiterCall={handleResolveWaiterCall}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        fetchDashboardData={fetchDashboardData}
        stats={stats}
        restaurantName={restaurantName}
        adminName={adminName}
        tenantId={tenantId}
        setTables={setTables}
        kots={kots}
        updatingKotId={updatingKotId}
        handleUpdateStatus={handleUpdateStatus}
      />
    );
  }

  if (role === 'CASHIER') {
    return (
      <CashierDashboardComponent
        kots={kots}
        tables={tables}
        stats={stats}
        updatingKotId={updatingKotId}
        handleUpdateStatus={handleUpdateStatus}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        fetchDashboardData={fetchDashboardData}
        restaurantName={restaurantName}
        adminName={adminName}
      />
    );
  }

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
            {filteredKots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-4 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
                <ShoppingCart className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                <p className="text-xs font-bold text-slate-400">No active KOTs found</p>
                <p className="text-[10px] text-slate-500 mt-1 text-center max-w-xs leading-relaxed">
                  {statusFilter === 'ALL'
                    ? 'No active orders in the kitchen. New customer orders placed via QR table will appear here automatically.'
                    : `No orders are currently in ${statusFilter.toLowerCase()} status.`}
                </p>
              </div>
            ) : (
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
            )}
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
                      onClick={() => handleGenerateQR()}
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

// ─── KITCHEN STAFF DASHBOARD (KDS) ───────────────────────────────────────────
interface KitchenStaffProps {
  kots: KOT[];
  updatingKotId: string | null;
  handleUpdateStatus: (kotId: string, nextStatus: KOT['status']) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchDashboardData: () => Promise<void>;
  stats: any;
  restaurantName: string;
  adminName: string;
}

function KitchenStaffDashboard({
  kots,
  updatingKotId,
  handleUpdateStatus,
  isLoading,
  isRefreshing,
  fetchDashboardData,
  stats,
  restaurantName,
  adminName,
}: KitchenStaffProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY'>('ALL');

  const kitchenKots = useMemo(() => {
    return kots.filter(kot => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(kot.status));
  }, [kots]);

  const filteredKots = useMemo(() => {
    return kitchenKots.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        statusFilter === 'ALL' || kot.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [kitchenKots, searchTerm, statusFilter]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Kitchen KDS Terminal
            <span className="text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">
              Kitchen Mode
            </span>
            {isRefreshing && (
              <InlineLoader message="Syncing..." className="ml-2" />
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time KOT display and ticket fulfillment for chefs.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Kitchen Tickets</p>
            <h3 className="text-lg font-black text-white mt-1">
              {kitchenKots.filter(k => k.status !== 'READY').length} cooking
            </h3>
          </div>
          <ShoppingCart className="w-6 h-6 text-blue-500" />
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

      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/20 border border-slate-800/60 p-3.5 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search active tickets..."
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

      {filteredKots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
          <ShoppingCart className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
          <p className="text-xs font-bold text-slate-400">No active kitchen tickets</p>
          <p className="text-[10px] text-slate-500 mt-1 text-center max-w-xs">
            {statusFilter === 'ALL'
              ? 'No tickets in the kitchen. New orders will appear here automatically.'
              : `No tickets are currently in ${statusFilter.toLowerCase()} status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKots.map(kot => {
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
                <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      {kot.tableName}
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        {kot.kotNumber}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Placed: {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded ${isLate ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' :
                    isWarning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-300'
                    }`}>
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
                        {it.customizations.length > 0 && (
                          <p className="text-[10px] text-slate-500 ml-5 mt-0.5">{it.customizations.join(', ')}</p>
                        )}
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
                    <ButtonLoader
                      loading={updatingKotId === kot.id}
                      onClick={() => handleUpdateStatus(kot.id, 'ACCEPTED')}
                      className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-lg text-xs hover:opacity-95"
                    >
                      Accept Ticket
                    </ButtonLoader>
                  )}
                  {kot.status === 'ACCEPTED' && (
                    <ButtonLoader
                      loading={updatingKotId === kot.id}
                      onClick={() => handleUpdateStatus(kot.id, 'PREPARING')}
                      className="flex-1 bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-amber-400"
                    >
                      Start Cooking
                    </ButtonLoader>
                  )}
                  {kot.status === 'PREPARING' && (
                    <ButtonLoader
                      loading={updatingKotId === kot.id}
                      onClick={() => handleUpdateStatus(kot.id, 'READY')}
                      className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-emerald-400"
                    >
                      Mark Ready
                    </ButtonLoader>
                  )}
                  {kot.status === 'READY' && (
                    <ButtonLoader
                      loading={updatingKotId === kot.id}
                      onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                      className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 rounded-lg text-xs transition-all"
                    >
                      Mark Served
                    </ButtonLoader>
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

// ─── WAITER OPERATIONS HUB ───────────────────────────────────────────────────
interface WaiterDashboardProps {
  tables: Table[];
  waiterCalls: WaiterCall[];
  handleResolveWaiterCall: (callId: string) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchDashboardData: () => Promise<void>;
  stats: any;
  restaurantName: string;
  adminName: string;
  tenantId: string | null;
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  kots: KOT[];
  updatingKotId: string | null;
  handleUpdateStatus: (kotId: string, nextStatus: KOT['status']) => Promise<void>;
}

function WaiterDashboardComponent({
  tables,
  waiterCalls,
  handleResolveWaiterCall,
  isLoading,
  isRefreshing,
  fetchDashboardData,
  stats,
  restaurantName,
  adminName,
  tenantId,
  setTables,
  kots,
  updatingKotId,
  handleUpdateStatus,
}: WaiterDashboardProps) {
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);

  // Order Placement Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderTable, setSelectedOrderTable] = useState<Table | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  useEffect(() => {
    if (isOrderModalOpen) {
      setMenuLoading(true);
      api.get('/menu-items')
        .then(res => {
          setMenuItems(res.data || []);
        })
        .catch(err => {
          console.error('Failed to load menu items:', err);
        })
        .finally(() => setMenuLoading(false));
    }
  }, [isOrderModalOpen]);

  const handleUpdateTableStatus = async (tableId: string, nextStatus: 'VACANT' | 'OCCUPIED') => {
    setUpdatingTableId(tableId);
    try {
      await api.patch(`/restaurants/tables/${tableId}`, { status: nextStatus });
      setTables(prev =>
        prev.map(t => (t.id === tableId ? { ...t, status: nextStatus } : t))
      );
      useToastStore.getState().showSuccess(`Table status updated to ${nextStatus}.`);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update table status:', err);
      useToastStore.getState().showError('Failed to update table status.');
    } finally {
      setUpdatingTableId(null);
    }
  };

  const handleOpenOrderModal = (table: Table) => {
    setSelectedOrderTable(table);
    setOrderQuantities({});
    setOrderSearchTerm('');
    setIsOrderModalOpen(true);
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    setOrderQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderTable) return;

    const itemsToSubmit = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        menuItemId: itemId,
        quantity: qty,
      }));

    if (itemsToSubmit.length === 0) {
      useToastStore.getState().showError('Please add at least one item to place an order.');
      return;
    }

    try {
      setOrderSubmitting(true);
      await api.post('/orders', {
        tableId: selectedOrderTable.id,
        items: itemsToSubmit,
      });

      useToastStore.getState().showSuccess(`Order placed successfully for ${selectedOrderTable.name}!`);
      setIsOrderModalOpen(false);
      setOrderQuantities({});
      setSelectedOrderTable(null);
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Failed to place order:', err);
      useToastStore.getState().showError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const activeTickets = useMemo(() => {
    return kots.filter(kot => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(kot.status));
  }, [kots]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      (item.category?.name && item.category.name.toLowerCase().includes(orderSearchTerm.toLowerCase()))
    );
  }, [menuItems, orderSearchTerm]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Waiter Operations Hub
            <span className="text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
              Waiter Mode
            </span>
            {isRefreshing && (
              <InlineLoader message="Syncing..." className="ml-2" />
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage dining floor layouts, active tickets, and live customer assistance alerts.</p>
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

      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dining Floor Occupancy</p>
            <h3 className="text-lg font-black text-white mt-1">
              {tables.filter(t => t.status === 'OCCUPIED').length} / {tables.length} tables active
            </h3>
          </div>
          <Users className="w-6 h-6 text-purple-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-6 shadow-lg">
            {/* Dining Table Layout with Integrated Tickets */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
                <Coffee className="w-4 h-4 text-purple-400" /> Dining Table & Active Tickets Layout
              </h2>
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl py-16 text-slate-500 text-sm">
                  <Coffee className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
                  <p className="font-semibold text-slate-450">No tables loaded.</p>
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
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-sm text-white">{table.name}</span>
                            <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                              {table.status}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] text-slate-550 font-bold uppercase">Change Status</label>
                            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800/80">
                              {(['VACANT', 'OCCUPIED'] as const).map(st => (
                                <button
                                  key={st}
                                  disabled={updatingTableId === table.id}
                                  onClick={() => handleUpdateTableStatus(table.id, st)}
                                  className={`text-[8px] font-bold py-1 rounded transition-all ${table.status === st ? 'bg-slate-800 text-white' : 'text-slate-550 hover:text-slate-350'
                                    }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Active Kitchen Tickets for this Table */}
                          {tableTickets.length > 0 && (
                            <div className="space-y-2 border-t border-slate-800/80 pt-3">
                              <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3 text-purple-400" /> Active Tickets ({tableTickets.length})
                              </p>
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none hide-scrollbar">
                                {tableTickets.map(kot => (
                                  <div key={kot.id} className="bg-slate-950/60 border border-slate-850/80 p-2.5 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-black text-slate-300">{kot.kotNumber}</span>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${kot.status === 'READY'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                                        : kot.status === 'PENDING'
                                          ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                          : kot.status === 'ACCEPTED'
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                        {kot.status}
                                      </span>
                                    </div>
                                    <div className="space-y-0.5 text-[10px] text-slate-300 pl-1.5 border-l border-slate-800">
                                      {kot.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span>{item.quantity}x {item.name}</span>
                                          {item.customizations.length > 0 && (
                                            <span className="text-[8px] text-slate-500">({item.customizations.join(', ')})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {kot.status === 'READY' && (
                                      <ButtonLoader
                                        loading={updatingKotId === kot.id}
                                        onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1 rounded text-[8px] transition-all flex items-center justify-center gap-1 shadow-sm"
                                      >
                                        Mark Served
                                      </ButtonLoader>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenOrderModal(table)}
                          className="w-full py-1.5 text-[9px] font-black bg-purple-650 hover:bg-purple-600 text-white rounded-lg transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/10 mt-auto"
                        >
                          <ShoppingCart className="w-3 h-3" /> Place Order
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Live Service Requests</h2>
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
                    <h3 className="font-extrabold text-xs text-white">
                      {call.tableName} • {call.requestType.toUpperCase()}
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-1" suppressHydrationWarning>
                      Requested:{' '}
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveWaiterCall(call.id)}
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

      {/* Modal: Waiter Place Order */}
      {isOrderModalOpen && selectedOrderTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoomIn flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white">
                  Place Order — {selectedOrderTable.name}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Select menu items and specify quantities.</p>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search menu catalog..."
                value={orderSearchTerm}
                onChange={e => setOrderSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none focus:ring-0 text-xs text-white placeholder-slate-600 w-full"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {menuLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No menu items found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMenuItems.map(item => {
                    const qty = orderQuantities[item.id] || 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{item.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.isVeg ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                              {item.isVeg ? 'VEG' : 'NON-VEG'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">₹{Number(item.price).toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all"
                              >
                                -
                              </button>
                              <span className="text-xs font-black text-white w-4 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, 1)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] rounded-lg transition-all"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Items Selected</p>
                <p className="text-sm font-black text-white mt-0.5">
                  {Object.values(orderQuantities).reduce((a, b) => a + b, 0)} items
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
                <ButtonLoader
                  loading={orderSubmitting}
                  onClick={handlePlaceOrderSubmit}
                  className="px-5 py-2.5 text-xs font-black bg-purple-650 hover:bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-500/20 transition-all"
                >
                  Place Order
                </ButtonLoader>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

