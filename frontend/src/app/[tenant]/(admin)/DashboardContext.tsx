'use client';

import React, { createContext, useContext } from 'react';

export interface DashboardContextType {
  tenantId: string;
  restaurantName: string;
  adminName: string;
  role: string;
  isAuthLoading: boolean;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardLayout');
  }
  return context;
}
