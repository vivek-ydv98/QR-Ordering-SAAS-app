'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../../../../lib/api';
import { ButtonLoader, TableSkeleton } from '../../../../components/LoadingComponents';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Update details form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // Password change form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status/Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/profile/me');
      setProfile(res.data);
      setFullName(res.data.fullName);
      setEmail(res.data.email);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }

    try {
      setSubmitLoading(true);
      const res = await api.patch('/staff/profile/me', { fullName, email });
      setProfile(res.data);
      
      // Update local storage cached profile
      const localProfileStr = localStorage.getItem('user_profile');
      if (localProfileStr) {
        const localProfile = JSON.parse(localProfileStr);
        localProfile.fullName = res.data.fullName;
        localProfile.email = res.data.email;
        localStorage.setItem('user_profile', JSON.stringify(localProfile));
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setPwdLoading(true);
      await api.patch('/staff/profile/me', { password: newPassword });
      setSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change security password.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
        <div className="max-w-3xl mx-auto space-y-4">
          <TableSkeleton rows={3} cols={2} theme="dark" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
      
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Page Header */}
        <header className="border-b border-slate-800 pb-5">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            My Profile
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Account Security
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage your employee information and password settings.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Sidebar / Status Card */}
          <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center justify-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
              👤
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">{profile?.fullName}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{profile?.email}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {profile?.role.replace('_', ' ')}
            </div>
          </div>

          {/* Form Content */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Account Information Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" /> Account Settings
                </h4>
              </div>

              <form onSubmit={handleUpdateDetails} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="name@restaurant.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                </div>

                <div className="pt-2 flex justify-end">
                  <ButtonLoader
                    type="submit"
                    loading={submitLoading}
                    className="px-5 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Save Details
                  </ButtonLoader>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> Security Credentials
                </h4>
              </div>

              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 pr-10 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-305 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-650 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <ButtonLoader
                    type="submit"
                    loading={pwdLoading}
                    className="px-5 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Change Password
                  </ButtonLoader>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
