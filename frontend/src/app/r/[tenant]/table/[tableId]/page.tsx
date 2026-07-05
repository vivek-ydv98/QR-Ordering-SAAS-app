'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useTenant } from '../../../../../context/TenantContext';
import { useCartStore } from '../../../../../store/useCartStore';
import { useUIStore } from '../../../../../store/useUIStore';
import { useSocket } from '../../../../../hooks/useSocket';
import { useToastStore } from '../../../../../store/useToastStore';
import { MenuItem, Category, SelectedCustomization, CartItem, WaiterRequestType } from '../../../../../types';
import { Search, ShoppingBag, Bell, X, Check, Heart, Plus, Minus, Info } from 'lucide-react';
import { PageLoader } from '../../../../../components/LoadingComponents';



export default function CustomerOrderingPage(props: {
  params: Promise<{ tenant: string; tableId: string }>;
}) {
  const params = use(props.params);
  const tenantSlug = params.tenant;
  const tableId = params.tableId;

  const { tenant, isLoading: tenantLoading } = useTenant();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotals } = useCartStore();
  const {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    filterVeg,
    setFilterVeg,
    isCartOpen,
    setCartOpen,
    isWaiterCallOpen,
    setWaiterCallOpen
  } = useUIStore();

  const { emitEvent, subscribeToEvent } = useSocket(tenant?.id, tableId);

  // States
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [customizerSelections, setCustomizerSelections] = useState<SelectedCustomization[]>([]);
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [placedOrder, setPlacedOrder] = useState<{ id: string; status: string } | null>(null);
  const [waiterCallReason, setWaiterCallReason] = useState<WaiterRequestType>('service');
  const [callSuccess, setCallSuccess] = useState(false);

  // Start with empty arrays — populated only from the live API
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [tableActive, setTableActive] = useState<boolean | null>(null);
  const [tableLoading, setTableLoading] = useState(true);

  // Fetch Menu from Database
  useEffect(() => {
    if (!tenant) return;

    let active = true;
    setMenuLoading(true);

    const fetchMenu = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.qr-ordering.in/v1';
        const res = await fetch(`${apiUrl}/restaurants/${tenant.id}/menu`);
        if (!res.ok) {
          throw new Error(`Menu API returned HTTP ${res.status}`);
        }
        if (active) {
          const data = await res.json();
          
          const cats: Category[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            isAvailable: c.isAvailable,
            sortOrder: c.sortOrder,
          }));

          const items: MenuItem[] = [];
          data.forEach((c: any) => {
            c.menuItems.forEach((item: any) => {
              const customizationGroups: any[] = [];

              if (item.variants && item.variants.length > 0) {
                customizationGroups.push({
                  id: `variants-${item.id}`,
                  name: 'Select Size / Portion',
                  minSelect: 1,
                  maxSelect: 1,
                  options: item.variants.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    price: Math.max(0, Number(v.price) - Number(item.price)),
                    isAvailable: v.isActive
                  }))
                });
              }

              if (item.addons && item.addons.length > 0) {
                customizationGroups.push({
                  id: `addons-${item.id}`,
                  name: 'Add-ons / Customizers',
                  minSelect: 0,
                  maxSelect: item.addons.length,
                  options: item.addons.map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    price: Number(a.price),
                    isAvailable: a.isActive
                  }))
                });
              }

              items.push({
                id: item.id,
                name: item.name,
                description: item.description,
                price: Number(item.price),
                isVeg: item.isVeg,
                isAvailable: item.isAvailable,
                imageUrl: item.imageUrl || undefined,
                categoryId: item.categoryId,
                customizationGroups,
              });
            });
          });

          setCategories(cats);
          setMenuItems(items);
          setMenuLoadError(null);
        }
      } catch (err: any) {
        if (active) {
          setMenuLoadError('Could not load the menu. Please try again or ask staff for assistance.');
        }
      } finally {
        if (active) setMenuLoading(false);
      }
    };

    fetchMenu();
    return () => {
      active = false;
    };
  }, [tenant]);

  // Fetch Table Activity Status
  useEffect(() => {
    if (!tableId) return;

    let active = true;
    setTableLoading(true);

    const fetchTableStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.qr-ordering.in/v1';
        const res = await fetch(`${apiUrl}/restaurants/tables/by-id/${tableId}`);
        if (res.ok && active) {
          const data = await res.json();
          setTableActive(data.isActive);
        } else if (active) {
          // If table lookup fails, default to active so ordering isn't blocked by a network hiccup
          setTableActive(true);
        }
      } catch (err) {
        if (active) setTableActive(true);
      } finally {
        if (active) setTableLoading(false);
      }
    };

    fetchTableStatus();
    return () => {
      active = false;
    };
  }, [tableId]);

  // Scroll to active category section
  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Filter and Search
  const filteredMenu = useMemo(() => {
    let items = menuItems;

    // Apply Veg-Only Tenant configuration override
    if (tenant?.config.isVegOnly) {
      items = items.filter(item => item.isVeg);
    } else if (filterVeg !== null) {
      items = items.filter(item => item.isVeg === filterVeg);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        item => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }

    return items;
  }, [filterVeg, searchQuery, tenant, menuItems]);

  // Totals calculations
  const totals = useMemo(() => {
    if (!tenant) return { subtotal: 0, cgst: 0, sgst: 0, serviceCharge: 0, grandTotal: 0 };
    return getTotals(tenant.config.taxRates);
  }, [cart, tenant, getTotals]);

  // Subscribe to live status updates
  useEffect(() => {
    if (!placedOrder) return;

    const unsubscribe = subscribeToEvent('order_status_update', (data: { orderId: string; status: string }) => {
      if (data.orderId === placedOrder.id) {
        setPlacedOrder(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    return unsubscribe;
  }, [placedOrder, subscribeToEvent]);

  // Customizer calculations
  const totalCustomizerPrice = useMemo(() => {
    return customizerSelections.reduce((sum, opt) => sum + opt.price, 0);
  }, [customizerSelections]);

  const handleCustomizationSelect = (
    group: MenuItem['customizationGroups'][0],
    option: MenuItem['customizationGroups'][0]['options'][0]
  ) => {
    const isSingle = group.minSelect === 1 && group.maxSelect === 1;

    if (isSingle) {
      // Replace existing choice in this group
      setCustomizerSelections(prev => [
        ...prev.filter(sel => sel.groupId !== group.id),
        {
          optionId: option.id,
          optionName: option.name,
          price: option.price,
          groupId: group.id,
          groupName: group.name
        }
      ]);
    } else {
      // Multi select toggle
      setCustomizerSelections(prev => {
        const exists = prev.some(sel => sel.optionId === option.id);
        if (exists) {
          return prev.filter(sel => sel.optionId !== option.id);
        } else {
          // Check limits
          const groupCount = prev.filter(sel => sel.groupId === group.id).length;
          if (groupCount >= group.maxSelect) {
            // Drop first one added in this group
            const firstOfGroup = prev.find(sel => sel.groupId === group.id);
            return [
              ...prev.filter(sel => sel !== firstOfGroup),
              {
                optionId: option.id,
                optionName: option.name,
                price: option.price,
                groupId: group.id,
                groupName: group.name
              }
            ];
          }
          return [
            ...prev,
            {
              optionId: option.id,
              optionName: option.name,
              price: option.price,
              groupId: group.id,
              groupName: group.name
            }
          ];
        }
      });
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    // Check if required groups are satisfied
    const unsatisfied = selectedItem.customizationGroups.filter(grp => {
      if (grp.minSelect > 0) {
        const selections = customizerSelections.filter(sel => sel.groupId === grp.id);
        return selections.length < grp.minSelect;
      }
      return false;
    });

    if (unsatisfied.length > 0) {
      useToastStore.getState().showWarning(`Please select options for: ${unsatisfied.map(u => u.name).join(', ')}`);
      return;
    }

    addToCart({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      basePrice: selectedItem.price,
      customizationPrice: totalCustomizerPrice,
      quantity: 1,
      customizations: customizerSelections,
      specialInstructions: ''
    });

    setSelectedItem(null);
    setCustomizerSelections([]);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.qr-ordering.in/v1';
      
      const itemsPayload = cart.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        customizations: item.customizations.map(c => ({
          optionName: c.optionName,
          price: c.price
        }))
      }));

      // Call backend to save order in DB
      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenant?.id || ''
        },
        body: JSON.stringify({
          tableId,
          items: itemsPayload,
          specialInstructions: cookingInstructions
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create order in database');
      }

      const dbOrder = await res.json();

      // Build socket payload using database order data
      const orderPayload = {
        orderId: dbOrder.id,
        tenantId: tenant?.id,
        tableId,
        tableName: dbOrder.table?.name || `Table ${tableId.substring(0, 4).toUpperCase()}`,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          isVeg: menuItems.find(m => m.id === item.menuItemId)?.isVeg ?? true,
          customizations: item.customizations.map(c => c.optionName)
        })),
        specialInstructions: cookingInstructions,
        taxSummary: totals,
        createdAt: dbOrder.createdAt
      };

      // Emit event through realtime socket
      emitEvent('order:create', orderPayload);

      // Save active order locally
      setPlacedOrder({
        id: dbOrder.id,
        status: dbOrder.status.toUpperCase()
      });

      useToastStore.getState().showSuccess('Order sent to the kitchen successfully!');

      clearCart();
      setCartOpen(false);
    } catch (err) {
      console.error('Error placing order:', err);
      useToastStore.getState().showError('Failed to place order. Please try again.');
    }
  };

  const handleCallWaiter = () => {
    if (!tenant) return;

    emitEvent('waiter:call', {
      id: `call_${Date.now()}`,
      tableId,
      tableName: `Table ${tableId.toUpperCase()}`,
      tenantId: tenant.id,
      requestType: waiterCallReason,
      timestamp: new Date().toISOString()
    });

    setCallSuccess(true);
    setTimeout(() => {
      setWaiterCallOpen(false);
      setCallSuccess(false);
    }, 1800);
  };

  // Derive loader theme from the tenant's primary color hue once loaded,
  // or fall back to 'saffron' (warm) before the tenant config is available.
  const loaderTheme = (() => {
    if (!tenant) return 'saffron';
    // HSL primary: if hue is in the green-teal range (80°–200°), use emerald loader
    const hsl = tenant.theme.primary;
    const hue = parseFloat(hsl.split(' ')[0]);
    return hue >= 80 && hue <= 200 ? 'emerald' : 'saffron';
  })();

  if (tenantLoading || tableLoading) {
    return <PageLoader message="Loading menu context..." theme={loaderTheme} />;
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-950">
        <X className="w-16 h-16 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Restaurant Profile Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The scanned QR code is either invalid or expired.</p>
      </div>
    );
  }

  if (tableActive === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="bg-amber-500/10 border border-amber-500/25 p-6 rounded-3xl mb-6 flex items-center justify-center shadow-lg shadow-amber-500/5">
          <Info className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Table Ordering Deactivated</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          This dining table is currently deactivated and cannot accept new orders. 
          Please contact our staff or wait for assistance.
        </p>
        {tenant && (
          <div className="mt-8 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 max-w-xs shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center">
              {tenant.name.charAt(0)}
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Restaurant</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">{tenant.name}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 flex flex-col w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">{tenant.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  Table {tableId.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tenant.config.allowWaiterCall && (
              <button
                onClick={() => setWaiterCallOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                aria-label="Call Waiter"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              onClick={() => cart.length > 0 && setCartOpen(true)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold shadow-md hover:scale-105 transition-all duration-200"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground ring-2 ring-white dark:ring-slate-950">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search & Veg/Non-Veg filters */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-900 border border-transparent rounded-lg focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!tenant.config.isVegOnly && (
            <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-0.5">
              <button
                onClick={() => setFilterVeg(null)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                  filterVeg === null
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterVeg(true)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                  filterVeg === true
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:text-emerald-500'
                }`}
              >
                <span className="veg-stamp scale-75"></span>
              </button>
              <button
                onClick={() => setFilterVeg(false)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                  filterVeg === false
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-muted-foreground hover:text-rose-500'
                }`}
              >
                <span className="nonveg-stamp scale-75"></span>
              </button>
            </div>
          )}
        </div>

        {/* Sticky Horizontal Categories Slider */}
        <div className="flex overflow-x-auto gap-2 px-4 pb-2 scrollbar-none hide-scrollbar">
          {menuLoading ? (
            [...Array(4)].map((_, idx) => (
              <div key={idx} className="flex-shrink-0 w-20 h-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))
          ) : (
            categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-white dark:bg-slate-900 text-foreground border-slate-200 dark:border-slate-800 hover:border-primary/50'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })
          )}
        </div>
      </header>

      {/* Live Order Tracker Banner */}
      {placedOrder && (
        <div className="mx-4 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Active Order Progress</p>
              <p className="text-sm font-extrabold capitalize text-foreground mt-0.5">
                Status: {placedOrder.status.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 bg-primary/20 text-primary rounded-full">
              KOT {placedOrder.id.replace('ord_', '#').toUpperCase()}
            </span>
            <button
              onClick={() => setPlacedOrder(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Menu Sections */}
      <main className="px-4 py-6 flex flex-col gap-8">
        {menuLoading ? (
          [...Array(2)].map((_, sectionIdx) => (
            <section key={sectionIdx}>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl shadow-sm animate-pulse"
                  >
                    <div className="flex-1 flex flex-col justify-between gap-2">
                      <div className="space-y-1.5">
                        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-850 rounded" />
                        <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-850 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-850 rounded" />
                    </div>
                    <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : menuLoadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-6 rounded-2xl mb-4">
              <X className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Menu Unavailable</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{menuLoadError}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        ) : (
          categories.map((category) => {
            const catItems = filteredMenu.filter((item) => item.categoryId === category.id);
            if (catItems.length === 0) return null;

            return (
              <section key={category.id} id={category.id} className="scroll-mt-48">
              <h2 className="text-lg font-black tracking-tight border-b border-slate-100 dark:border-slate-900 pb-2 mb-4 text-foreground flex items-center gap-2">
                {category.name}
                <span className="text-xs font-medium text-muted-foreground">({catItems.length} items)</span>
              </h2>

              <div className="flex flex-col gap-4">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Item Information */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={item.isVeg ? 'veg-stamp' : 'nonveg-stamp'}></span>
                          <h3 className="font-extrabold text-sm tracking-tight text-foreground leading-tight">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-black text-foreground">₹{item.price}</span>
                        {item.customizationGroups.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setCustomizerSelections(
                                item.customizationGroups
                                  .filter((g) => g.minSelect === 1 && g.maxSelect === 1)
                                  .map((g) => ({
                                    optionId: g.options[0].id,
                                    optionName: g.options[0].name,
                                    price: g.options[0].price,
                                    groupId: g.id,
                                    groupName: g.name,
                                  }))
                              );
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold tracking-wider uppercase border border-primary text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-150"
                          >
                            Add <Plus className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              addToCart({
                                menuItemId: item.id,
                                name: item.name,
                                basePrice: item.price,
                                customizationPrice: 0,
                                quantity: 1,
                                customizations: [],
                                specialInstructions: '',
                              })
                            }
                            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold border border-primary text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-150"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dish Image */}
                    {item.imageUrl && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        }) ) /* end of categories.map and conditional */}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between bg-primary text-primary-foreground px-5 py-4 rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 animate-bounce" />
              <div className="text-left">
                <span className="text-xs font-medium text-primary-foreground/85 block">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Items Added
                </span>
                <span className="text-sm font-black tracking-tight block">₹{totals.grandTotal.toFixed(0)}</span>
              </div>
            </div>
            <span className="text-xs font-extrabold tracking-widest uppercase flex items-center gap-1">
              View Cart <Check className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {/* CUSTOMIZATION DRAWER SHEET */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className={selectedItem.isVeg ? 'veg-stamp' : 'nonveg-stamp'}></span>
                <h3 className="font-extrabold text-base tracking-tight text-foreground ml-1.5 inline-block">
                  Customize "{selectedItem.name}"
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customization Options */}
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
              {selectedItem.customizationGroups.map((grp) => (
                <div key={grp.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm tracking-tight text-foreground">{grp.name}</h4>
                    <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {grp.minSelect > 0 ? 'Required' : 'Optional'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    {grp.options.map((opt) => {
                      const isSelected = customizerSelections.some((sel) => sel.optionId === opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleCustomizationSelect(grp, opt)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 ${
                            isSelected
                              ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </span>
                            <span className="text-xs text-foreground font-semibold">{opt.name}</span>
                          </div>
                          {opt.price > 0 && <span className="text-xs text-muted-foreground">+ ₹{opt.price}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Action */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Item Total</p>
                <p className="text-lg font-black text-foreground">₹{selectedItem.price + totalCustomizerPrice}</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 px-6 rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 text-center text-sm"
              >
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DINER CART DRAWER SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-primary" /> Your Cart
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
              {cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-900 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground leading-tight">{item.name}</p>
                    {item.customizations.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        {item.customizations.map((c) => c.optionName).join(', ')}
                      </p>
                    )}
                    <span className="text-xs font-black text-foreground block mt-1">
                      ₹{item.basePrice + item.customizationPrice}
                    </span>
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-muted-foreground"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-muted-foreground"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Cooking Instructions Box */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Special Cooking Instructions
                </label>
                <textarea
                  placeholder="E.g., Make spicy, less butter, no onions..."
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:border-primary resize-none h-16"
                />
              </div>

              {/* Bill Details Summary */}
              <div className="border-t border-dashed border-slate-200 dark:border-slate-850 pt-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST ({tenant.config.taxRates.cgst}%)</span>
                  <span>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST ({tenant.config.taxRates.sgst}%)</span>
                  <span>₹{totals.sgst.toFixed(2)}</span>
                </div>
                {tenant.config.taxRates.serviceCharge > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Charge ({tenant.config.taxRates.serviceCharge}%)</span>
                    <span>₹{totals.serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-1">
                  <span className="text-foreground">Grand Total</span>
                  <span className="text-foreground">₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-6 rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 text-center text-sm"
              >
                Confirm and Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITER CALL DIALOG BOX */}
      {isWaiterCallOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            {callSuccess ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base">Assistance Requested</h3>
                <p className="text-xs text-muted-foreground mt-1.5">A waiter has been assigned to Table {tableId.toUpperCase()}.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center w-full mb-4">
                  <h3 className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-primary" /> Request Assistance
                  </h3>
                  <button
                    onClick={() => setWaiterCallOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-left w-full mb-4">
                  Select a request type to notify the service floor:
                </p>

                <div className="grid grid-cols-2 gap-2 w-full mb-6">
                  {([
                    { id: 'water', label: 'Bottle of Water' },
                    { id: 'cutlery', label: 'Extra Cutlery' },
                    { id: 'bill', label: 'Bring the Bill' },
                    { id: 'service', label: 'Call Waiter' },
                  ] as const).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setWaiterCallReason(r.id)}
                      className={`p-3 text-xs font-semibold rounded-xl border text-center transition-all duration-150 ${
                        waiterCallReason === r.id
                          ? 'bg-primary/5 border-primary text-primary font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCallWaiter}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/95 transition-all text-xs"
                >
                  Send Request
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
