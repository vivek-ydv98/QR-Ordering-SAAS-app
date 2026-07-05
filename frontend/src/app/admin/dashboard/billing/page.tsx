'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../../hooks/useSocket';
import { KOT, Table } from '../../../../types';
import api from '../../../../lib/api';
import { useToastStore } from '../../../../store/useToastStore';
import { useDashboard } from '../DashboardContext';
import { CashierDashboardComponent, mapDbOrderToKot } from '../components/CashierDashboard';
import { PageLoader } from '../../../../components/LoadingComponents';

export default function BillingTerminalPage() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [updatingKotId, setUpdatingKotId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    liveKots: 0,
    tableOccupancy: { occupied: 0, total: 0 },
    avgPrepSpeed: null as number | null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { tenantId, restaurantName, adminName } = useDashboard();
  const { subscribeToEvent, emitEvent } = useSocket(tenantId || undefined);

  const isRefreshing = isLoading && !isInitialLoad;

  const fetchDashboardData = React.useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [ordersRes, statsRes, tablesRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/orders/stats'),
        api.get(`/restaurants/${tenantId}/tables`),
      ]);

      if (ordersRes.data) {
        setKots(ordersRes.data.map(mapDbOrderToKot));
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (tablesRes.data) {
        setTables(tablesRes.data);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!tenantId) return;

    const unsubscribeNewOrder = subscribeToEvent('order:create', () => {
      fetchDashboardData();
    });

    const unsubscribeStatusUpdate = subscribeToEvent('order_status_update', () => {
      fetchDashboardData();
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
    };
  }, [tenantId, subscribeToEvent, fetchDashboardData]);

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
      emitEvent('order_status_update', { orderId: kotId, status: nextStatus });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update order status:', err);
      useToastStore.getState().showError('Failed to update order status. Please try again.');
    } finally {
      setUpdatingKotId(null);
    }
  };

  if (isInitialLoad) {
    return <PageLoader message="Loading Billing Terminal..." theme="admin" />;
  }

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
