'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Check,
  Utensils,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  Layers
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import api from '../../../../lib/api';
import { FormSkeleton, ButtonLoader } from '../../../../components/LoadingComponents';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  price: string | number;
  sortOrder: number;
  isActive: boolean;
}

interface Addon {
  id: string;
  name: string;
  price: string | number;
  isActive: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string | number;
  discountPrice: string | number | null;
  isVeg: boolean;
  foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN' | 'JAIN';
  prepTime: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  imageUrl: string | null;
  categoryId: string;
  category: { name: string } | null;
  variants: Variant[];
  addons: Addon[];
}

export default function MenuPage() {
  const { role } = useDashboard();
  const isAdmin = role === 'RESTAURANT_ADMIN';

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Detail panel tab
  const [detailTab, setDetailTab] = useState<'INFO' | 'VARIANTS' | 'ADDONS'>('INFO');

  // Modals / Creators
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    categoryId: '',
    isVeg: true,
    foodType: 'VEG',
    prepTime: 15,
    isAvailable: true,
    isFeatured: false,
    isBestseller: false,
    imageUrl: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Variant/Addon Editor States
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, itemsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu-items')
      ]);
      setCategories(catRes.data);
      setItems(itemsRes.data);
      if (itemsRes.data.length > 0) {
        setSelectedItem(itemsRes.data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load menu data:', err);
      setError('Failed to fetch menu items and categories.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleItem = async (id: string) => {
    try {
      const res = await api.get(`/menu-items/${id}`);
      setSelectedItem(res.data);
      // Also update in the main items list
      setItems(prev => prev.map(item => item.id === id ? res.data : item));
    } catch (err) {
      console.error('Error fetching single item details:', err);
    }
  };

  const handleOpenCreate = () => {
    setItemFormData({
      name: '',
      description: '',
      price: '',
      discountPrice: '',
      categoryId: categories[0]?.id || '',
      isVeg: true,
      foodType: 'VEG',
      prepTime: 15,
      isAvailable: true,
      isFeatured: false,
      isBestseller: false,
      imageUrl: ''
    });
    setIsOpenCreate(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim() || !itemFormData.price) return;

    try {
      setSubmitLoading(true);
      const payload = {
        name: itemFormData.name,
        description: itemFormData.description,
        price: parseFloat(itemFormData.price),
        discountPrice: itemFormData.discountPrice ? parseFloat(itemFormData.discountPrice) : undefined,
        categoryId: itemFormData.categoryId,
        isVeg: itemFormData.isVeg,
        foodType: itemFormData.foodType,
        prepTime: parseInt(itemFormData.prepTime.toString()),
        isAvailable: itemFormData.isAvailable,
        isFeatured: itemFormData.isFeatured,
        isBestseller: itemFormData.isBestseller,
        imageUrl: itemFormData.imageUrl || undefined
      };

      const res = await api.post('/menu-items', payload);
      setSuccess('Menu item added successfully!');
      setIsOpenCreate(false);
      
      // Reload items list
      const itemsRes = await api.get('/menu-items');
      setItems(itemsRes.data);
      setSelectedItem(res.data);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating menu item:', err);
      setError(err.response?.data?.message || 'Failed to create menu item.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateItemInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setSubmitLoading(true);
      const payload = {
        name: selectedItem.name,
        description: selectedItem.description,
        price: parseFloat(selectedItem.price.toString()),
        discountPrice: selectedItem.discountPrice ? parseFloat(selectedItem.discountPrice.toString()) : null,
        categoryId: selectedItem.categoryId,
        isVeg: selectedItem.isVeg,
        foodType: selectedItem.foodType,
        prepTime: parseInt(selectedItem.prepTime.toString()),
        isAvailable: selectedItem.isAvailable,
        isFeatured: selectedItem.isFeatured,
        isBestseller: selectedItem.isBestseller,
        imageUrl: selectedItem.imageUrl || undefined
      };

      await api.patch(`/menu-items/${selectedItem.id}`, payload);
      setSuccess('Item details saved successfully!');
      
      // Refresh items
      const itemsRes = await api.get('/menu-items');
      setItems(itemsRes.data);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating item info:', err);
      setError('Failed to update menu item.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this menu item? This action is permanent.')) return;

    try {
      await api.delete(`/menu-items/${id}`);
      setSuccess('Menu item deleted successfully.');
      
      const updatedList = items.filter(item => item.id !== id);
      setItems(updatedList);
      setSelectedItem(updatedList[0] || null);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError('Failed to delete menu item.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleToggleItemStatus = async (item: MenuItem, field: 'isAvailable' | 'isFeatured' | 'isBestseller') => {
    const updatedVal = !item[field];
    
    // Optimistic update in state
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: updatedVal } : i));
    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: updatedVal } : null);
    }

    try {
      await api.patch(`/menu-items/${item.id}`, {
        [field]: updatedVal
      });
      setSuccess(`${field.replace('is', '')} status updated.`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to patch toggle:', err);
      setError('Failed to update status.');
      // Rollback
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: item[field] } : i));
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, [field]: item[field] } : null);
      }
      setTimeout(() => setError(null), 3000);
    }
  };

  // --- Variants Management (Admin Only) ---
  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newVariantName.trim() || !newVariantPrice) return;

    try {
      await api.post(`/menu-items/${selectedItem.id}/variants`, {
        name: newVariantName,
        price: parseFloat(newVariantPrice),
        isActive: true
      });
      setNewVariantName('');
      setNewVariantPrice('');
      setSuccess('Variant added successfully.');
      fetchSingleItem(selectedItem.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding variant:', err);
      setError('Failed to add variant.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDeleteVariant = async (vId: string) => {
    if (!selectedItem) return;
    if (!window.confirm('Delete this variant?')) return;

    try {
      await api.delete(`/variants/${vId}`);
      setSuccess('Variant removed.');
      fetchSingleItem(selectedItem.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting variant:', err);
      setError('Failed to delete variant.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // --- Addons Management (Admin Only) ---
  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newAddonName.trim() || !newAddonPrice) return;

    try {
      await api.post(`/menu-items/${selectedItem.id}/addons`, {
        name: newAddonName,
        price: parseFloat(newAddonPrice),
        isActive: true
      });
      setNewAddonName('');
      setNewAddonPrice('');
      setSuccess('Add-on added successfully.');
      fetchSingleItem(selectedItem.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding add-on:', err);
      setError('Failed to add add-on.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDeleteAddon = async (aId: string) => {
    if (!selectedItem) return;
    if (!window.confirm('Delete this add-on?')) return;

    try {
      await api.delete(`/addons/${aId}`);
      setSuccess('Add-on removed.');
      fetchSingleItem(selectedItem.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting add-on:', err);
      setError('Failed to delete add-on.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Menu & Add-ons Editor
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Dish Catalog
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage catalog prices, dish dietary tags, and customize modifiers.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Menu Item
        </button>
      </header>

      {/* Action Notification Banners */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dual Pane - Left Side: Item Catalog List Skeleton */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
            <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-slate-950 border border-slate-900 rounded-xl">
                  <div className="flex-1 flex flex-col justify-between gap-2">
                    <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse" />
                    <div className="h-3 w-1/4 bg-slate-850 rounded animate-pulse" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
          {/* Dual Pane - Right Side: Details Form Skeleton */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="h-6 w-44 bg-slate-800 rounded animate-pulse mb-6" />
            <FormSkeleton fields={4} theme="dark" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Dual Pane - Left Side: Item Catalog List */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-200 placeholder-slate-500 w-full"
                />
              </div>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500 mr-2" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-200 w-full cursor-pointer [&>option]:bg-slate-950 [&>option]:text-white"
                >
                  <option value="ALL" className="bg-slate-950 text-white">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No dishes match your filter search.
                </div>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-slate-800/80 border-emerald-500 shadow-md' 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-10 h-10 rounded-md object-cover border border-slate-800 bg-slate-900" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center text-xs">
                            🍛
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                            <h4 className="font-bold text-xs text-white truncate">{item.name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{item.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-black text-white">₹{item.price}</p>
                          {item.discountPrice && (
                            <p className="text-[9px] text-slate-500 line-through">₹{item.discountPrice}</p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-all ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Dual Pane - Right Side: Sticky Detail Editor */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {selectedItem ? (
              <div>
                
                {/* Detail Header bar */}
                <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${selectedItem.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <h3 className="text-sm font-black text-white">{selectedItem.name}</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Edit configurations and tags for this item</p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      onClick={() => handleToggleItemStatus(selectedItem, 'isAvailable')}
                      className={`px-2 py-1 rounded text-[9px] font-black border transition-all ${
                        selectedItem.isAvailable 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {selectedItem.isAvailable ? 'Available' : 'Hidden'}
                    </button>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-slate-800 bg-slate-950/50">
                  <button
                    onClick={() => setDetailTab('INFO')}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                      detailTab === 'INFO' 
                        ? 'border-emerald-500 text-white bg-slate-800/10' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Basic Details
                  </button>
                  <button
                    onClick={() => setDetailTab('VARIANTS')}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                      detailTab === 'VARIANTS' 
                        ? 'border-emerald-500 text-white bg-slate-800/10' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Portions / Variants ({selectedItem.variants?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('ADDONS')}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                      detailTab === 'ADDONS' 
                        ? 'border-emerald-500 text-white bg-slate-800/10' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Add-ons / Customizers ({selectedItem.addons?.length || 0})
                  </button>
                </div>

                {/* Tab content boxes */}
                <div className="p-6">

                  {/* TAB 1: BASIC INFO */}
                  {detailTab === 'INFO' && (
                    <form onSubmit={handleUpdateItemInfo} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Base Price (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={selectedItem.price}
                            onChange={(e) => setSelectedItem({ ...selectedItem, price: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Discount Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={selectedItem.discountPrice || ''}
                            onChange={(e) => setSelectedItem({ ...selectedItem, discountPrice: e.target.value ? e.target.value : null })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category *</label>
                          <div className="relative">
                            <select
                              value={selectedItem.categoryId}
                              onChange={(e) => setSelectedItem({ ...selectedItem, categoryId: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white outline-none focus-within:border-emerald-500 transition-all cursor-pointer appearance-none [&>option]:bg-slate-950 [&>option]:text-white"
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.name}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Food Type Tag *</label>
                          <div className="relative">
                            <select
                              value={selectedItem.foodType}
                              onChange={(e: any) => setSelectedItem({ 
                                ...selectedItem, 
                                foodType: e.target.value,
                                isVeg: ['VEG', 'VEGAN', 'JAIN'].includes(e.target.value) 
                              })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none [&>option]:bg-slate-950 [&>option]:text-white"
                            >
                              <option value="VEG" className="bg-slate-950 text-white">VEG</option>
                              <option value="NON_VEG" className="bg-slate-950 text-white">NON-VEG</option>
                              <option value="EGG" className="bg-slate-950 text-white">EGG</option>
                              <option value="VEGAN" className="bg-slate-950 text-white">VEGAN</option>
                              <option value="JAIN" className="bg-slate-950 text-white">JAIN</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prep Time (mins)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={selectedItem.prepTime}
                              onChange={(e) => setSelectedItem({ ...selectedItem, prepTime: parseInt(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                            />
                            <Clock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                          </div>
                        </div>

                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description *</label>
                        <textarea
                          rows={3}
                          value={selectedItem.description}
                          onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dish Photo Link</label>
                        <input
                          type="url"
                          value={selectedItem.imageUrl || ''}
                          onChange={(e) => setSelectedItem({ ...selectedItem, imageUrl: e.target.value || null })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-3">
                        <ButtonLoader
                          type="submit"
                          loading={submitLoading}
                          className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                        >
                          Save Dish Details
                        </ButtonLoader>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(selectedItem.id)}
                          disabled={!isAdmin}
                          className={`flex-1 py-2.5 text-xs font-bold border rounded-lg transition-all ${
                            isAdmin 
                              ? 'border-red-500/30 hover:bg-red-500/10 text-red-400' 
                              : 'border-slate-800 text-slate-700 cursor-not-allowed opacity-30'
                          }`}
                        >
                          Delete Item
                        </button>
                      </div>

                    </form>
                  )}

                  {/* TAB 2: VARIANTS (Portions) */}
                  {detailTab === 'VARIANTS' && (
                    <div className="space-y-6">
                      
                      {/* Read-Only Manager Notice */}
                      {!isAdmin && (
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-lg text-[10px] text-amber-400 font-bold">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Manager Role: Portions are read-only. Ask an Admin to modify.</span>
                        </div>
                      )}

                      {/* Add Variant Form */}
                      {isAdmin && (
                        <form onSubmit={handleAddVariant} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <input
                            type="text"
                            placeholder="Variant portion (e.g. Medium)"
                            required
                            value={newVariantName}
                            onChange={(e) => setNewVariantName(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price (₹)"
                            required
                            value={newVariantPrice}
                            onChange={(e) => setNewVariantPrice(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-lg py-1.5"
                          >
                            Add Portion
                          </button>
                        </form>
                      )}

                      {/* Variants List */}
                      <div className="space-y-2">
                        {selectedItem.variants?.length === 0 ? (
                          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg">
                            No portions defined. The dish will sell at its base price (₹{selectedItem.price}).
                          </div>
                        ) : (
                          selectedItem.variants?.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                              <div>
                                <p className="text-xs font-bold text-white">{v.name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Base price modifier</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-white">₹{v.price}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteVariant(v.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 3: ADD-ONS (Modifiers) */}
                  {detailTab === 'ADDONS' && (
                    <div className="space-y-6">

                      {/* Read-Only Manager Notice */}
                      {!isAdmin && (
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-lg text-[10px] text-amber-400 font-bold">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Manager Role: Add-ons are read-only. Ask an Admin to modify.</span>
                        </div>
                      )}

                      {/* Add Addon Form */}
                      {isAdmin && (
                        <form onSubmit={handleAddAddon} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <input
                            type="text"
                            placeholder="Add-on (e.g. Extra Cheese)"
                            required
                            value={newAddonName}
                            onChange={(e) => setNewAddonName(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price (₹)"
                            required
                            value={newAddonPrice}
                            onChange={(e) => setNewAddonPrice(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-lg py-1.5"
                          >
                            Add Modifier
                          </button>
                        </form>
                      )}

                      {/* Addons List */}
                      <div className="space-y-2">
                        {selectedItem.addons?.length === 0 ? (
                          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg">
                            No customizable extras or add-ons configured.
                          </div>
                        ) : (
                          selectedItem.addons?.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                              <div>
                                <p className="text-xs font-bold text-white">{a.name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Custom modifier price</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-white">₹{a.price}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteAddon(a.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-slate-500">
                <Utensils className="w-12 h-12 mb-2 text-slate-700" />
                <p className="text-sm font-bold text-slate-400">No dish selected</p>
                <p className="text-xs text-slate-500 mt-1">Select an item from the left pane or click Add Menu Item.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal: Add Menu Item */}
      {isOpenCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoomIn">
            
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white">Add New Dish</h3>
              <button 
                onClick={() => setIsOpenCreate(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dish Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer Tikka Multani"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category *</label>
                  <div className="relative">
                    <select
                      value={itemFormData.categoryId}
                      onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white outline-none focus-within:border-emerald-500 transition-all cursor-pointer appearance-none [&>option]:bg-slate-950 [&>option]:text-white"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Base Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Price"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Discount Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Discount Price"
                    value={itemFormData.discountPrice}
                    onChange={(e) => setItemFormData({ ...itemFormData, discountPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Food Type *</label>
                  <div className="relative">
                    <select
                      value={itemFormData.foodType}
                      onChange={(e: any) => setItemFormData({ 
                        ...itemFormData, 
                        foodType: e.target.value,
                        isVeg: ['VEG', 'VEGAN', 'JAIN'].includes(e.target.value)
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none [&>option]:bg-slate-950 [&>option]:text-white"
                    >
                      <option value="VEG" className="bg-slate-950 text-white">VEG</option>
                      <option value="NON_VEG" className="bg-slate-950 text-white">NON-VEG</option>
                      <option value="EGG" className="bg-slate-950 text-white">EGG</option>
                      <option value="VEGAN" className="bg-slate-950 text-white">VEGAN</option>
                      <option value="JAIN" className="bg-slate-950 text-white">JAIN</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prep Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemFormData.prepTime}
                    onChange={(e) => setItemFormData({ ...itemFormData, prepTime: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/dish.jpg"
                    value={itemFormData.imageUrl}
                    onChange={(e) => setItemFormData({ ...itemFormData, imageUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-655 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Fresh cottage cheese chunks spiced with cardamoms and slow-grilled in a clay pot."
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-655 outline-none focus:border-emerald-500 transition-all resize-none"
                />
              </div>


              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenCreate(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <ButtonLoader
                  type="submit"
                  loading={submitLoading}
                  className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                >
                  Create Dish
                </ButtonLoader>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
