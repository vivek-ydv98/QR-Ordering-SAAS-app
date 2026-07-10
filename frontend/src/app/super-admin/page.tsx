'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Database, Layers, Server, Activity, Plus,
  Power, RefreshCw, LogOut, Copy, Check, User, Mail,
  Phone, MapPin, Globe, Loader2, AlertCircle, CheckCircle, Lock, Edit3,
  QrCode, Printer, Download, Upload, RefreshCw as RotateCcw, ShoppingBag
} from 'lucide-react';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import { useToastStore } from '../../store/useToastStore';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { PageLoader, CardSkeleton, TableSkeleton, InlineLoader, ButtonLoader } from '../../components/LoadingComponents';

// Helper for generating custom styled QR code as Base64 Data URL (drawing custom logo if present)
const generateQrDataUrl = async (url: string, fgColor: string, bgColor: string, logoUrl?: string | null): Promise<string> => {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    color: {
      dark: fgColor || '#000000',
      light: bgColor || '#ffffff',
    },
  });

  if (!logoUrl) {
    return qrDataUrl;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const qrImage = new Image();
    const logoImage = new Image();

    qrImage.onload = () => {
      canvas.width = qrImage.width;
      canvas.height = qrImage.height;
      if (!ctx) {
        resolve(qrDataUrl);
        return;
      }
      ctx.drawImage(qrImage, 0, 0);

      logoImage.onload = () => {
        const logoSize = canvas.width * 0.22;
        const x = (canvas.width - logoSize) / 2;
        const y = (canvas.height - logoSize) / 2;

        ctx.fillStyle = bgColor || '#ffffff';
        const radius = logoSize * 0.15;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + logoSize - radius, y);
        ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
        ctx.lineTo(x + logoSize, y + logoSize - radius);
        ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
        ctx.lineTo(x + radius, y + logoSize);
        ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        const innerSize = logoSize * 0.85;
        const innerX = x + (logoSize - innerSize) / 2;
        const innerY = y + (logoSize - innerSize) / 2;
        ctx.drawImage(logoImage, innerX, innerY, innerSize, innerSize);

        resolve(canvas.toDataURL('image/png'));
      };

      logoImage.onerror = () => {
        resolve(qrDataUrl);
      };

      logoImage.src = logoUrl;
    };

    qrImage.onerror = () => {
      resolve(qrDataUrl);
    };

    qrImage.src = qrDataUrl;
  });
};

const printBulkQrCodes = async (
  tables: any[],
  restaurantName: string,
  restaurantSlug: string,
  fgColor: string,
  bgColor: string,
  logoUrl?: string | null
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    useToastStore.getState().showWarning('Please allow popups to print QR codes.');
    return;
  }

  const origin = window.location.origin;

  const qrImagesHtml = await Promise.all(
    tables.map(async (table) => {
      let qrDataUrl = '';
      if (table.qrCodeUrl) {
        qrDataUrl = table.qrCodeUrl;
      } else {
        const tableUrl = `${origin}/r/${restaurantSlug}/table/${table.id}`;
        qrDataUrl = await generateQrDataUrl(tableUrl, fgColor, bgColor, logoUrl);
      }

      return `
        <div class="qr-card">
          <div class="restaurant-name">${restaurantName}</div>
          <div class="table-name">${table.name}</div>
          <img class="qr-img" src="${qrDataUrl}" alt="${table.name} QR Code" />
          <div class="scan-instructions">Scan to Order & Pay</div>
          <div class="table-url">${origin}/r/${restaurantSlug}/table/${table.id}</div>
        </div>
      `;
    })
  );

  printWindow.document.write(`
    <html>
      <head>
        <title>Print QR Codes - ${restaurantName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #fff;
            color: #000;
            text-align: center;
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }
          .qr-card {
            border: 2px dashed #ccc;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            background: #fff;
          }
          .restaurant-name {
            font-size: 14px;
            font-weight: 850;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #333;
            margin-bottom: 2px;
          }
          .table-name {
            font-size: 20px;
            font-weight: 900;
            color: #000;
            margin-bottom: 15px;
          }
          .qr-img {
            width: 200px;
            height: 200px;
            object-fit: contain;
          }
          .scan-instructions {
            margin-top: 15px;
            font-size: 12px;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .table-url {
            margin-top: 5px;
            font-size: 8px;
            color: #888;
            word-break: break-all;
            max-width: 180px;
          }
          @media print {
            body {
              padding: 0;
            }
            .qr-grid {
              gap: 20px;
            }
            .qr-card {
              border: 1px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-grid">
          ${qrImagesHtml.join('')}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

interface RestaurantAdmin {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

interface DBRestaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  address?: string;
  subscriptionStatus: string;
  isActive: boolean;
  maxTables: number;
  createdAt: string;
  users: RestaurantAdmin[];
  _count: {
    users: number;
    tables: number;
  };
  restaurantSettings?: {
    qrFgColor: string;
    qrBgColor: string;
    qrLogoUrl?: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
  } | null;
  restaurant?: {
    name: string;
  } | null;
}

function TableQrCard({
  table,
  restaurant,
  onDelete,
  onUpload,
  onRegenerate,
  onPrint,
  onDownload,
}: {
  table: any;
  restaurant: DBRestaurant;
  onDelete: (id: string) => void;
  onUpload: (id: string, base64: string) => void;
  onRegenerate: (id: string) => void;
  onPrint: (table: any) => void;
  onDownload: (table: any) => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const settings = restaurant.restaurantSettings;
  const fgColor = settings?.qrFgColor || '#000000';
  const bgColor = settings?.qrBgColor || '#ffffff';
  const logoUrl = settings?.qrLogoUrl;

  useEffect(() => {
    if (table.qrCodeUrl) {
      setQrUrl(table.qrCodeUrl);
      return;
    }

    const generate = async () => {
      setLoading(true);
      try {
        const url = `${window.location.origin}/r/${restaurant.slug}/table/${table.id}`;
        const dataUrl = await generateQrDataUrl(url, fgColor, bgColor, logoUrl);
        setQrUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate preview', err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [table.qrCodeUrl, table.id, restaurant.slug, fgColor, bgColor, logoUrl]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bold text-white text-sm block">{table.name}</span>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider shrink-0 text-[8px]">Scope:</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${table.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                {table.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider shrink-0 text-[8px]">Status:</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-900 text-slate-400">
                {table.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider shrink-0 text-[8px]">QR Type:</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${table.qrCodeUrl ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                }`}>
                {table.qrCodeUrl ? 'Custom' : 'System'}
              </span>
            </div>
          </div>
        </div>

        {/* QR Preview Thumb */}
        <div className="w-12 h-12 bg-white rounded p-0.5 border border-slate-800 flex items-center justify-center shrink-0">
          {loading ? (
            <div className="w-full h-full bg-slate-800 animate-pulse rounded" />
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR Thumbnail" className="w-full h-full object-contain" />
          ) : (
            <QrCode className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* QR Actions */}
      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-905">
        <button
          type="button"
          onClick={() => onPrint(table)}
          className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
        >
          <Printer className="w-3 h-3 text-indigo-400" /> Print
        </button>
        <button
          type="button"
          onClick={() => onDownload(table)}
          className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
        >
          <Download className="w-3 h-3 text-emerald-400" /> Download
        </button>
        <div className="relative col-span-2">
          <input
            type="file"
            accept="image/*"
            id={`upload-qr-${table.id}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    onUpload(table.id, event.target.result as string);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label
            htmlFor={`upload-qr-${table.id}`}
            className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800 cursor-pointer w-full text-center"
          >
            <Upload className="w-3 h-3 text-amber-400" /> Upload QR
          </label>
        </div>
        <button
          type="button"
          onClick={() => onRegenerate(table.id)}
          className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" /> Regenerate
        </button>
        <button
          type="button"
          onClick={() => onDelete(table.id)}
          className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded py-1 px-1.5 text-[9px] font-bold border border-red-500/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminPanel() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<DBRestaurant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<{
    totalOrdersToday: number;
    activeRestaurants: number;
    activeTables: number;
    ordersByRestaurant: { restaurantId: string; count: number }[];
  }>({
    totalOrdersToday: 0,
    activeRestaurants: 0,
    activeTables: 0,
    ordersByRestaurant: [],
  });

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    type: 'orders' | 'restaurants' | 'tables' | null;
    title: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
  });

  const handleCardClick = (type: 'orders' | 'restaurants' | 'tables', title: string) => {
    setDetailsModal({
      isOpen: true,
      type,
      title,
    });
  };

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1); // 1: form, 2: success credentials
  const [tempCredentials, setTempCredentials] = useState<{
    restaurantName: string;
    adminEmail: string;
    tempPass: string;
  } | null>(null);

  // Onboarding Form fields
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    address: '',
    logoUrl: '',
    adminName: '',
    adminEmail: '',
    maxTables: 10,
  });

  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardEmailErrors, setOnboardEmailErrors] = useState<{ ownerEmail?: string; adminEmail?: string }>({});

  // Edit Form fields
  const [isEditingOpen, setIsEditingOpen] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    address: '',
    logoUrl: '',
    subscriptionStatus: 'active',
    maxTables: 10,
    qrFgColor: '#000000',
    qrBgColor: '#ffffff',
    qrLogoUrl: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editOwnerEmailError, setEditOwnerEmailError] = useState<string | null>(null);

  // Edit User modal state
  const [isEditingUserOpen, setIsEditingUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    email: '',
  });
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserEmailError, setEditUserEmailError] = useState<string | null>(null);

  // Email validation helper
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Copy state
  const [copiedText, setCopiedText] = useState(false);
  const [resetPassCredentials, setResetPassCredentials] = useState<{
    adminEmail: string;
    tempPass: string;
    adminName: string;
  } | null>(null);

  // Reset confirmation modal state
  const [resetConfirmTarget, setResetConfirmTarget] = useState<{
    userId: string;
    adminName: string;
    adminEmail: string;
  } | null>(null);

  // Manage Tables modal state
  const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<DBRestaurant | null>(null);
  const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesSuccess, setTablesSuccess] = useState<string | null>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);

  // Auth check and initial fetch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('staff_auth_token');
      const profileStr = localStorage.getItem('user_profile');

      if (!token || !profileStr) {
        router.push(ROUTES.AUTH.LOGIN);
        return;
      }

      const profile = JSON.parse(profileStr);
      if (profile.role !== 'SUPER_ADMIN') {
        router.push(ROUTES.AUTH.LOGIN);
        return;
      }

      setCurrentUser(profile);
      fetchData();
    }
  }, []);

  // Automatically generate slug from restaurant name
  useEffect(() => {
    if (onboardForm.name) {
      const slug = onboardForm.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove invalid characters
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-'); // collapse duplicate hyphens
      setOnboardForm(prev => ({ ...prev, slug }));
    }
  }, [onboardForm.name]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [resRestaurants, resAuditLogs, resStats] = await Promise.all([
        api.get('/restaurants'),
        api.get('/audit-logs'),
        api.get('/restaurants/super-admin/stats')
      ]);

      const fetchedRestaurants = resRestaurants.data as DBRestaurant[];
      setRestaurants(fetchedRestaurants);
      setAuditLogs(resAuditLogs.data as AuditLog[]);

      const stats = resStats.data as { totalOrdersToday: number; ordersByRestaurant: { restaurantId: string; count: number }[] };

      // Compute metrics
      const activeCount = fetchedRestaurants.filter(r => r.isActive).length;
      const tablesCount = fetchedRestaurants.reduce((sum, r) => sum + (r._count?.tables || 0), 0);

      setMetrics({
        totalOrdersToday: stats.totalOrdersToday,
        activeRestaurants: activeCount,
        activeTables: tablesCount,
        ordersByRestaurant: stats.ordersByRestaurant || [],
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Super Admin dashboard data:', err);
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_auth_token');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('tenant_id');
    router.push(ROUTES.AUTH.LOGIN);
  };

  const handleToggleActive = async (restaurantId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/restaurants/${restaurantId}`, { isActive: !currentStatus });

      // Update local state instantly
      setRestaurants(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, isActive: !currentStatus } : r)
      );

      // Log success and refresh audit logs
      useToastStore.getState().showSuccess('Restaurant status updated successfully.');
      fetchData();
    } catch (err) {
      useToastStore.getState().showError('Failed to update restaurant status.');
    }
  };

  const handleResetPasswordClick = (userId: string, adminName: string, adminEmail: string) => {
    setResetConfirmTarget({ userId, adminName, adminEmail });
  };

  const executeResetPassword = async () => {
    if (!resetConfirmTarget) return;
    const { userId, adminName, adminEmail } = resetConfirmTarget;
    setResetConfirmTarget(null);

    try {
      const res = await api.post(`/users/${userId}/reset-password`, {});
      const tempPass = res.data.temporaryPassword;
      setResetPassCredentials({
        adminEmail,
        adminName,
        tempPass
      });
      useToastStore.getState().showSuccess('Password reset successfully.');
      fetchData();
    } catch (err) {
      useToastStore.getState().showError('Failed to reset user password.');
    }
  };

  const handleOpenEdit = (tenant: DBRestaurant) => {
    setEditingRestaurantId(tenant.id);
    const settings = tenant.restaurantSettings;
    setEditForm({
      name: tenant.name,
      slug: tenant.slug,
      ownerName: tenant.ownerName || '',
      ownerEmail: tenant.ownerEmail || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      logoUrl: tenant.logoUrl || '',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      maxTables: tenant.maxTables || 10,
      qrFgColor: settings?.qrFgColor || '#000000',
      qrBgColor: settings?.qrBgColor || '#ffffff',
      qrLogoUrl: settings?.qrLogoUrl || '',
    });
    setIsEditingOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    setEditOwnerEmailError(null);

    // Validate owner email
    const ownerEmailTrimmed = editForm.ownerEmail.trim();
    if (ownerEmailTrimmed && !isValidEmail(ownerEmailTrimmed)) {
      setEditOwnerEmailError('Please enter a valid email address.');
      setEditLoading(false);
      return;
    }

    try {
      await api.patch(`/restaurants/${editingRestaurantId}`, {
        name: editForm.name,
        slug: editForm.slug,
        ownerName: editForm.ownerName,
        ownerEmail: editForm.ownerEmail,
        phone: editForm.phone,
        address: editForm.address,
        logoUrl: editForm.logoUrl || undefined,
        subscriptionStatus: editForm.subscriptionStatus,
        maxTables: editForm.maxTables,
        qrFgColor: editForm.qrFgColor,
        qrBgColor: editForm.qrBgColor,
        qrLogoUrl: editForm.qrLogoUrl || null,
      });

      setIsEditingOpen(false);
      setEditingRestaurantId(null);
      fetchData(); // refresh in background
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Update failed. Please review your inputs.';
      setEditError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenEditUser = (userId: string, fullName: string, email: string) => {
    setEditingUserId(userId);
    setEditUserForm({
      fullName,
      email,
    });
    setIsEditingUserOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUserLoading(true);
    setEditUserError(null);
    setEditUserEmailError(null);

    // Validate email
    const emailTrimmed = editUserForm.email.trim();
    if (!emailTrimmed) {
      setEditUserEmailError('Email address is required.');
      setEditUserLoading(false);
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setEditUserEmailError('Please enter a valid email address.');
      setEditUserLoading(false);
      return;
    }

    try {
      await api.patch(`/users/${editingUserId}`, {
        fullName: editUserForm.fullName,
        email: editUserForm.email,
      });

      setIsEditingUserOpen(false);
      setEditingUserId(null);
      fetchData(); // refresh in background
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Update failed. Please review your inputs.';
      setEditUserError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError(null);
    setOnboardEmailErrors({});

    // Validate email fields
    const emailErrors: { ownerEmail?: string; adminEmail?: string } = {};
    if (onboardForm.ownerEmail.trim() && !isValidEmail(onboardForm.ownerEmail)) {
      emailErrors.ownerEmail = 'Please enter a valid email address.';
    }
    if (!onboardForm.adminEmail.trim()) {
      emailErrors.adminEmail = 'Admin email is required.';
    } else if (!isValidEmail(onboardForm.adminEmail)) {
      emailErrors.adminEmail = 'Please enter a valid email address.';
    }
    if (Object.keys(emailErrors).length > 0) {
      setOnboardEmailErrors(emailErrors);
      setOnboardLoading(false);
      return;
    }

    try {
      // 1. Create Restaurant
      const resRestaurant = await api.post('/restaurants', {
        name: onboardForm.name,
        slug: onboardForm.slug,
        ownerName: onboardForm.ownerName,
        ownerEmail: onboardForm.ownerEmail,
        phone: onboardForm.phone,
        address: onboardForm.address,
        logoUrl: onboardForm.logoUrl || undefined,
        maxTables: onboardForm.maxTables
      });

      const restaurantId = resRestaurant.data.id;

      // 2. Create Restaurant Admin User
      const resAdmin = await api.post(`/restaurants/${restaurantId}/admin`, {
        fullName: onboardForm.adminName,
        email: onboardForm.adminEmail,
      });

      const tempPass = resAdmin.data.temporaryPassword;

      // 3. Move to success step
      setTempCredentials({
        restaurantName: onboardForm.name,
        adminEmail: onboardForm.adminEmail,
        tempPass
      });

      setOnboardStep(2);
      fetchData(); // refresh in background

    } catch (err: any) {
      const msg = err.response?.data?.message || 'Onboarding failed. Please review your inputs.';
      setOnboardError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setOnboardLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const closeOnboardModal = () => {
    setIsOnboardingOpen(false);
    setOnboardStep(1);
    setTempCredentials(null);
    setOnboardForm({
      name: '',
      slug: '',
      ownerName: '',
      ownerEmail: '',
      phone: '',
      address: '',
      logoUrl: '',
      adminName: '',
      adminEmail: '',
      maxTables: 10
    });
    setOnboardError(null);
  };

  // ─── TABLE MANAGEMENT HANDLERS ──────────────────────────────────────────────

  const handleOpenManageTables = async (restaurant: DBRestaurant) => {
    setSelectedRestaurant(restaurant);
    setIsTablesModalOpen(true);
    setNewTableName('');
    setTablesError(null);
    setTablesSuccess(null);
    await fetchRestaurantTables(restaurant.id);
  };

  const fetchRestaurantTables = async (restaurantId: string) => {
    try {
      setTablesLoading(true);
      const res = await api.get(`/restaurants/${restaurantId}/tables`);
      setRestaurantTables(res.data || []);
    } catch (err: any) {
      setTablesError('Failed to load tables.');
    } finally {
      setTablesLoading(false);
    }
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !newTableName.trim()) return;

    setTablesError(null);
    setTablesSuccess(null);
    setIsAddingTable(true);

    try {
      await api.post(`/restaurants/${selectedRestaurant.id}/tables`, {
        name: newTableName.trim(),
      });
      setNewTableName('');
      setTablesSuccess('Table created successfully!');
      await fetchRestaurantTables(selectedRestaurant.id);
      fetchData(); // refresh count on main dashboard
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create table.';
      setTablesError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsAddingTable(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!selectedRestaurant) return;
    if (!window.confirm('Are you sure you want to delete this table? All associated order records will remain, but scanning this QR code will no longer work.')) return;

    setTablesError(null);
    setTablesSuccess(null);

    try {
      await api.delete(`/restaurants/tables/${tableId}`);
      setTablesSuccess('Table deleted successfully.');
      await fetchRestaurantTables(selectedRestaurant.id);
      fetchData(); // refresh count on main dashboard
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete table.';
      setTablesError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUploadTableQr = async (tableId: string, base64: string) => {
    if (!selectedRestaurant) return;
    setTablesError(null);
    setTablesSuccess(null);
    try {
      await api.patch(`/restaurants/tables/${tableId}`, { qrCodeUrl: base64 });
      setTablesSuccess('Custom QR code uploaded successfully!');
      await fetchRestaurantTables(selectedRestaurant.id);
    } catch (err: any) {
      setTablesError('Failed to upload custom QR code.');
    }
  };

  const handleRegenerateTableQr = async (tableId: string) => {
    if (!selectedRestaurant) return;
    setTablesError(null);
    setTablesSuccess(null);
    try {
      await api.patch(`/restaurants/tables/${tableId}`, { qrCodeUrl: null });
      setTablesSuccess('QR code regenerated!');
      await fetchRestaurantTables(selectedRestaurant.id);
    } catch (err: any) {
      setTablesError('Failed to regenerate QR code.');
    }
  };

  const handleBulkRegenerateQr = async () => {
    if (!selectedRestaurant) return;
    if (!window.confirm('Are you sure you want to regenerate all QR codes? This will remove all custom uploaded QRs.')) return;
    setTablesError(null);
    setTablesSuccess(null);
    try {
      await api.post(`/restaurants/${selectedRestaurant.id}/tables/regenerate-qr`, {});
      setTablesSuccess('All QR codes regenerated successfully!');
      await fetchRestaurantTables(selectedRestaurant.id);
    } catch (err: any) {
      setTablesError('Failed to bulk regenerate QR codes.');
    }
  };

  const handleBulkDownloadZip = async () => {
    if (!selectedRestaurant) return;
    setTablesError(null);
    setTablesSuccess(null);
    try {
      const settings = selectedRestaurant.restaurantSettings;
      const fgColor = settings?.qrFgColor || '#000000';
      const bgColor = settings?.qrBgColor || '#ffffff';
      const logoUrl = settings?.qrLogoUrl;

      const zip = new JSZip();
      const origin = window.location.origin;

      for (const table of restaurantTables) {
        let qrDataUrl = '';
        if (table.qrCodeUrl) {
          qrDataUrl = table.qrCodeUrl;
        } else {
          const tableUrl = `${origin}/r/${selectedRestaurant.slug}/table/${table.id}`;
          qrDataUrl = await generateQrDataUrl(tableUrl, fgColor, bgColor, logoUrl);
        }

        const base64Data = qrDataUrl.split(',')[1];
        zip.file(`${table.name.replace(/\s+/g, '_')}_qr.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRestaurant.slug}_table_qr_codes.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setTablesSuccess('ZIP downloaded successfully!');
    } catch (err: any) {
      setTablesError('Failed to generate ZIP archive.');
    }
  };

  const handleDownloadSingleQr = async (
    table: any,
    restaurantSlug: string,
    fgColor: string,
    bgColor: string,
    logoUrl?: string | null
  ) => {
    let qrDataUrl = '';
    if (table.qrCodeUrl) {
      qrDataUrl = table.qrCodeUrl;
    } else {
      const url = `${window.location.origin}/r/${restaurantSlug}/table/${table.id}`;
      qrDataUrl = await generateQrDataUrl(url, fgColor, bgColor, logoUrl);
    }
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${table.name.replace(/\s+/g, '_')}_qr.png`;
    a.click();
  };

  if (isLoading) {
    return <PageLoader message="Securing root console..." theme="admin" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans relative">

      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-slate-900 pb-5 mb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Super-Admin Control Panel
            <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
              ROOT MANAGEMENT
            </span>
            {isRefreshing && (
              <InlineLoader message="Syncing status..." className="ml-2" />
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global SaaS management console for platform operators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-primary/10 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" /> Onboard Restaurant
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-slate-400 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Global Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Orders Today', value: metrics.totalOrdersToday, icon: ShoppingBag, onClick: () => handleCardClick('orders', 'Orders Placed Today') },
          { label: 'Onboarded Restaurants', value: restaurants.length, icon: Layers, onClick: () => handleCardClick('restaurants', 'Onboarded Restaurant Names') },
          { label: 'Total Active Tables', value: metrics.activeTables, icon: Database, onClick: () => handleCardClick('tables', 'Active Tables per Restaurant') },
        ].map((m, idx) => {
          const CardContent = (
            <>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.label}</p>
                <h3 className="text-lg font-black text-white mt-1">{m.value}</h3>
              </div>
              <m.icon className="w-6 h-6 text-primary" />
            </>
          );

          if (m.onClick) {
            return (
              <button
                key={idx}
                onClick={m.onClick}
                className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-md hover:bg-slate-850 hover:border-slate-750 transition-all text-left w-full active:scale-[0.98] cursor-pointer"
              >
                {CardContent}
              </button>
            );
          }

          return (
            <div key={idx} className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-md">
              {CardContent}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Password Reset Popup Notification */}
        <AnimatePresence>
          {resetPassCredentials && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="lg:col-span-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password Reset Successful!
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  New credentials for <strong>{resetPassCredentials.adminName}</strong> ({resetPassCredentials.adminEmail}):
                </p>
                <div className="mt-2 flex items-center gap-2 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800 w-fit">
                  <span className="text-xs font-mono font-bold text-white selection:bg-indigo-500">
                    {resetPassCredentials.tempPass}
                  </span>
                  <button
                    onClick={() => copyToClipboard(resetPassCredentials.tempPass)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setResetPassCredentials(null)}
                className="text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/20"
              >
                Dismiss Notice
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tenant Configuration & Management (Left 2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-1">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Onboarded Merchants
            </h2>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
              {restaurants.length} Registered
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {restaurants.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No restaurants onboarded yet.</p>
              </div>
            ) : (
              restaurants.map((tenant) => {
                const admin = tenant.users?.[0]; // Default RESTAURANT_ADMIN user

                return (
                  <div
                    key={tenant.id}
                    className="bg-slate-950 border border-slate-850/60 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-800 transition-colors"
                  >
                    {/* Restaurant details */}
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white leading-tight">{tenant.name}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${tenant.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                          {tenant.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-1 font-sans">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>/{tenant.slug}</span>
                        </div>
                        {admin && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{admin.fullName} ({admin.email})</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{tenant._count?.tables || 0} Tables</span>
                        </div>
                      </div>
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => handleOpenEdit(tenant)}
                        className="flex items-center gap-1 border border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleOpenManageTables(tenant)}
                        className="flex items-center gap-1 border border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-400" /> Tables
                      </button>
                      {admin && (
                        <>
                          <button
                            onClick={() => handleOpenEditUser(admin.id, admin.fullName, admin.email)}
                            className="flex items-center gap-1 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                          >
                            <User className="w-3.5 h-3.5" /> Edit Admin
                          </button>
                          <button
                            onClick={() => handleResetPasswordClick(admin.id, admin.fullName, admin.email)}
                            className="flex items-center gap-1 border border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" /> Reset Pass
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                        className={`flex items-center gap-1 font-bold text-[10px] px-3 py-2 rounded-lg border transition-all ${tenant.isActive
                          ? 'border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-400'
                          : 'border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 text-green-400'
                          }`}
                      >
                        <Power className="w-3.5 h-3.5" /> {tenant.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Auditing Logs (Right Column) */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col">
          <h2 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" /> Root Audit Trail
          </h2>

          <div className="flex-1 flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-slate-500">No logs collected in this window.</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/60 border border-slate-900/60 rounded-xl text-[10px] text-slate-300 font-mono leading-relaxed"
                >
                  <div className="flex justify-between text-[8px] text-slate-500 font-bold mb-1">
                    <span>{log.action}</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300">{log.details}</p>
                  {log.user && (
                    <span className="text-[8px] text-slate-500 mt-1 block">
                      Actor: {log.user.fullName} ({log.user.role})
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Onboard Restaurant Modal Overlay */}
      <AnimatePresence>
        {isOnboardingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >

              {onboardStep === 1 ? (
                <>
                  <h3 className="text-lg font-black text-white mb-1">
                    Onboard New Merchant Restaurant
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Register a new storefront and generate temporary administrative access credentials.
                  </p>

                  {onboardError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{onboardError}</span>
                    </div>
                  )}

                  <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">

                    {/* Section 1: Store Properties */}
                    <div className="border-b border-slate-800 pb-3">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                        Store Identity
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Restaurant Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Tandoori Palace"
                            value={onboardForm.name}
                            onChange={e => setOnboardForm({ ...onboardForm, name: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">URL Slug (autogenerated)</label>
                          <input
                            type="text"
                            required
                            placeholder="tandoori-palace"
                            value={onboardForm.slug}
                            onChange={e => setOnboardForm({ ...onboardForm, slug: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Table Limit Allocation</label>
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="10"
                            value={onboardForm.maxTables}
                            onChange={e => setOnboardForm({ ...onboardForm, maxTables: parseInt(e.target.value) || 10 })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Business Phone</label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={onboardForm.phone}
                            onChange={e => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Logo Image URL (optional)</label>
                          <input
                            type="text"
                            placeholder="https://example.com/logo.png"
                            value={onboardForm.logoUrl}
                            onChange={e => setOnboardForm({ ...onboardForm, logoUrl: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 mt-3">
                        <label className="text-[10px] text-slate-300">Address Location</label>
                        <textarea
                          placeholder="DLF CyberHub, Gurugram"
                          rows={2}
                          value={onboardForm.address}
                          onChange={e => setOnboardForm({ ...onboardForm, address: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 resize-none"
                        />
                      </div>
                    </div>

                    {/* Section 2: Owner & Admin Details */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                        Owner & Admin Account
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Owner Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Vivek Sharma"
                            value={onboardForm.ownerName}
                            onChange={e => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Owner Contact Email</label>
                          <input
                            type="email"
                            required
                            placeholder="vivek@tandoori.com"
                            value={onboardForm.ownerEmail}
                            onChange={e => { setOnboardForm({ ...onboardForm, ownerEmail: e.target.value }); if (onboardEmailErrors.ownerEmail) setOnboardEmailErrors(prev => ({ ...prev, ownerEmail: undefined })); }}
                            className={`bg-slate-950 border rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 ${
                              onboardEmailErrors.ownerEmail ? 'border-red-500/60' : 'border-slate-800'
                            }`}
                          />
                          {onboardEmailErrors.ownerEmail && (
                            <p className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" /> {onboardEmailErrors.ownerEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Admin Account Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Administrator Account"
                            value={onboardForm.adminName}
                            onChange={e => setOnboardForm({ ...onboardForm, adminName: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-300">Admin Account Login Email</label>
                          <input
                            type="email"
                            required
                            placeholder="admin@tandoori.com"
                            value={onboardForm.adminEmail}
                            onChange={e => { setOnboardForm({ ...onboardForm, adminEmail: e.target.value }); if (onboardEmailErrors.adminEmail) setOnboardEmailErrors(prev => ({ ...prev, adminEmail: undefined })); }}
                            className={`bg-slate-950 border rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 ${
                              onboardEmailErrors.adminEmail ? 'border-red-500/60' : 'border-slate-800'
                            }`}
                          />
                          {onboardEmailErrors.adminEmail && (
                            <p className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" /> {onboardEmailErrors.adminEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form controls */}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={closeOnboardModal}
                        className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <ButtonLoader
                        type="submit"
                        loading={onboardLoading}
                        className="bg-primary hover:bg-primary/95 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95"
                      >
                        Complete Onboarding
                      </ButtonLoader>
                    </div>

                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-black text-white mb-1">
                    Onboarding Completed successfully!
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-6">
                    Merchant restaurant <strong>{tempCredentials?.restaurantName}</strong> is ready. Give these temporary credentials to the merchant administrator.
                  </p>

                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono text-left text-xs mb-6">
                    <div className="flex flex-col gap-1 border-b border-slate-900 pb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Login Email</span>
                      <span className="text-white select-all">{tempCredentials?.adminEmail}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Temporary Password</span>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
                        <span className="text-white font-bold selection:bg-primary">{tempCredentials?.tempPass}</span>
                        <button
                          onClick={() => copyToClipboard(tempCredentials?.tempPass || '')}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg text-left flex items-start gap-2 mb-6 max-w-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>This password will NOT be displayed again. Make sure to copy and save it securely before closing.</span>
                  </div>

                  <button
                    onClick={closeOnboardModal}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-primary/10"
                  >
                    Close Onboarding Wizard
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Restaurant Modal Overlay */}
      <AnimatePresence>
        {isEditingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <h3 className="text-lg font-black text-white mb-1">
                Edit Merchant Restaurant
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Modify storefront parameters and business owner details.
              </p>

              {editError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">

                {/* Section 1: Store Properties */}
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                    Store Identity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Restaurant Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Tandoori Palace"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">URL Slug</label>
                      <input
                        type="text"
                        required
                        placeholder="tandoori-palace"
                        value={editForm.slug}
                        onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Table Limit Allocation</label>
                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="10"
                        value={editForm.maxTables}
                        onChange={e => setEditForm({ ...editForm, maxTables: parseInt(e.target.value) || 10 })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Business Phone</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Logo Image URL</label>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={editForm.logoUrl}
                        onChange={e => setEditForm({ ...editForm, logoUrl: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-3">
                    <label className="text-[10px] text-slate-300">Address Location</label>
                    <textarea
                      placeholder="DLF CyberHub, Gurugram"
                      rows={2}
                      value={editForm.address}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>
                </div>

                {/* Section 2: Owner & Subscription Details */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                    Owner & Subscription
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Owner Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Vivek Sharma"
                        value={editForm.ownerName}
                        onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">Owner Contact Email</label>
                      <input
                        type="email"
                        required
                        placeholder="vivek@tandoori.com"
                        value={editForm.ownerEmail}
                        onChange={e => { setEditForm({ ...editForm, ownerEmail: e.target.value }); if (editOwnerEmailError) setEditOwnerEmailError(null); }}
                        className={`bg-slate-950 border rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 ${
                          editOwnerEmailError ? 'border-red-500/60' : 'border-slate-800'
                        }`}
                      />
                      {editOwnerEmailError && (
                        <p className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {editOwnerEmailError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-3">
                    <label className="text-[10px] text-slate-300">Subscription Status</label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={e => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Section 3: QR Code Styling Configuration (Super Admin Only) */}
                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                    QR Code Styling Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">QR Foreground Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editForm.qrFgColor}
                          onChange={e => setEditForm({ ...editForm, qrFgColor: e.target.value })}
                          className="bg-transparent border border-slate-800 rounded h-8 w-10 p-0.5 cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          value={editForm.qrFgColor}
                          onChange={e => setEditForm({ ...editForm, qrFgColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">QR Background Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editForm.qrBgColor}
                          onChange={e => setEditForm({ ...editForm, qrBgColor: e.target.value })}
                          className="bg-transparent border border-slate-800 rounded h-8 w-10 p-0.5 cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          value={editForm.qrBgColor}
                          onChange={e => setEditForm({ ...editForm, qrBgColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-300">QR Center Logo URL / Image</label>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={editForm.qrLogoUrl}
                        onChange={e => setEditForm({ ...editForm, qrLogoUrl: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-500 font-bold">Or upload logo image:</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setEditForm({ ...editForm, qrLogoUrl: event.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-[9px] text-slate-400 file:bg-slate-800 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form controls */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingOpen(false)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <ButtonLoader
                    type="submit"
                    loading={editLoading}
                    className="bg-primary hover:bg-primary/95 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95"
                  >
                    Save Changes
                  </ButtonLoader>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Admin User Modal Overlay */}
      <AnimatePresence>
        {isEditingUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <h3 className="text-lg font-black text-white mb-1">
                Edit Restaurant Admin Credentials
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Update login credentials and full name for the restaurant administrator account.
              </p>

              {editUserError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editUserError}</span>
                </div>
              )}

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg mb-4 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>WARNING</strong>: Modifying the login email will immediately update their username. The admin will need to use this new email to log in and their existing active sessions might be invalidated.</span>
              </div>

              <form onSubmit={handleEditUserSubmit} className="flex flex-col gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-300">Admin Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Administrator Account"
                    value={editUserForm.fullName}
                    onChange={e => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-300">Admin Login Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@restaurant.com"
                    value={editUserForm.email}
                    onChange={e => { setEditUserForm({ ...editUserForm, email: e.target.value }); if (editUserEmailError) setEditUserEmailError(null); }}
                    className={`bg-slate-950 border rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 ${
                      editUserEmailError ? 'border-red-500/60' : 'border-slate-800'
                    }`}
                  />
                  {editUserEmailError && (
                    <p className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {editUserEmailError}
                    </p>
                  )}
                </div>

                {/* Form controls */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingUserOpen(false)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <ButtonLoader
                    type="submit"
                    loading={editUserLoading}
                    className="bg-primary hover:bg-primary/95 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95"
                  >
                    Update Admin Account
                  </ButtonLoader>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Reset Password Confirmation Modal */}
      <AnimatePresence>
        {resetConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl shrink-0">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    Reset Admin Password?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    This action will override the current credentials.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl mb-5 text-xs text-slate-300 flex flex-col gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Admin Name</span>
                  <span className="font-bold text-white">{resetConfirmTarget.adminName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Login Email</span>
                  <span className="font-mono text-white">{resetConfirmTarget.adminEmail}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to proceed? A new temporary password will be generated, and you will need to copy and share it with the administrator manually. This reset event will be permanently recorded in the system audit logs.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetConfirmTarget(null)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeResetPassword}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-4 py-2 rounded-lg font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition-transform active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Yes, Reset Password</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Management Modal */}
      <AnimatePresence>
        {isTablesModalOpen && selectedRestaurant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-white leading-tight flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-400" /> Manage Dining Tables
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedRestaurant.name} (Limit: {restaurantTables.length} / {selectedRestaurant.maxTables || 10} tables)
                  </p>
                </div>
                <button
                  onClick={() => setIsTablesModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Success / Error Notification */}
              {tablesSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{tablesSuccess}</span>
                </div>
              )}
              {tablesError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tablesError}</span>
                </div>
              )}

              {/* Add Table Form */}
              <form onSubmit={handleAddTableSubmit} className="flex gap-2 mb-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 15 or T-15"
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50"
                  disabled={restaurantTables.length >= (selectedRestaurant.maxTables || 10)}
                />
                <ButtonLoader
                  type="submit"
                  loading={isAddingTable}
                  className="bg-primary hover:bg-primary/90 text-white text-xs px-4 py-2 rounded-lg font-black transition-colors"
                >
                  Add Table
                </ButtonLoader>
              </form>

              {restaurantTables.length >= (selectedRestaurant.maxTables || 10) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] rounded-lg mb-4">
                  Maximum table allocation limit ({selectedRestaurant.maxTables || 10}) reached for this restaurant. Contact database administrator to upgrade limit.
                </div>
              )}

              {/* Bulk Actions */}
              {restaurantTables.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-950 border border-slate-850 rounded-xl justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Bulk Operations</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => printBulkQrCodes(
                        restaurantTables,
                        selectedRestaurant.name,
                        selectedRestaurant.slug,
                        selectedRestaurant.restaurantSettings?.qrFgColor || '#000000',
                        selectedRestaurant.restaurantSettings?.qrBgColor || '#ffffff',
                        selectedRestaurant.restaurantSettings?.qrLogoUrl
                      )}
                      className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-1 px-2.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print All
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDownloadZip}
                      className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1 px-2.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download ZIP
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkRegenerateQr}
                      className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-1 px-2.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Regenerate All
                    </button>
                  </div>
                </div>
              )}

              {/* Table List */}
              <div className="max-h-[45vh] overflow-y-auto pr-1 border border-slate-800 bg-slate-950 rounded-xl p-3">
                {tablesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, idx) => (
                      <CardSkeleton key={idx} type="table" theme="dark" />
                    ))}
                  </div>
                ) : restaurantTables.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    No tables configured for this restaurant.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {restaurantTables.map((table: any) => (
                      <TableQrCard
                        key={table.id}
                        table={table}
                        restaurant={selectedRestaurant}
                        onDelete={handleDeleteTable}
                        onUpload={handleUploadTableQr}
                        onRegenerate={handleRegenerateTableQr}
                        onPrint={(t) => printBulkQrCodes([t], selectedRestaurant.name, selectedRestaurant.slug, selectedRestaurant.restaurantSettings?.qrFgColor || '#000000', selectedRestaurant.restaurantSettings?.qrBgColor || '#ffffff', selectedRestaurant.restaurantSettings?.qrLogoUrl)}
                        onDownload={(t) => handleDownloadSingleQr(t, selectedRestaurant.slug, selectedRestaurant.restaurantSettings?.qrFgColor || '#000000', selectedRestaurant.restaurantSettings?.qrBgColor || '#ffffff', selectedRestaurant.restaurantSettings?.qrLogoUrl)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTablesModalOpen(false)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal Overlay */}
      <AnimatePresence>
        {detailsModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-white">
                  {detailsModal.title}
                </h3>
                <button
                  onClick={() => setDetailsModal({ isOpen: false, type: null, title: '' })}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2 font-sans">
                {restaurants.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No data available.</p>
                ) : (
                  restaurants.map((r) => {
                    if (detailsModal.type === 'orders') {
                      const count = metrics.ordersByRestaurant.find(o => o.restaurantId === r.id)?.count || 0;
                      return (
                        <div key={r.id} className="flex justify-between items-center bg-slate-950 border border-slate-850/60 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-200">{r.name}</span>
                          <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                            {count} {count === 1 ? 'order' : 'orders'} today
                          </span>
                        </div>
                      );
                    }
                    if (detailsModal.type === 'restaurants') {
                      return (
                        <div key={r.id} className="bg-slate-950 border border-slate-850/60 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-200">{r.name}</span>
                        </div>
                      );
                    }
                    if (detailsModal.type === 'tables') {
                      const tables = r._count?.tables || 0;
                      return (
                        <div key={r.id} className="flex justify-between items-center bg-slate-950 border border-slate-850/60 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-200">{r.name}</span>
                          <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                            {tables} {tables === 1 ? 'table' : 'tables'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>

              <div className="flex justify-end mt-5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setDetailsModal({ isOpen: false, type: null, title: '' })}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs px-4 py-2 rounded-lg font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
