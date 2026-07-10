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

  const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  return {
    id: order.id,
    kotNumber: order.kotNumber || order.id.slice(0, 8).toUpperCase(),
    tableId: order.tableId || order.table?.id || '',
    tableName: order.table?.name || order.tableId?.slice(0, 8) || 'T',
    status: statusMap[order.status] || 'PENDING',
    items: (order.items || []).map((item: any) => {
      const rawCustomizations = (item.customizations || []) as any[];
      const customizationNames = rawCustomizations
        .map((a: any) => (typeof a === 'string' ? a : a.optionName || ''))
        .filter(Boolean);

      const variantName = customizationNames.length > 0 ? ` (${customizationNames.join(', ')})` : '';
      const customizationPrice = rawCustomizations.reduce((sum: number, a: any) => sum + (Number(a.price) || 0), 0);

      return {
        name: (item.menuItem?.name || item.name || 'Item') + variantName,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        isVeg: item.menuItem?.isVeg ?? item.isVeg ?? true,
        customizations: customizationNames,
      };
    }),
    subtotal: Number(order.subtotal) || 0,
    cgst: order.cgst !== null && order.cgst !== undefined ? Number(order.cgst) : null,
    sgst: order.sgst !== null && order.sgst !== undefined ? Number(order.sgst) : null,
    serviceCharge: order.serviceCharge !== null && order.serviceCharge !== undefined ? Number(order.serviceCharge) : null,
    cgstRate: order.cgstRate !== null && order.cgstRate !== undefined ? Number(order.cgstRate) : null,
    sgstRate: order.sgstRate !== null && order.sgstRate !== undefined ? Number(order.sgstRate) : null,
    serviceChargeRate: order.serviceChargeRate !== null && order.serviceChargeRate !== undefined ? Number(order.serviceChargeRate) : null,
    grandTotal: Number(order.grandTotal) || 0,
    specialInstructions: order.specialInstructions || '',
    createdAt: order.createdAt,
    elapsedMinutes: elapsed,
  };
};

interface CashierDashboardComponentProps {
  kots: KOT[];
  tables: Table[];
  stats: {
    todayRevenue: number;
    liveKots: number;
    tableOccupancy: { occupied: number; total: number };
    avgPrepSpeed: number | null;
  };
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
}: CashierDashboardComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'SERVED' | 'COMPLETED'>('ALL');
  const [billKotId, setBillKotId] = useState<string | null>(null);

  const billingKots = useMemo(() => {
    return kots.filter(kot => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(kot.status));
  }, [kots]);

  const filteredKots = useMemo(() => {
    return billingKots.filter(kot => {
      const matchesSearch =
        kot.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kot.kotNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || kot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [billingKots, searchTerm, statusFilter]);

  const billKot = billKotId ? billingKots.find(k => k.id === billKotId) ?? null : null;

  const handlePrintReceipt = (kot: KOT) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      useToastStore.getState().showWarning('Please allow popups to print receipts.');
      return;
    }

    const subtotal = kot.subtotal || kot.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
    const grandTotal = kot.grandTotal || subtotal;

    const taxLines = [];
    if (kot.cgst != null && kot.cgstRate != null) taxLines.push(`<div class="item"><span>CGST @ ${kot.cgstRate}%</span><span>₹${kot.cgst.toFixed(2)}</span></div>`);
    if (kot.sgst != null && kot.sgstRate != null) taxLines.push(`<div class="item"><span>SGST @ ${kot.sgstRate}%</span><span>₹${kot.sgst.toFixed(2)}</span></div>`);
    if (kot.serviceCharge != null && kot.serviceChargeRate != null) taxLines.push(`<div class="item"><span>Service Charge @ ${kot.serviceChargeRate}%</span><span>₹${kot.serviceCharge.toFixed(2)}</span></div>`);

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${kot.kotNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 20px; }
            h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
            .sub { text-align: center; font-size: 11px; margin-top: 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>${restaurantName}</h1>
          <p class="sub">KOT: ${kot.kotNumber} | Table: ${kot.tableName}</p>
          <div class="divider"></div>
          ${kot.items.map(item => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>₹${((item.price || 0) * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
          ${taxLines.join('\n')}
          <div class="total">Grand Total: ₹${grandTotal.toFixed(2)}</div>
          <p class="footer">Thank you! Visit again.</p>
          <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); };<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Billing Terminal</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage orders, process payments, and print receipts</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today&apos;s Revenue</p>
              <h3 className="text-2xl font-black text-white mt-1.5">₹{stats.todayRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Bills</p>
              <h3 className="text-2xl font-black text-white mt-1.5">{stats.liveKots} Items</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Table Occupancy</p>
              <h3 className="text-2xl font-black text-white mt-1.5">{stats.tableOccupancy.occupied}/{stats.tableOccupancy.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900 border border-slate-800/60 p-4 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search KOT / Table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {(['ALL', 'READY', 'SERVED', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === f
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-600'
              }`}
            >
              {f === 'ALL' ? 'All Orders' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KOT Table */}
      {filteredKots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800/80 rounded-xl">
          <Receipt className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-sm font-bold text-slate-400">No billing items found</p>
          <p className="text-xs text-slate-500 mt-1">Orders that are ready for billing will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKots.map(kot => {
            const displayTotal = kot.grandTotal || kot.subtotal || kot.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
            return (
              <div key={kot.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="font-extrabold text-base text-white truncate">{kot.tableName}</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-md shrink-0">#{kot.kotNumber}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
                        kot.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                        kot.status === 'READY' ? 'bg-blue-500/15 text-blue-400' :
                        kot.status === 'SERVED' ? 'bg-purple-500/15 text-purple-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{kot.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {kot.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col bg-slate-950 border border-slate-800/50 rounded-md overflow-hidden">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 text-slate-300">
                            <span className={item.isVeg ? 'veg-stamp scale-[0.6]' : 'nonveg-stamp scale-[0.6]'} />
                            {item.name}
                            <span className="text-slate-500 font-bold ml-0.5">x{item.quantity}</span>
                            <span className="text-slate-400 font-bold ml-auto">₹{(item.price || 0) * item.quantity}</span>
                          </span>
                          {item.customizations.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
                              {item.customizations.map((c, ci) => (
                                <span key={ci} className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {kot.specialInstructions && (
                      <p className="text-[10px] text-amber-400/80 mt-2 italic bg-amber-500/5 px-2.5 py-1 rounded-md inline-block">
                        📝 {kot.specialInstructions}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <span className="font-black text-white text-lg">₹{displayTotal.toFixed(2)}</span>
                    <div className="w-px h-8 bg-slate-800 mx-1" />
                    <button
                      onClick={() => setBillKotId(kot.id)}
                      className="border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                    >
                      Bill
                    </button>
                    <ButtonLoader
                      loading={updatingKotId === kot.id}
                      onClick={() => handlePrintReceipt(kot)}
                      className="border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </ButtonLoader>
                    {kot.status === 'READY' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20"
                      >
                        Mark Served
                      </ButtonLoader>
                    )}
                    {kot.status === 'SERVED' && (
                      <ButtonLoader
                        loading={updatingKotId === kot.id}
                        onClick={() => handleUpdateStatus(kot.id, 'COMPLETED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Complete &amp; Pay
                      </ButtonLoader>
                    )}
                  </div>
                </div>

                {/* Elapsed time footer */}
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${
                    kot.elapsedMinutes > 30 ? 'text-red-400' :
                    kot.elapsedMinutes > 15 ? 'text-amber-400' :
                    'text-slate-500'
                  }`}>
                    {kot.elapsedMinutes > 60
                      ? `${Math.floor(kot.elapsedMinutes / 60)}h ${kot.elapsedMinutes % 60}m ago`
                      : `${kot.elapsedMinutes}m ago`}
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(kot.createdAt).toLocaleString()}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-500">
                    {kot.items.reduce((s, i) => s + i.quantity, 0)} items
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Detail Modal */}
      {billKot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBillKotId(null)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base">Bill Details</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">#{billKot.kotNumber} · {billKot.tableName}</p>
              </div>
              <button onClick={() => setBillKotId(null)} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Items List */}
            <div className="px-5 py-4 max-h-64 overflow-y-auto space-y-3">
              {billKot.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={item.isVeg ? 'veg-stamp scale-[0.55]' : 'nonveg-stamp scale-[0.55]'} />
                      <span className="text-sm font-bold text-white truncate">{item.name}</span>
                    </div>
                    {item.customizations.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-3">{item.customizations.join(', ')}</p>
                    )}
                    <p className="text-[10px] text-slate-500 ml-3">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">₹{(item.price || 0) * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>₹{(billKot.subtotal || 0).toFixed(2)}</span>
              </div>
              {billKot.cgst != null && billKot.cgstRate != null && (
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>CGST ({billKot.cgstRate}%)</span>
                  <span>₹{billKot.cgst.toFixed(2)}</span>
                </div>
              )}
              {billKot.sgst != null && billKot.sgstRate != null && (
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>SGST ({billKot.sgstRate}%)</span>
                  <span>₹{billKot.sgst.toFixed(2)}</span>
                </div>
              )}
              {billKot.serviceCharge != null && billKot.serviceChargeRate != null && (
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Service Charge ({billKot.serviceChargeRate}%)</span>
                  <span>₹{billKot.serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-base border-t border-slate-700 pt-2">
                <span>Grand Total</span>
                <span>₹{(billKot.grandTotal || (billKot.subtotal || billKot.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0))).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => { setBillKotId(null); handlePrintReceipt(billKot); }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
