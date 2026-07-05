'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Percent, 
  Settings, 
  Check, 
  AlertCircle,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import api from '../../../../lib/api';
import { ButtonLoader } from '../../../../components/LoadingComponents';

export default function SettingsPage() {
  const { role } = useDashboard();
  const isAuthorized = ['RESTAURANT_ADMIN', 'MANAGER'].includes(role);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [cgstEnabled, setCgstEnabled] = useState(false);
  const [cgstRate, setCgstRate] = useState('2.5');

  const [sgstEnabled, setSgstEnabled] = useState(false);
  const [sgstRate, setSgstRate] = useState('2.5');

  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargeRate, setServiceChargeRate] = useState('5.0');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/restaurants/settings/me');
      const data = res.data;

      if (data.cgstRate !== null && data.cgstRate !== undefined) {
        setCgstEnabled(true);
        setCgstRate(data.cgstRate.toString());
      } else {
        setCgstEnabled(false);
        setCgstRate('2.5');
      }

      if (data.sgstRate !== null && data.sgstRate !== undefined) {
        setSgstEnabled(true);
        setSgstRate(data.sgstRate.toString());
      } else {
        setSgstEnabled(false);
        setSgstRate('2.5');
      }

      if (data.serviceChargeRate !== null && data.serviceChargeRate !== undefined) {
        setServiceChargeEnabled(true);
        setServiceChargeRate(data.serviceChargeRate.toString());
      } else {
        setServiceChargeEnabled(false);
        setServiceChargeRate('5.0');
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Failed to load restaurant settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;

    // Validate inputs
    const cgstVal = cgstEnabled ? parseFloat(cgstRate) : null;
    const sgstVal = sgstEnabled ? parseFloat(sgstRate) : null;
    const scVal = serviceChargeEnabled ? parseFloat(serviceChargeRate) : null;

    if (cgstEnabled && (isNaN(cgstVal!) || cgstVal! < 0 || cgstVal! > 100)) {
      setError('CGST Rate must be between 0 and 100');
      return;
    }
    if (sgstEnabled && (isNaN(sgstVal!) || sgstVal! < 0 || sgstVal! > 100)) {
      setError('SGST Rate must be between 0 and 100');
      return;
    }
    if (serviceChargeEnabled && (isNaN(scVal!) || scVal! < 0 || scVal! > 100)) {
      setError('Service Charge Rate must be between 0 and 100');
      return;
    }

    try {
      setSubmitLoading(true);
      await api.patch('/restaurants/settings/me', {
        cgstRate: cgstVal,
        sgstRate: sgstVal,
        serviceChargeRate: scVal,
      });

      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setError(null);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-slate-400 text-xs">You do not have permission to view or configure restaurant settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Restaurant Settings
            <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
              Configuration
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure your outlet taxation, billing details, and service charge rates.</p>
        </div>
      </header>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs font-bold animate-fadeIn">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <Percent className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white">Taxes & Service Charges</h3>
          </div>

          <div className="space-y-6">
            {/* CGST */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Central GST (CGST)</span>
                  <button
                    type="button"
                    onClick={() => setCgstEnabled(!cgstEnabled)}
                    className="text-slate-400 hover:text-white transition-all"
                  >
                    {cgstEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Enable to calculate Central Goods and Services Tax on all orders.</p>
              </div>

              {cgstEnabled && (
                <div className="flex items-center gap-2 w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 text-right"
                  />
                  <span className="text-slate-400 text-xs font-bold">%</span>
                </div>
              )}
            </div>

            {/* SGST */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">State GST (SGST)</span>
                  <button
                    type="button"
                    onClick={() => setSgstEnabled(!sgstEnabled)}
                    className="text-slate-400 hover:text-white transition-all"
                  >
                    {sgstEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Enable to calculate State Goods and Services Tax on all orders.</p>
              </div>

              {sgstEnabled && (
                <div className="flex items-center gap-2 w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 text-right"
                  />
                  <span className="text-slate-400 text-xs font-bold">%</span>
                </div>
              )}
            </div>

            {/* Service Charge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Service Charge</span>
                  <button
                    type="button"
                    onClick={() => setServiceChargeEnabled(!serviceChargeEnabled)}
                    className="text-slate-400 hover:text-white transition-all"
                  >
                    {serviceChargeEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Enable to calculate custom outlet service charge on the subtotal.</p>
              </div>

              {serviceChargeEnabled && (
                <div className="flex items-center gap-2 w-32">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={serviceChargeRate}
                    onChange={(e) => setServiceChargeRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 text-right"
                  />
                  <span className="text-slate-400 text-xs font-bold">%</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Only Admins and Managers can apply changes.</span>
            </div>
            <ButtonLoader
              type="submit"
              loading={submitLoading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </ButtonLoader>
          </div>
        </form>
      )}
    </div>
  );
}
