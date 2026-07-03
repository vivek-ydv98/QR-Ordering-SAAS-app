'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  Lock,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  BadgeCheck,
  Circle,
} from 'lucide-react';
import api from '../../../../lib/api';
import { ButtonLoader } from '../../../../components/LoadingComponents';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

/* ─── Password Strength ──────────────────────────────────────────────────── */
function getPasswordStrength(pwd: string): { score: number; label: string; color: string; tailwind: string } {
  if (!pwd) return { score: 0, label: '', color: '', tailwind: '' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Weak',        color: '#ef4444', tailwind: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair',        color: '#f97316', tailwind: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Good',        color: '#eab308', tailwind: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong',      color: '#22c55e', tailwind: 'bg-green-500' };
  return             { score, label: 'Very Strong',   color: '#10b981', tailwind: 'bg-emerald-500' };
}

/* ─── Avatar Initials ────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  const bar = 'h-4 rounded-md bg-slate-800/70 animate-profile-shimmer';
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      {/* Hero skeleton */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center gap-6 bg-white/[0.025] border border-white/[0.07] rounded-2xl p-8">
        <div className="w-20 h-20 rounded-full bg-slate-800/70 animate-profile-shimmer flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className={`${bar} w-44`} />
          <div className={`${bar} w-36 h-3`} />
          <div className={`${bar} w-24 h-6 rounded-full`} />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-7 space-y-4">
            <div className={`${bar} w-32`} />
            <div className={`${bar} w-full h-10`} />
            <div className={`${bar} w-full h-10`} />
            <div className={`${bar} w-28 h-9 ml-auto`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]  = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [pwdLoading,    setPwdLoading]    = useState(false);

  const strength       = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const clearMessages = useCallback(() => { setError(null); setSuccess(null); }, []);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/profile/me');
      setProfile(res.data);
      setFullName(res.data.fullName);
      setEmail(res.data.email);
    } catch {
      setError('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!fullName.trim() || !email.trim()) { setError('Full Name and Email are required.'); return; }
    try {
      setSubmitLoading(true);
      const res = await api.patch('/staff/profile/me', { fullName, email });
      setProfile(res.data);
      const local = localStorage.getItem('user_profile');
      if (local) {
        const lp = JSON.parse(local);
        lp.fullName = res.data.fullName;
        lp.email    = res.data.email;
        localStorage.setItem('user_profile', JSON.stringify(lp));
      }
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!newPassword)          { setError('Please enter a new password.'); return; }
    if (newPassword.length < 6){ setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    try {
      setPwdLoading(true);
      await api.patch('/staff/profile/me', { password: newPassword });
      setSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const initials  = getInitials(profile?.fullName || 'U');
  const roleLabel = profile?.role.replace(/_/g, ' ') || '';

  /* ── Shared input class ─────────────────────────────────────────────── */
  const inputCls =
    'w-full bg-black/40 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm ' +
    'text-slate-100 placeholder-slate-600 outline-none transition-all ' +
    'focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10';

  /* ── Shared label class ─────────────────────────────────────────────── */
  const labelCls = 'block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row items-center sm:items-center gap-6
                      bg-gradient-to-br from-emerald-500/[0.07] via-cyan-500/[0.05] to-violet-500/[0.05]
                      border border-white/[0.07] rounded-2xl p-7 sm:p-8 overflow-hidden">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="animate-hue-spin w-[88px] h-[88px] rounded-full p-[2.5px]
                          bg-gradient-to-br from-emerald-400 via-cyan-400 to-violet-500">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center
                            text-2xl font-black text-emerald-400 tracking-tighter">
              {initials}
            </div>
          </div>
          {/* Active badge */}
          <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-emerald-500
                          border-2 border-slate-950 flex items-center justify-center">
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
        </div>

        {/* Info */}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-50 tracking-tight truncate mb-1">
            {profile?.fullName}
          </h1>
          <p className="text-sm text-slate-500 mb-3 truncate">{profile?.email}</p>
          <span className="inline-flex items-center gap-2 px-3 py-1.5
                           bg-emerald-500/10 border border-emerald-500/25 rounded-full
                           text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-status-pulse" />
            <ShieldCheck size={11} />
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Toasts ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto">
        {success && (
          <div className="animate-toast-in flex items-center gap-2.5 mb-4 px-4 py-3.5 rounded-xl
                          bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-300 text-sm font-semibold">
            <BadgeCheck size={16} className="shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="animate-toast-in flex items-center gap-2.5 mb-4 px-4 py-3.5 rounded-xl
                          bg-red-500/[0.08] border border-red-500/20 text-red-300 text-sm font-semibold">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* ── Two-Column Cards ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

        {/* ── Account Information ──────────────────────────────────────── */}
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden
                        transition-colors hover:border-white/[0.11]">
          {/* Card Header */}
          <div className="flex items-start gap-3 px-6 py-5 bg-black/20 border-b border-white/[0.05]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <User size={15} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Account Information</p>
              <p className="text-xs text-slate-500 mt-0.5">Update your name and email address.</p>
            </div>
          </div>

          {/* Card Body */}
          <form onSubmit={handleUpdateDetails} className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className={labelCls}>Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-600 pointer-events-none">
                  <User size={14} />
                </span>
                <input
                  id="profile-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-600 pointer-events-none">
                  <Mail size={14} />
                </span>
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <div className="pt-3 mt-1 border-t border-white/[0.05] flex justify-end">
              <ButtonLoader
                type="submit"
                loading={submitLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white
                           bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl
                           shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30
                           hover:-translate-y-0.5 transition-all"
              >
                <Sparkles size={13} /> Save Changes
              </ButtonLoader>
            </div>
          </form>
        </div>

        {/* ── Security Credentials ─────────────────────────────────────── */}
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden
                        transition-colors hover:border-white/[0.11]">
          {/* Card Header */}
          <div className="flex items-start gap-3 px-6 py-5 bg-black/20 border-b border-white/[0.05]">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
              <KeyRound size={15} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Security Credentials</p>
              <p className="text-xs text-slate-500 mt-0.5">Set a strong password to protect your account.</p>
            </div>
          </div>

          {/* Card Body */}
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {/* New Password */}
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input
                  id="profile-new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <div
                        key={seg}
                        className={`flex-1 h-[3px] rounded-full transition-all duration-300 ${
                          strength.score >= seg ? strength.tailwind : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-right text-[11px] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls}>Confirm Password</label>
              <div className="relative">
                <input
                  id="profile-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmPassword && (
                <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${
                  passwordsMatch ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {passwordsMatch
                    ? <><Check size={12} /> Passwords match</>
                    : <><Circle size={12} /> Passwords do not match</>}
                </p>
              )}
            </div>

            <div className="pt-3 mt-1 border-t border-white/[0.05] flex justify-end">
              <ButtonLoader
                type="submit"
                loading={pwdLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white
                           bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl
                           shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30
                           hover:-translate-y-0.5 transition-all"
              >
                <Lock size={13} /> Update Password
              </ButtonLoader>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
