import React from 'react';
import { TenantProvider } from '../../../context/TenantContext';

export default async function TenantLayout(props: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const params = await props.params;
  const tenantSlug = params.tenant;

  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {props.children}
      </div>
    </TenantProvider>
  );
}
