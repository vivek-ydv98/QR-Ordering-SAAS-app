'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '../types';

interface TenantContextProps {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextProps | undefined>(undefined);

export const TenantProvider: React.FC<{
  tenantSlug: string;
  children: React.ReactNode;
}> = ({ tenantSlug, children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const loadTenant = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.qr-ordering.in/v1';
        const res = await fetch(`${apiUrl}/restaurants/${tenantSlug}`);

        if (!res.ok) {
          throw new Error(`Restaurant not found (HTTP ${res.status})`);
        }

        const data = await res.json();

        if (!active) return;

        const mappedTenant: Tenant = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl || undefined,
          theme: {
            primary: data.theme?.primary ?? '24.6 95% 53.1%',
            primaryForeground: data.theme?.primaryForeground ?? '60 9.1% 97.8%',
            secondary: data.theme?.secondary ?? '220 14.3% 95.9%',
            background: data.theme?.background ?? '0 0% 100%',
            foreground: data.theme?.foreground ?? '224 71.4% 4.1%',
            radius: data.theme?.radius ?? '0.75rem',
          },
          config: {
            isVegOnly: data.restaurantSettings?.isVegOnly ?? false,
            allowUpiPayments: data.restaurantSettings?.allowUpiPayments ?? true,
            allowWaiterCall: data.restaurantSettings?.allowWaiterCall ?? true,
            taxRates: {
              cgst: data.restaurantSettings?.cgstRate === null ? null : Number(data.restaurantSettings?.cgstRate ?? 2.5),
              sgst: data.restaurantSettings?.sgstRate === null ? null : Number(data.restaurantSettings?.sgstRate ?? 2.5),
              serviceCharge: data.restaurantSettings?.serviceChargeRate === null ? null : Number(data.restaurantSettings?.serviceChargeRate ?? 5.0),
            },
          },
        };

        setTenant(mappedTenant);
        applyTheme(mappedTenant);
        setError(null);
      } catch (err: any) {
        if (active) {
          setTenant(null);
          setError(err?.message || 'Could not load restaurant. Please try again.');
        }
      }
    };

    const applyTheme = (data: Tenant) => {
      const root = document.documentElement;
      root.style.setProperty('--primary', data.theme.primary);
      root.style.setProperty('--primary-foreground', data.theme.primaryForeground);
      root.style.setProperty('--radius', data.theme.radius);

      if (data.config.isVegOnly) {
        root.classList.add('veg-only-mode');
      } else {
        root.classList.remove('veg-only-mode');
      }
    };

    loadTenant().finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
