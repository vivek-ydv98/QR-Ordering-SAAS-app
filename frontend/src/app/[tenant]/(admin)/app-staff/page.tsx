'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Check,
  Users,
  Edit,
  Key,
  History,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Clock,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import api from '../../../../lib/api';
import { TableSkeleton, ButtonLoader } from '../../../../components/LoadingComponents';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface Staff {
  id: string;
  restaurantId: string;
  userId: string;
  roleId: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function StaffPage() {
  const { role } = useDashboard();
  const isAuthorized = role === 'RESTAURANT_ADMIN' || role === 'MANAGER';
  const isAdmin = role === 'RESTAURANT_ADMIN';

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Email validation helper
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Reset password confirm modal
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Temporary credentials popup state
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordUser, setTempPasswordUser] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createFormErrors, setCreateFormErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [editFormErrors, setEditFormErrors] = useState<{ email?: string }>({});

  // Selected records
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Forms data state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    role: 'WAITER',
    password: '',
    isAvailable: true
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: '',
    isActive: true,
    isAvailable: true
  });

  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchStaff();
    }
  }, [isAuthorized]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setStaffList(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching staff list:', err);
      setError('Failed to load restaurant staff records.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      fullName: '',
      email: '',
      role: 'WAITER',
      password: '',
      isAvailable: true
    });
    setIsCreateOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fieldErrors: { fullName?: string; email?: string; password?: string } = {};
    if (!createForm.fullName.trim()) fieldErrors.fullName = 'Employee name is required.';
    if (!createForm.email.trim()) {
      fieldErrors.email = 'Email address is required.';
    } else if (!isValidEmail(createForm.email)) {
      fieldErrors.email = 'Please enter a valid email address.';
    }
    if (!createForm.password.trim()) fieldErrors.password = 'Password is required.';
    else if (createForm.password.length < 6) fieldErrors.password = 'Password must be at least 6 characters.';

    if (Object.keys(fieldErrors).length > 0) {
      setCreateFormErrors(fieldErrors);
      return;
    }
    setCreateFormErrors({});

    try {
      setSubmitLoading(true);
      const res = await api.post('/staff', {
        fullName: createForm.fullName,
        email: createForm.email,
        role: createForm.role,
        password: createForm.password,
        isAvailable: createForm.isAvailable
      });

      setIsCreateOpen(false);
      fetchStaff();

      if (res.data.temporaryPassword) {
        setTempPasswordUser(createForm.fullName);
        setTempPassword(res.data.temporaryPassword);
      } else {
        setSuccess('Staff member created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setError(err.response?.data?.message || 'Failed to create staff member.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setEditFormErrors({});
    setEditForm({
      fullName: staff.user.fullName,
      email: staff.user.email,
      role: staff.user.role,
      isActive: staff.user.isActive,
      isAvailable: staff.isAvailable
    });
    setIsEditOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEditFormErrors({});
    if (!selectedStaff) return;

    // Email validation
    if (!editForm.email.trim()) {
      setEditFormErrors({ email: 'Email address is required.' });
      return;
    }
    if (!isValidEmail(editForm.email)) {
      setEditFormErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    try {
      setSubmitLoading(true);
      await api.patch(`/staff/${selectedStaff.id}`, {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
        isAvailable: editForm.isAvailable
      });

      setIsEditOpen(false);
      setSuccess('Staff member details updated successfully.');
      fetchStaff();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating staff:', err);
      setError(err.response?.data?.message || 'Failed to update staff member details.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = (staff: Staff) => {
    setResetTarget(staff);
  };

  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    try {
      setIsResetting(true);
      setError(null);
      const res = await api.post(`/staff/${resetTarget.id}/reset-password`);
      setTempPasswordUser(resetTarget.user.fullName);
      setTempPassword(res.data.temporaryPassword);
      setResetTarget(null);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError('Failed to reset staff password.');
      setTimeout(() => setError(null), 4000);
      setResetTarget(null);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleActiveState = async (staff: Staff) => {
    try {
      setError(null);
      const nextActiveState = !staff.user.isActive;

      // Optimistic update
      setStaffList(prev => prev.map(s =>
        s.id === staff.id ? { ...s, user: { ...s.user, isActive: nextActiveState } } : s
      ));

      await api.patch(`/staff/${staff.id}`, {
        isActive: nextActiveState
      });

      setSuccess(`Staff account set to ${nextActiveState ? 'Active' : 'Deactivated'}.`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error toggling active status:', err);
      setError('Failed to update account status.');
      // Rollback
      setStaffList(prev => prev.map(s =>
        s.id === staff.id ? { ...s, user: { ...s.user, isActive: staff.user.isActive } } : s
      ));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleAvailability = async (staff: Staff) => {
    try {
      setError(null);
      const nextAvailability = !staff.isAvailable;

      // Optimistic update
      setStaffList(prev => prev.map(s =>
        s.id === staff.id ? { ...s, isAvailable: nextAvailability } : s
      ));

      await api.patch(`/staff/${staff.id}`, {
        isAvailable: nextAvailability
      });

      setSuccess(`Staff availability set to ${nextAvailability ? 'Available' : 'Unavailable'}.`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error toggling availability:', err);
      setError('Failed to update availability.');
      // Rollback
      setStaffList(prev => prev.map(s =>
        s.id === staff.id ? { ...s, isAvailable: staff.isAvailable } : s
      ));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleOpenActivity = async (staff: Staff) => {
    setSelectedStaff(staff);
    setIsActivityOpen(true);
    try {
      setActivityLoading(true);
      const res = await api.get(`/staff/${staff.id}/activity`);
      setActivityLogs(res.data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'RESTAURANT_ADMIN':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'MANAGER':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'CASHIER':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'KITCHEN_STAFF':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'WAITER':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-slate-950">
        <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce mb-4" />
        <h2 className="text-xl font-black text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          You do not have permission to view or manage staff members. Please contact your restaurant administrator.
        </p>
      </div>
    );
  }

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || s.user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">

      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Staff Control Centre
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Floor & Kitchen
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage employee profiles, role configurations, login audit logs, and status updates.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Team Member
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Search */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
            type="text"
            placeholder="Search by employee name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-100 placeholder-slate-500 w-full"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Filter Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="KITCHEN_STAFF">Kitchen Staff</option>
            <option value="WAITER">Waiter</option>
          </select>
        </div>
      </div>

      {/* Staff Listing Grid / Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} theme="dark" />
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl text-slate-500">
          <Users className="w-10 h-10 mb-2 text-slate-600 animate-pulse" />
          {searchTerm.trim() || roleFilter !== 'ALL' ? (
            <>
              <p className="text-sm font-bold text-slate-400">No staff members match your search</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                {searchTerm.trim()
                  ? <>No results for &quot;<span className="text-slate-300">{searchTerm}</span>&quot;. Try a different name, email, or clear the filter.</>
                  : 'No staff members match the selected role filter. Try a different role.'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-400">No staff members yet</p>
              <p className="text-xs text-slate-500 mt-1">Get started by creating your first employee profile.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10px] font-black tracking-wider uppercase">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4 w-32 text-center">Assigned Role</th>
                <th className="py-3 px-4 w-32 text-center">Floor Duty</th>
                <th className="py-3 px-4 w-32 text-center">Account Status</th>
                <th className="py-3 px-4 w-48 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-800/20 transition-all text-slate-300">

                  {/* Employee Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs">
                        {staff.user.role === 'RESTAURANT_ADMIN' ? '👑' : '👤'}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white flex items-center gap-1">
                          {staff.user.fullName}
                          {staff.user.id === staff.restaurantId && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 rounded font-normal">Owner</span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{staff.user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Assigned Role */}
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${getRoleBadgeColor(staff.user.role)}`}>
                      {staff.user.role.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Floor Duty Availability */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleAvailability(staff)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border transition-all ${staff.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                    >
                      {staff.isAvailable ? 'Available' : 'Resting'}
                    </button>
                  </td>

                  {/* Account Status Toggle */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActiveState(staff)}
                      disabled={staff.user.role === 'RESTAURANT_ADMIN'}
                      className={`inline-flex items-center gap-1 hover:scale-105 transition-all disabled:opacity-30 disabled:pointer-events-none`}
                      title={staff.user.role === 'RESTAURANT_ADMIN' ? 'Owner account cannot be deactivated' : ''}
                    >
                      {staff.user.isActive ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </td>

                  {/* Operations Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Log Activity */}
                      <button
                        onClick={() => handleOpenActivity(staff)}
                        className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Login Activity Audit"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => handleResetPassword(staff)}
                        className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Reset Security Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Details */}
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Staff member */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn">

            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Create Employee Account
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4" autoComplete="off" noValidate>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee Name *</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Rahul Sharma"
                  value={createForm.fullName}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, fullName: e.target.value });
                    if (createFormErrors.fullName) setCreateFormErrors(prev => ({ ...prev, fullName: undefined }));
                  }}
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-all ${
                    createFormErrors.fullName ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {createFormErrors.fullName && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={10} /> {createFormErrors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="example@gmail.com"
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, email: e.target.value });
                    if (createFormErrors.email) setCreateFormErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-all ${
                    createFormErrors.email ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {createFormErrors.email && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={10} /> {createFormErrors.email}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Role *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {isAdmin && <option value="MANAGER">Manager</option>}
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN_STAFF">Kitchen Staff</option>
                  <option value="WAITER">Waiter</option>
                </select>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={createForm.password}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, password: e.target.value });
                      if (createFormErrors.password) setCreateFormErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 pr-10 text-xs text-white placeholder-slate-600 outline-none transition-all ${
                      createFormErrors.password ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {createFormErrors.password && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={10} /> {createFormErrors.password}
                  </p>
                )}
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div>
                  <h5 className="text-xs font-bold text-white">Availability Status</h5>
                  <p className="text-[10px] text-slate-500">Currently active on floor for service</p>
                </div>
                <input
                  type="checkbox"
                  checked={createForm.isAvailable}
                  onChange={(e) => setCreateForm({ ...createForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-950"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <ButtonLoader
                  type="submit"
                  loading={submitLoading}
                  className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                >
                  Create Account
                </ButtonLoader>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff details */}
      {isEditOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn">

            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-emerald-400" /> Edit Employee Details
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="p-6 space-y-4">

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  placeholder="email@address.com"
                  value={editForm.email}
                  onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); if (editFormErrors.email) setEditFormErrors(prev => ({ ...prev, email: undefined })); }}
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none transition-all ${
                    editFormErrors.email ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {editFormErrors.email && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={10} /> {editFormErrors.email}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Role *</label>
                <select
                  value={editForm.role}
                  disabled={selectedStaff.user.role === 'RESTAURANT_ADMIN'}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  {selectedStaff.user.role === 'RESTAURANT_ADMIN' ? (
                    <option value="RESTAURANT_ADMIN">Restaurant Admin</option>
                  ) : (
                    <>
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="KITCHEN_STAFF">Kitchen Staff</option>
                      <option value="WAITER">Waiter</option>
                    </>
                  )}
                </select>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div>
                  <h5 className="text-xs font-bold text-white">Availability Status</h5>
                  <p className="text-[10px] text-slate-500">Currently active on floor for service</p>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.isAvailable}
                  onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-950"
                />
              </div>

              {/* Account Status */}
              {selectedStaff.user.role !== 'RESTAURANT_ADMIN' && (
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div>
                    <h5 className="text-xs font-bold text-white">Account Active</h5>
                    <p className="text-[10px] text-slate-500">Enable employee login access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-950"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <ButtonLoader
                  type="submit"
                  loading={submitLoading}
                  className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                >
                  Save Changes
                </ButtonLoader>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Login Activity Logs */}
      {isActivityOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoomIn">

            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" /> Activity History: {selectedStaff.user.fullName}
              </h3>
              <button
                onClick={() => setIsActivityOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {activityLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No login or logout activity recorded for this user.
                </div>
              ) : (
                <div className="space-y-4 relative border-l border-slate-800 pl-4 ml-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center shadow-inner"></span>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                          {log.action}
                        </span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsActivityOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                Close Logs
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Confirm Password Reset */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Reset Password?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  A new temporary password will be generated for{' '}
                  <span className="text-white font-bold">{resetTarget.user.fullName}</span>.
                  Their current password will be invalidated immediately.
                </p>
              </div>
            </div>

            {/* Warning strip */}
            <div className="mx-6 mb-5 flex items-start gap-2.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Make sure the staff member is not currently logged in before resetting.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 px-6 pb-6">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={isResetting}
                className="flex-1 py-2.5 text-xs font-bold border border-slate-700 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <ButtonLoader
                loading={isResetting}
                onClick={confirmResetPassword}
                className="flex-1 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20"
              >
                Yes, Reset Password
              </ButtonLoader>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Temp Password Reveal */}
      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Password Reset Successful</h3>
                <p className="text-xs text-slate-400 mt-1">New temporary credentials for{' '}
                  <span className="text-white font-bold">{tempPasswordUser}</span>
                </p>
              </div>
            </div>

            {/* Password box */}
            <div className="mx-6 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 text-center">Temporary Password</p>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3">
                <span className="flex-1 text-center text-lg font-black tracking-widest text-emerald-400 select-all">
                  {tempPassword}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : 'Copy'}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="mx-6 mb-5 flex items-start gap-2.5 bg-rose-500/[0.07] border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                This password is shown <span className="font-bold text-rose-300">only once</span>. Copy it now and share securely with the employee.
              </p>
            </div>

            {/* Done button */}
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setTempPassword(null);
                  setTempPasswordUser(null);
                  setCopied(false);
                  setSuccess('Password reset. New credentials ready for staff.');
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="w-full py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Done — I've copied the password
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
