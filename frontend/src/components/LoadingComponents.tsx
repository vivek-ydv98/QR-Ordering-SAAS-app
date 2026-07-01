'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';

// Animation constants to respect prefers-reduced-motion
const transitionConfig = {
  duration: 0.6,
  ease: 'easeInOut',
};

// Shimmer effect CSS (Tailwind integrated/custom fallback)
const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";
const lightShimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-slate-200/50 before:to-transparent";

/**
 * Custom animated SVG cloche (serving plate) with steam rising.
 * Domain-specific premium loader.
 */
function ServingClocheLoader({ theme = 'admin' }: { theme?: 'admin' | 'saffron' | 'emerald' | 'default' }) {
  let primaryColor = 'text-primary';
  let steamColor = 'text-primary/60';

  if (theme === 'saffron') {
    primaryColor = 'text-orange-500';
    steamColor = 'text-orange-400/60';
  } else if (theme === 'emerald') {
    primaryColor = 'text-emerald-500';
    steamColor = 'text-emerald-400/60';
  } else if (theme === 'admin') {
    primaryColor = 'text-emerald-400';
    steamColor = 'text-emerald-500/50';
  }

  // Steam lines animation variants
  const steamVariants = (delay: number) => ({
    animate: {
      y: [0, -12, -20],
      x: [0, delay % 2 === 0 ? 3 : -3, 0],
      opacity: [0, 0.8, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        delay,
        ease: 'easeOut',
      },
    },
  });

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Steam Lines */}
        <div className="absolute top-2 flex justify-center space-x-2.5 w-full">
          <motion.svg variants={steamVariants(0)} animate="animate" className={`w-3 h-8 ${steamColor}`} viewBox="0 0 10 30" fill="none">
            <path d="M5 25 Q2 15 8 10 T2 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </motion.svg>
          <motion.svg variants={steamVariants(0.6)} animate="animate" className={`w-3 h-8 ${steamColor}`} viewBox="0 0 10 30" fill="none">
            <path d="M5 25 Q8 15 2 10 T8 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </motion.svg>
          <motion.svg variants={steamVariants(0.3)} animate="animate" className={`w-3 h-8 ${steamColor}`} viewBox="0 0 10 30" fill="none">
            <path d="M5 25 Q3 17 7 12 T3 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </motion.svg>
        </div>

        {/* Cloche/Platter */}
        <motion.svg
          animate={{
            y: [0, -4, 0],
            rotate: [0, -1, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`w-20 h-20 mt-4 ${primaryColor}`}
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Cover Dome */}
          <path d="M10 42C10 24.3 22.1 14 32 14C41.9 14 54 24.3 54 42H10Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
          {/* Top handle knob */}
          <circle cx="32" cy="10" r="3.5" stroke="currentColor" strokeWidth="3.5" fill="currentColor" />
          {/* Base plate */}
          <path d="M6 46H58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M12 50H52" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </motion.svg>
      </div>
    </div>
  );
}

/**
 * 1. PageLoader
 * Full screen elegant loading state.
 */
export function PageLoader({
  message = 'Loading dashboard content...',
  theme = 'admin',
}: {
  message?: string;
  theme?: 'admin' | 'saffron' | 'emerald' | 'default';
}) {
  const isDark = theme === 'admin' || theme === 'default';
  
  return (
    <motion.div
      role="alert"
      aria-live="polite"
      aria-label={message}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transitionConfig}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Background glow effects */}
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-20 ${
        theme === 'saffron' ? 'bg-orange-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-primary'
      }`} />

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center space-y-6">
        {/* Animated Icon */}
        <ServingClocheLoader theme={theme} />

        <div className="space-y-2">
          <h2 className="text-sm font-extrabold tracking-wider uppercase opacity-90">
            {theme === 'admin' ? 'Merchant Console' : 'Dish Discovery'}
          </h2>
          <p className={`text-xs font-semibold px-4 animate-pulse ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {message}
          </p>
        </div>

        {/* Small Progress Dots */}
        <div className="flex items-center space-x-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className={`w-1.5 h-1.5 rounded-full ${
                theme === 'saffron' ? 'bg-orange-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-emerald-400'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 2. TableSkeleton
 * Skeleton rows for tables. Fits Orders, Categories, Audit Logs.
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
  theme = 'dark',
}: {
  rows?: number;
  cols?: number;
  theme?: 'dark' | 'light';
}) {
  const shimmer = theme === 'dark' ? shimmerClass : lightShimmerClass;
  const isDark = theme === 'dark';

  return (
    <div className={`w-full overflow-hidden border rounded-xl ${
      isDark ? 'border-slate-850 bg-slate-900/40' : 'border-slate-200 bg-white'
    }`}>
      {/* Header Row */}
      <div className={`flex items-center border-b px-4 py-3.5 gap-4 ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
      }`}>
        {Array.from({ length: cols }).map((_, idx) => (
          <div
            key={idx}
            className={`h-4 rounded bg-slate-800/60 w-1/4 ${shimmer}`}
            style={{ width: idx === 0 ? '15%' : idx === cols - 1 ? '15%' : '35%' }}
          />
        ))}
      </div>

      {/* Body Rows */}
      <div className="divide-y divide-slate-800/50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center px-4 py-4 gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => {
              // Custom structures to look real
              if (colIdx === 0) {
                // Table ID / Number badge
                return (
                  <div key={colIdx} className="w-[15%] flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg bg-slate-850 shrink-0 ${shimmer}`} />
                    <div className={`h-3 rounded bg-slate-800 w-12 ${shimmer}`} />
                  </div>
                );
              }
              if (colIdx === cols - 1) {
                // Actions button placeholder
                return (
                  <div key={colIdx} className="w-[15%] flex justify-end gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-slate-850 shrink-0 ${shimmer}`} />
                    <div className={`w-8 h-8 rounded-lg bg-slate-850 shrink-0 ${shimmer}`} />
                  </div>
                );
              }
              // Normal content fields
              return (
                <div key={colIdx} className="w-[35%] flex flex-col gap-1.5">
                  <div className={`h-3.5 rounded bg-slate-800 w-3/4 ${shimmer}`} />
                  <div className={`h-2.5 rounded bg-slate-850 w-1/2 ${shimmer}`} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. CardSkeleton
 * Multiple styled card skeletons to match the operational states.
 */
export function CardSkeleton({
  type = 'default',
  theme = 'dark',
}: {
  type?: 'metric' | 'table' | 'kot' | 'default';
  theme?: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const shimmer = isDark ? shimmerClass : lightShimmerClass;
  const bgCard = isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200';

  if (type === 'metric') {
    return (
      <div className={`border p-5 rounded-xl flex items-center justify-between shadow-sm ${bgCard}`}>
        <div className="space-y-3 flex-1">
          <div className={`h-2.5 rounded bg-slate-800 w-24 ${shimmer}`} />
          <div className={`h-7 rounded bg-slate-800 w-16 ${shimmer}`} />
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-850 shrink-0 ${shimmer}`} />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`border rounded-xl p-4 flex flex-col justify-between gap-4 h-44 shadow-sm ${bgCard}`}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 space-y-2.5">
            {/* Table Name */}
            <div className={`h-4 rounded bg-slate-800 w-24 ${shimmer}`} />
            {/* Status indicators */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-2">
                <div className={`h-3 rounded bg-slate-850 w-12 ${shimmer}`} />
                <div className={`h-3.5 rounded-full bg-slate-800 w-16 ${shimmer}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 rounded bg-slate-850 w-12 ${shimmer}`} />
                <div className={`h-3.5 rounded-full bg-slate-800 w-16 ${shimmer}`} />
              </div>
            </div>
          </div>
          {/* QR Code thumbnail */}
          <div className={`w-12 h-12 rounded bg-slate-800 shrink-0 ${shimmer}`} />
        </div>

        {/* Action icons bar */}
        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-850/30">
          <div className={`h-6 rounded bg-slate-850 ${shimmer}`} />
          <div className={`h-6 rounded bg-slate-850 ${shimmer}`} />
          <div className={`h-6 rounded bg-slate-850 ${shimmer}`} />
        </div>
      </div>
    );
  }

  if (type === 'kot') {
    return (
      <div className={`w-[300px] flex-shrink-0 border-2 rounded-2xl overflow-hidden flex flex-col shadow-xl ${
        isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="space-y-2 flex-1">
            <div className={`h-4.5 rounded bg-slate-800 w-28 ${shimmer}`} />
            <div className={`h-3 rounded bg-slate-850 w-36 ${shimmer}`} />
          </div>
          <div className={`w-14 h-5 rounded bg-slate-800 ${shimmer}`} />
        </div>

        {/* Items */}
        <div className="p-4 flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex justify-between items-center border-b border-slate-800/40 pb-2">
              <div className="flex-1 space-y-1.5">
                <div className={`h-3.5 rounded bg-slate-800 w-3/4 ${shimmer}`} />
                <div className={`h-2.5 rounded bg-slate-850 w-16 ${shimmer}`} />
              </div>
              <div className={`w-7 h-7 rounded-lg bg-slate-850 shrink-0 ${shimmer}`} />
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="p-3 border-t border-slate-800/40">
          <div className={`h-11 rounded-xl bg-slate-800 ${shimmer}`} />
        </div>
      </div>
    );
  }

  // Default block card skeleton
  return (
    <div className={`border p-4 rounded-xl space-y-3 ${bgCard}`}>
      <div className={`h-4 rounded bg-slate-800 w-1/3 ${shimmer}`} />
      <div className={`h-3 rounded bg-slate-850 w-full ${shimmer}`} />
      <div className={`h-3 rounded bg-slate-850 w-5/6 ${shimmer}`} />
      <div className="flex gap-2 pt-2">
        <div className={`w-16 h-7 rounded bg-slate-800 ${shimmer}`} />
        <div className={`w-16 h-7 rounded bg-slate-800 ${shimmer}`} />
      </div>
    </div>
  );
}

/**
 * 4. FormSkeleton
 * Skeletons for modals or management screens.
 */
export function FormSkeleton({ fields = 3, theme = 'dark' }: { fields?: number; theme?: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  const shimmer = isDark ? shimmerClass : lightShimmerClass;

  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className={`h-3 rounded bg-slate-800 w-24 ${shimmer}`} />
          <div className={`h-10 rounded-xl bg-slate-850 w-full border ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          } ${shimmer}`} />
        </div>
      ))}
      <div className="flex justify-end gap-2.5 pt-4">
        <div className={`w-20 h-9 rounded-lg bg-slate-850 ${shimmer}`} />
        <div className={`w-28 h-9 rounded-lg bg-slate-800 ${shimmer}`} />
      </div>
    </div>
  );
}

/**
 * 5. ButtonLoader
 * Elegant inline spinner/indicator replacing active text, disabling duplicate clicks.
 */
export function ButtonLoader({
  loading,
  children,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-all ${className} ${
        loading ? 'pointer-events-none opacity-85' : ''
      }`}
    >
      {/* Absolute Loading Layer */}
      <span
        className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity ${
          loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">Processing</span>
      </span>

      {/* Children Content Layer */}
      <span className={`flex items-center gap-1.5 transition-opacity duration-150 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
    </button>
  );
}

/**
 * 6. InlineLoader
 * Mini status loader for background operations ("Syncing...").
 */
export function InlineLoader({
  message = 'Syncing...',
  theme = 'dark',
  className = '',
}: {
  message?: string;
  theme?: 'dark' | 'light';
  className?: string;
}) {
  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
      isDark 
        ? 'bg-slate-900/90 text-slate-300 border-slate-800' 
        : 'bg-white/95 text-slate-600 border-slate-200'
    } shadow-sm backdrop-blur-sm ${className}`}>
      <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

/**
 * 7. OverlayLoader
 * Centered glassmorphic card loader overlay.
 */
export function OverlayLoader({
  message = 'Saving modifications...',
  theme = 'dark',
}: {
  message?: string;
  theme?: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-xs border p-5 rounded-2xl shadow-2xl space-y-4 text-center ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex justify-center pt-2">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Request Processing</h4>
          <p className="text-xs font-semibold text-slate-300 px-2 leading-relaxed">{message}</p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="bg-primary h-full w-1/3 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
