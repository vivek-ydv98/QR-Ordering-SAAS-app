'use client';

import React from 'react';
import { Layers, ShoppingBag, Terminal, Users, Shield, ArrowRight, Zap, QrCode } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '../lib/routes';

export default function SaasProductHub() {
  const isDev = process.env.NODE_ENV !== 'production';

  const dashboards = [
    {
      title: 'Customer Ordering Experience',
      description: 'Mobile-first PWA QR code menu ordering with live cart customizations, Indian taxes, and status updates. Customers access this by scanning a table QR code.',
      icon: ShoppingBag,
      tag: 'Customer App',
      links: isDev
        ? [
            { label: 'Preview Demo: Tandoori Palace', path: '/tandoori-palace/table/t3', color: 'bg-orange-500 hover:bg-orange-600' },
            { label: 'Preview Demo: Veg Bite', path: '/veg-bite/table/v2', color: 'bg-emerald-500 hover:bg-emerald-600' },
          ]
        : [],
      devNote: !isDev ? 'Customers access this app by scanning a table QR code generated in the admin portal.' : null,
    },
    {
      title: 'Restaurant Operations Dashboard',
      description: 'Back-office panel for managers. Track sales, manage orders, view active tables, and generate QR tables.',
      icon: Terminal,
      tag: 'Merchant App',
      links: [{ label: 'Open Admin Portal', path: ROUTES.AUTH.LOGIN, color: 'bg-blue-600 hover:bg-blue-700' }],
      devNote: null,
    },
    {
      title: 'Kitchen Display System (KDS)',
      description: 'Tablet & TV layout displaying kitchen tickets with elapsed visual severity colors and synthesized buzzers.',
      icon: Layers,
      tag: 'Kitchen App',
      links: [{ label: 'Open Kitchen KDS', path: ROUTES.AUTH.LOGIN, color: 'bg-rose-600 hover:bg-rose-700' }],
      devNote: null,
    },
    {
      title: 'Waiter Operations Dashboard',
      description: 'Quick assistance log. Track active tables, table cleaning statuses, and live guest chimes.',
      icon: Users,
      tag: 'Service App',
      links: [{ label: 'Open Waiter Portal', path: ROUTES.AUTH.LOGIN, color: 'bg-indigo-600 hover:bg-indigo-700' }],
      devNote: null,
    },
    {
      title: 'Super Admin Control Panel',
      description: 'ROOT control panel to configure multi-tenant feature flags, track global orders placed today, and check audit logs.',
      icon: Shield,
      tag: 'Platform Provider App',
      links: [{ label: 'Open Root Control Panel', path: '/super-admin', color: 'bg-slate-700 hover:bg-slate-800' }],
      devNote: null,
    },
  ];


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden py-16 px-4 md:px-8 text-center border-b border-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        
        {/* Glow ambient effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-wider mb-6 animate-pulse">
            <Zap className="w-3 h-3" /> Multi-Tenant SaaS Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Next-Gen QR Ordering <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">Architecture</span>
          </h1>

          <p className="mt-4 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
            A production-ready, highly optimized Next.js App Router workspace designed for Indian dining environments. Fast page loads under low bandwidth, dynamic HSL skinning, and sub-second Socket.IO status updates.
          </p>
        </div>
      </section>

      {/* Grid Launcher Section */}
      <main className="max-w-5xl mx-auto px-4 py-12 w-full flex-1">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 border-b border-slate-900 pb-3">
          Interactive Operational Prototypes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboards.map((dash, index) => (
            <div
              key={index}
              className="bg-slate-900/40 border border-slate-850 hover:border-slate-750 p-6 rounded-2xl flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-primary/5 group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl group-hover:text-primary transition-colors">
                    <dash.icon className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 bg-slate-950 border border-slate-850 text-slate-400 rounded-full">
                    {dash.tag}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white leading-tight mb-2 group-hover:text-primary transition-colors">
                  {dash.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {dash.description}
                </p>
              </div>

              {/* Action Links */}
              <div className="flex flex-col gap-2 mt-auto">
                {dash.links.map((link, lIdx) => (
                  <a
                    key={lIdx}
                    href={link.path}
                    className={`flex items-center justify-between text-xs font-bold text-white px-4 py-3 rounded-xl shadow-md transition-all ${link.color}`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ))}
                {dash.devNote && (
                  <p className="text-[10px] text-slate-500 italic text-center pt-1">{dash.devNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-900 text-center text-[10px] text-slate-500 bg-slate-950">
        <p className="flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest">
          <QrCode className="w-3.5 h-3.5 text-primary" /> Indian Foodservice SaaS Architecture Portal
        </p>
      </footer>
    </div>
  );
}
