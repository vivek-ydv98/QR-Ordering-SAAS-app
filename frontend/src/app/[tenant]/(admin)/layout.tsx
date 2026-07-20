'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  Loader2,
  UtensilsCrossed,
  Layers,
  Terminal,
  LogOut,
  Menu,
  X,
  UserCheck,
  Database,
  Users,
  User,
  ShieldAlert,
  Receipt,
  Settings,
  Coffee
} from 'lucide-react';
import api from '../../../lib/api';
import { PageLoader } from '../../../components/LoadingComponents';
import { DashboardContext } from './DashboardContext';
import { ROUTES } from '../../../lib/routes';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [tenantId, setTenantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('Merchant Restaurant');
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Administrator');
  const [role, setRole] = useState('RESTAURANT_ADMIN');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('staff_auth_token');
      const profileStr = localStorage.getItem('user_profile');

      if (!token || !profileStr) {
        router.push(ROUTES.AUTH.LOGIN);
        return;
      }

      try {
        const profile = JSON.parse(profileStr);
        setTenantId(profile.restaurantId || '');
        setAdminName(profile.fullName);

        const urlParams = new URLSearchParams(window.location.search);
        const roleOverride = urlParams.get('role');
        if (roleOverride) {
          setRole(roleOverride);
        } else {
          setRole(profile.role || 'RESTAURANT_ADMIN');
        }

        const resId = profile.restaurantId;
        if (resId) {
          api.get(`/restaurants/by-id/${resId}`)
            .then(res => {
              setRestaurantName(res.data.name);
              setRestaurantLogo(res.data.logoUrl || null);
              setIsAuthLoading(false);
            })
            .catch(err => {
              console.error('Failed to load restaurant details:', err);
              setIsAuthLoading(false);
            });
        } else {
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.error('Error parsing profile context:', err);
        router.push(ROUTES.AUTH.LOGIN);
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('staff_auth_token');
    localStorage.removeItem('user_profile');
    router.push(ROUTES.AUTH.LOGIN);
  };

  const navItems = [
    { name: 'Live Orders', href: ROUTES.ADMIN.LIVE_ORDERS(tenantSlug), icon: Terminal, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER'] },
    { name: 'Kitchen KDS', href: ROUTES.ADMIN.KDS(tenantSlug), icon: Layers, allowedRoles: ['KITCHEN_STAFF'] },
    { name: 'Billing Terminal', href: ROUTES.ADMIN.BILLING(tenantSlug), icon: Receipt, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Waiter Hub', href: ROUTES.ADMIN.WAITER_HUB(tenantSlug), icon: Coffee, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER', 'WAITER'] },
    { name: 'Category Management', href: ROUTES.ADMIN.CATEGORIES(tenantSlug), icon: Layers, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER'] },
    { name: 'Menu & Add-ons', href: ROUTES.ADMIN.MENU(tenantSlug), icon: UtensilsCrossed, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER'] },
    { name: 'Table Management', href: ROUTES.ADMIN.TABLES(tenantSlug), icon: Database, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER'] },
    { name: 'Staff Management', href: ROUTES.ADMIN.STAFF(tenantSlug), icon: Users, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER'] },
    { name: 'Restaurant Settings', href: ROUTES.ADMIN.SETTINGS(tenantSlug), icon: Settings, allowedRoles: ['RESTAURANT_ADMIN'] },
    { name: 'My Profile', href: ROUTES.ADMIN.PROFILE(tenantSlug), icon: User, allowedRoles: ['RESTAURANT_ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN_STAFF', 'WAITER'] },
  ];

  const allowedNavItems = navItems.filter(item => item.allowedRoles.includes(role));

  const currentNavItem = navItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/'));
  const isRouteAllowed = !currentNavItem || currentNavItem.allowedRoles.includes(role);

  if (isAuthLoading) {
    return <PageLoader message="Securing merchant credentials..." theme="admin" />;
  }

  return (
    <DashboardContext.Provider value={{ tenantId, restaurantName, adminName, role, isAuthLoading }}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">

        <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 border-r border-slate-800">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              {restaurantLogo ? (
                <img src={restaurantLogo} alt={restaurantName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {restaurantName.charAt(0)}
                </span>
              )}
              {restaurantName}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400" /> {role.replace('_', ' ')}
            </p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {allowedNavItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="mb-4 px-2">
              <p className="text-xs text-slate-400 font-bold truncate">Operator</p>
              <p className="text-xs text-slate-500 truncate">{adminName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-bold text-xs py-2.5 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between bg-slate-900 px-6 py-4 border-b border-slate-800">
            <h1 className="text-md font-bold tracking-tight truncate text-white flex items-center gap-2">
              {restaurantLogo ? (
                <img src={restaurantLogo} alt={restaurantName} className="w-6 h-6 rounded object-cover" />
              ) : (
                <span className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary font-bold text-xs">
                  {restaurantName.charAt(0)}
                </span>
              )}
              {restaurantName}
            </h1>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm md:hidden flex justify-end">
              <div className="w-64 bg-slate-900 h-full p-6 flex flex-col border-l border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-slate-400">{role.replace('_', ' ')}</span>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-6 h-6 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <nav className="flex-1 space-y-2">
                  {allowedNavItems.map(item => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${isActive
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-400 font-bold truncate">Operator</p>
                  <p className="text-xs text-slate-500 truncate mb-4">{adminName}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-bold text-xs py-2.5 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            {isRouteAllowed ? (
              children
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-slate-950">
                <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce mb-4" />
                <h2 className="text-xl font-black text-white">Access Denied</h2>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                  You do not have permission to access this page. Please contact your restaurant administrator.
                </p>
              </div>
            )}
          </main>
        </div>

      </div>
    </DashboardContext.Provider>
  );
}
