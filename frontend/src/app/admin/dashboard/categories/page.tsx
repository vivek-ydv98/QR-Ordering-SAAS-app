'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Check,
  FolderOpen
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import api from '../../../../lib/api';
import { TableSkeleton, ButtonLoader } from '../../../../components/LoadingComponents';

interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isAvailable: boolean;
}

export default function CategoriesPage() {
  const { role } = useDashboard();
  const isAdmin = role === 'RESTAURANT_ADMIN';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog / Drawer states
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isAvailable: true
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      // Sort initially by sortOrder
      const sorted = res.data.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder);
      setCategories(sorted);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError('Failed to load menu categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      isAvailable: true
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isAvailable: category.isAvailable
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitLoading(true);
      if (editingCategory) {
        // Edit Category
        await api.patch(`/categories/${editingCategory.id}`, {
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          isAvailable: formData.isAvailable
        });
        setSuccess('Category updated successfully!');
      } else {
        // Create Category
        // Assign sortOrder as the current categories length
        const sortOrder = categories.length;
        await api.post('/categories', {
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          sortOrder,
          isAvailable: formData.isAvailable
        });
        setSuccess('Category created successfully!');
      }
      setIsOpen(false);
      fetchCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving category:', err);
      setError(err.response?.data?.message || 'Error occurred while saving category.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this category? All items inside this category will be detached or deleted.')) return;

    try {
      await api.delete(`/categories/${id}`);
      setSuccess('Category deleted successfully.');
      fetchCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleToggleAvailability = async (category: Category) => {
    try {
      const updatedStatus = !category.isAvailable;
      // Optimistic update
      setCategories(prev =>
        prev.map(c => c.id === category.id ? { ...c, isAvailable: updatedStatus } : c)
      );

      await api.patch(`/categories/${category.id}`, {
        isAvailable: updatedStatus
      });
      
      setSuccess(`Category status set to ${updatedStatus ? 'Available' : 'Unavailable'}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error toggling category availability:', err);
      setError('Failed to update category status.');
      // Rollback
      setCategories(prev =>
        prev.map(c => c.id === category.id ? { ...c, isAvailable: category.isAvailable } : c)
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    // Swap items
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Optimistic update
    setCategories(list);

    try {
      const ids = list.map(c => c.id);
      await api.patch('/categories/sort', { ids });
    } catch (err: any) {
      console.error('Error saving sorted category list:', err);
      setError('Failed to save sorted order.');
      fetchCategories(); // Rollback
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Category Management
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Store Layout
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Organize your menu layout structure and control category display order.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </header>

      {/* Action Banners */}
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

      {/* Search and Filter */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full max-w-md">
        <Search className="w-4 h-4 text-slate-500 mr-2" />
        <input
          type="text"
          placeholder="Search categories by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-100 placeholder-slate-500 w-full"
        />
      </div>

      {/* Categories Grid/List */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} theme="dark" />
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl text-slate-500">
          <FolderOpen className="w-10 h-10 mb-2 text-slate-600" />
          <p className="text-sm font-bold text-slate-400">No categories found</p>
          <p className="text-xs text-slate-500 mt-1">Get started by creating your first category.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10px] font-black tracking-wider uppercase">
                <th className="py-3 px-4 w-12 text-center">Order</th>
                <th className="py-3 px-4">Category Details</th>
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCategories.map((category, index) => (
                <tr key={category.id} className="hover:bg-slate-800/20 transition-all text-slate-300">
                  
                  {/* Reorder Buttons */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white disabled:opacity-30 transition-all"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-black text-slate-500">{index + 1}</span>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white disabled:opacity-30 transition-all"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Category Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={category.imageUrl} 
                          alt={category.name} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-800" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs">
                          📦
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-white">{category.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-sm">
                          {category.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status Availability */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleAvailability(category)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${
                        category.isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {category.isAvailable ? (
                        <>
                          <Eye className="w-3 h-3" /> Available
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Hidden
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Edit Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={!isAdmin}
                        className={`p-2 rounded-lg transition-all ${
                          isAdmin 
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300' 
                            : 'bg-slate-900 text-slate-700 cursor-not-allowed opacity-30'
                        }`}
                        title={isAdmin ? 'Delete Category' : 'Only Admins can delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create or Edit Category */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn">
            
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white">
                {editingCategory ? 'Edit Menu Category' : 'Create Menu Category'}
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starters, Main Course"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Brief description of category items..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div>
                  <h5 className="text-xs font-bold text-white">Active Status</h5>
                  <p className="text-[10px] text-slate-500">Show this category on public menus</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-950"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <ButtonLoader
                  type="submit"
                  loading={submitLoading}
                  className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </ButtonLoader>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
