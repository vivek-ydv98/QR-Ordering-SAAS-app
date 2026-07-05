'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KOT, Table } from '../../../../types';
import api from '../../../../lib/api';
import { useToastStore } from '../../../../store/useToastStore';
import { ButtonLoader, InlineLoader } from '../../../../components/LoadingComponents';
import { TrendingUp, ShoppingCart, Users, Search, Receipt, Printer, RefreshCw } from 'lucide-react';

export const mapDbOrderToKot = (order: any): KOT => {
  const statusMap: Record<string, KOT['status']> = {
    pending: 'PENDING',
    confirmed: 'ACCEPTED',
    preparing: 'PREPARING',
    ready: 'READY',
    served: 'SERVED',
    completed: 'COMPLETED',
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
    subtotal: Number(order.subtotal) || 0,
    cgst: order.cgst === null || order.cgst === undefined ? null : Number(order.cgst),
    sgst: order.sgst === null || order.sgst === undefined ? null : Number(order.sgst),
    serviceCharge: order.serviceCharge === null || order.serviceCharge === undefined ? null : Number(order.serviceCharge),
    cgstRate: order.cgstRate === null || order.cgstRate === undefined ? null : Number(order.cgstRate),
    sgstRate: order.sgstRate === null || order.sgstRate === undefined ? null : Number(order.sgstRate),
    serviceChargeRate: order.serviceChargeRate === null || order.serviceChargeRate === undefined ? null : Number(order.serviceChargeRate),
    grandTotal: Number(order.grandTotal) || 0,
    items: (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price) || 0,
      isVeg: item.menuItem?.isVeg ?? true,
      customizations: Array.isArray(item.customizations)
        ? item.customizations.map((c: any) => c.optionName || c)
        : [],
    })),
    specialInstructions: order.specialInstructions || undefined,
  };
};

export interface CashierDashboardProps {
  kots: KOT[];
  tables: Table[];
  stats: any;
  updatingKotId: string | null;
  handleUpdateStatus: (kotId: string, nextStatus: KOT['status']) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchDashboardData: () => Promise<void>;
  restaurantName: string;
  adminName: string;
}

export function CashierDashboardComponent({
  kots,
  tables,
  stats,
  updatingKotId,
  handleUpdateStatus,
  isLoading,
  isRefreshing,
  fetchDashboardData,
  restaurantName,
  adminName,
}: CashierDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED'>('ALL');
  const [selectedBillOrder, setSelectedBillOrder] = useState<any | null>(null);

  // Completed Orders state
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [completedOrders, setCompletedOrders] = useState<KOT[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  const fetchCompletedOrders = async () => {
    try {
      setCompletedLoading(true);
      const res = await api.get('/orders/completed');
      setCompletedOrders(res.data.map(mapDbOrderToKot));
    } catch (err) {
      console.error('Failed to fetch completed orders:', err);
    } finally {
      setCompletedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompletedOrders();
    }
  }, [activeTab]);

  const cashierKots = useMemo(() => {
    return kots;
  }, [kots]);

  const filteredKots = useMemo(() => {
    return cashierKots.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        statusFilter === 'ALL' || kot.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [cashierKots, searchTerm, statusFilter]);

  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [completedOrders, searchTerm]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Cashier Billing Terminal
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Cashier Mode
            </span>
            {(isRefreshing || completedLoading) && (
              <InlineLoader message="Syncing..." className="ml-2" />
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage checkout requests, bill printing, and daily revenues.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'active') {
                fetchDashboardData();
              } else {
                fetchCompletedOrders();
              }
            }}
            disabled={isLoading || completedLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-all text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || completedLoading) ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-lg font-black text-white mt-1">₹{stats.todayRevenue.toLocaleString()}</h3>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Billing Orders</p>
            <h3 className="text-lg font-black text-white mt-1">{cashierKots.length} orders</h3>
          </div>
          <ShoppingCart className="w-6 h-6 text-blue-500" />
        </div>
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between shadow-md col-span-2 md:col-span-1">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Table Occupancy</p>
            <h3 className="text-lg font-black text-white mt-1">
              {tables.filter(t => t.status === 'OCCUPIED').length} / {tables.length} Occupied
            </h3>
          </div>
          <Users className="w-6 h-6 text-purple-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Orders ({filteredKots.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all ${
            activeTab === 'completed'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Completed Today ({completedOrders.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/20 border border-slate-800/60 p-3.5 rounded-xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={activeTab === 'active' ? "Search by KOT or Table..." : "Search completed orders..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800/80 pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600"
              />
            </div>

            {activeTab === 'active' && (
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                {(['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] as const).map(f => (
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
            )}
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
            {activeTab === 'active' ? (
              filteredKots.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  No orders waiting for service or billing checkout.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Table</th>
                        <th className="p-4">KOT #</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKots.map(kot => {
                        const grandTotal = (kot as any).grandTotal || 0;
                        return (
                          <tr key={kot.id} className="border-b border-slate-900 hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white">{kot.tableName}</td>
                            <td className="p-4 text-slate-400">{kot.kotNumber}</td>
                            <td className="p-4 font-extrabold text-emerald-400">₹{grandTotal.toLocaleString()}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                kot.status === 'READY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                kot.status === 'SERVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                                'bg-slate-800 text-slate-400 border border-slate-700/50'
                              }`}>
                                {kot.status}
                              </span>
                            </td>
                            <td className="p-4 flex gap-2 justify-end">
                              <button
                                onClick={() => setSelectedBillOrder(kot)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-1 transition-all"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Bill
                              </button>
                              {kot.status === 'READY' && (
                                <ButtonLoader
                                  loading={updatingKotId === kot.id}
                                  onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                                  className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition-all"
                                >
                                  Mark Served
                                </ButtonLoader>
                              )}
                              {kot.status === 'SERVED' && (
                                <ButtonLoader
                                  loading={updatingKotId === kot.id}
                                  onClick={() => handleUpdateStatus(kot.id, 'COMPLETED')}
                                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg transition-all"
                                >
                                  Checkout
                                </ButtonLoader>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              filteredCompletedOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  No completed orders found for today.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Table</th>
                        <th className="p-4">KOT #</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompletedOrders.map(kot => {
                        const grandTotal = (kot as any).grandTotal || 0;
                        return (
                          <tr key={kot.id} className="border-b border-slate-900 hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white">{kot.tableName}</td>
                            <td className="p-4 text-slate-400">{kot.kotNumber}</td>
                            <td className="p-4 font-extrabold text-emerald-400">₹{grandTotal.toLocaleString()}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                COMPLETED
                              </span>
                            </td>
                            <td className="p-4 flex gap-2 justify-end">
                              <button
                                onClick={() => setSelectedBillOrder(kot)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-1 transition-all"
                              >
                                <Receipt className="w-3.5 h-3.5" /> View Bill
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {selectedBillOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(to_right,transparent_50%,#1e293b_50%)] bg-[length:10px_4px]" />

            <div className="text-center pb-4 border-b border-dashed border-slate-800">
              <h2 className="font-black text-white text-base tracking-wider uppercase">{restaurantName || 'QR Restaurant'}</h2>
              <p className="text-[10px] text-slate-400 mt-1">Receipt Terminal #1</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Table: {selectedBillOrder.tableName} • KOT: {selectedBillOrder.kotNumber}</p>
              <p className="text-[9px] text-slate-600 mt-1" suppressHydrationWarning>
                {new Date(selectedBillOrder.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 text-xs">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-800">
                <span>Item Description</span>
                <span className="w-16 text-right">Qty x Price</span>
                <span className="w-16 text-right">Total</span>
              </div>
              {selectedBillOrder.items.map((it: any, idx: number) => {
                const itemTotal = it.price * it.quantity;
                return (
                  <div key={idx} className="flex justify-between leading-tight">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-200">{it.name}</p>
                      {it.customizations && it.customizations.length > 0 && (
                        <p className="text-[9px] text-slate-500 italic mt-0.5">{it.customizations.join(', ')}</p>
                      )}
                    </div>
                    <span className="w-16 text-right text-slate-400">
                      {it.quantity} x ₹{Number(it.price).toFixed(2)}
                    </span>
                    <span className="w-16 text-right font-bold text-slate-300">
                      ₹{itemTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>₹{selectedBillOrder.subtotal?.toFixed(2)}</span>
              </div>
              {selectedBillOrder.cgst !== null && selectedBillOrder.cgst !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>CGST ({selectedBillOrder.cgstRate !== null && selectedBillOrder.cgstRate !== undefined ? selectedBillOrder.cgstRate : 2.5}%)</span>
                  <span>₹{selectedBillOrder.cgst?.toFixed(2)}</span>
                </div>
              )}
              {selectedBillOrder.sgst !== null && selectedBillOrder.sgst !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>SGST ({selectedBillOrder.sgstRate !== null && selectedBillOrder.sgstRate !== undefined ? selectedBillOrder.sgstRate : 2.5}%)</span>
                  <span>₹{selectedBillOrder.sgst?.toFixed(2)}</span>
                </div>
              )}
              {selectedBillOrder.serviceCharge !== null && selectedBillOrder.serviceCharge !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>Service Charge ({selectedBillOrder.serviceChargeRate !== null && selectedBillOrder.serviceChargeRate !== undefined ? selectedBillOrder.serviceChargeRate : 5}%)</span>
                  <span>₹{selectedBillOrder.serviceCharge?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-sm border-t border-slate-800 pt-2.5">
                <span>GRAND TOTAL</span>
                <span className="text-emerald-400">₹{selectedBillOrder.grandTotal?.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setSelectedBillOrder(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
