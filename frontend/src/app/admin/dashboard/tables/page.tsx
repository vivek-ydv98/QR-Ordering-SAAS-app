'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database,
  Search, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Check,
  ToggleLeft,
  ToggleRight,
  QrCode,
  Info,
  Printer,
  Download
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import api from '../../../../lib/api';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { CardSkeleton } from '../../../../components/LoadingComponents';

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
    alert('Please allow popups to print QR codes.');
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
          <div class="scan-instructions">Scan to Order</div>
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


function RestaurantTableCard({
  table,
  restaurantSlug,
  restaurantName,
  qrFgColor,
  qrBgColor,
  qrLogoUrl,
  onToggleActive,
  onOpenQrInfo,
  onDownload,
  onPrint,
}: {
  table: any;
  restaurantSlug: string;
  restaurantName: string;
  qrFgColor: string;
  qrBgColor: string;
  qrLogoUrl: string | null;
  onToggleActive: (table: any) => void;
  onOpenQrInfo: (table: any) => void;
  onDownload: (table: any) => void;
  onPrint: (table: any) => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table.qrCodeUrl) {
      setQrUrl(table.qrCodeUrl);
      return;
    }

    const generate = async () => {
      setLoading(true);
      try {
        const url = `${window.location.origin}/r/${restaurantSlug}/table/${table.id}`;
        const dataUrl = await generateQrDataUrl(url, qrFgColor, qrBgColor, qrLogoUrl);
        setQrUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate preview', err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [table.qrCodeUrl, table.id, restaurantSlug, qrFgColor, qrBgColor, qrLogoUrl]);

  return (
    <div 
      className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between gap-4 transition-all ${
        table.isActive 
          ? 'border-slate-800 hover:border-slate-700 shadow-md' 
          : 'border-slate-800 opacity-60 hover:opacity-80'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-white truncate">{table.name}</h4>
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-550 font-bold uppercase tracking-wider shrink-0 text-[8px]">Status:</span>
              <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                table.status === 'VACANT'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {table.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-550 font-bold uppercase tracking-wider shrink-0 text-[8px]">QR Type:</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                table.qrCodeUrl ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              }`}>
                {table.qrCodeUrl ? 'Custom' : 'System'}
              </span>
            </div>
          </div>
        </div>

        {/* QR Preview Thumb */}
        <div 
          onClick={() => onOpenQrInfo(table)}
          className="w-12 h-12 bg-white rounded p-0.5 border border-slate-800 flex items-center justify-center shrink-0 cursor-pointer hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all"
          title="Click to view QR scanner info"
        >
          {loading ? (
            <div className="w-full h-full bg-slate-800 animate-pulse rounded" />
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR Thumbnail" className="w-full h-full object-contain" />
          ) : (
            <QrCode className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* QR Actions for Restaurant Admin */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-850">
        <button
          onClick={() => onOpenQrInfo(table)}
          className="flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
          title="View QR Scan Info"
        >
          <Info className="w-3 h-3 text-blue-400" /> Info
        </button>
        <button
          onClick={() => onPrint(table)}
          className="flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
          title="Print QR Code"
        >
          <Printer className="w-3 h-3 text-indigo-400" /> Print
        </button>
        <button
          onClick={() => onDownload(table)}
          className="flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold border border-slate-800"
          title="Download QR Image"
        >
          <Download className="w-3 h-3 text-emerald-400" /> Save
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase">Activation Status</span>
        <button
          onClick={() => onToggleActive(table)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
            table.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
          }`}
        >
          {table.isActive ? (
            <>
              <Eye className="w-3.5 h-3.5" /> Active
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" /> Inactive
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function FullQrPreview({
  table,
  restaurantSlug,
  qrFgColor,
  qrBgColor,
  qrLogoUrl,
}: {
  table: any;
  restaurantSlug: string;
  qrFgColor: string;
  qrBgColor: string;
  qrLogoUrl: string | null;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table.qrCodeUrl) {
      setQrUrl(table.qrCodeUrl);
      return;
    }

    const generate = async () => {
      setLoading(true);
      try {
        const url = `${window.location.origin}/r/${restaurantSlug}/table/${table.id}`;
        const dataUrl = await generateQrDataUrl(url, qrFgColor, qrBgColor, qrLogoUrl);
        setQrUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate full preview', err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [table.qrCodeUrl, table.id, restaurantSlug, qrFgColor, qrBgColor, qrLogoUrl]);

  if (loading) {
    return (
      <div className="w-48 h-48 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold text-[10px] gap-2 animate-pulse">
        <QrCode className="w-8 h-8 text-primary/40" />
        <span>Generating QR...</span>
      </div>
    );
  }

  return (
    <div className="w-48 h-48 bg-white rounded-xl border border-slate-850 p-2 flex items-center justify-center shadow-lg shadow-black/40">
      {qrUrl ? (
        <img src={qrUrl} alt={`${table.name} QR Code`} className="w-full h-full object-contain" />
      ) : (
        <QrCode className="w-10 h-10 text-slate-400" />
      )}
    </div>
  );
}

export default function TablesPage() {
  const { tenantId } = useDashboard();

  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [qrFgColor, setQrFgColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrLogoUrl, setQrLogoUrl] = useState<string | null>(null);
  
  // QR modal state
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTables, resRestaurant] = await Promise.all([
        api.get(`/restaurants/${tenantId}/tables`),
        api.get(`/restaurants/by-id/${tenantId}`)
      ]);
      setTables(resTables.data || []);
      setRestaurantName(resRestaurant.data?.name || '');
      setRestaurantSlug(resRestaurant.data?.slug || '');
      const settings = resRestaurant.data?.restaurantSettings || {};
      setQrFgColor(settings.qrFgColor || '#000000');
      setQrBgColor(settings.qrBgColor || '#ffffff');
      setQrLogoUrl(settings.qrLogoUrl || null);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching table data:', err);
      setError('Failed to load table configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownloadZip = async () => {
    try {
      const zip = new JSZip();
      const origin = window.location.origin;

      for (const table of tables) {
        let qrDataUrl = '';
        if (table.qrCodeUrl) {
          qrDataUrl = table.qrCodeUrl;
        } else {
          const tableUrl = `${origin}/r/${restaurantSlug}/table/${table.id}`;
          qrDataUrl = await generateQrDataUrl(tableUrl, qrFgColor, qrBgColor, qrLogoUrl);
        }

        const base64Data = qrDataUrl.split(',')[1];
        zip.file(`${table.name.replace(/\s+/g, '_')}_qr.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${restaurantSlug}_table_qr_codes.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('ZIP downloaded successfully!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to generate ZIP archive.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDownloadSingleQr = async (table: any) => {
    try {
      let qrDataUrl = '';
      if (table.qrCodeUrl) {
        qrDataUrl = table.qrCodeUrl;
      } else {
        const url = `${window.location.origin}/r/${restaurantSlug}/table/${table.id}`;
        qrDataUrl = await generateQrDataUrl(url, qrFgColor, qrBgColor, qrLogoUrl);
      }
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `${table.name.replace(/\s+/g, '_')}_qr.png`;
      a.click();
      setSuccess(`QR Code downloaded for ${table.name}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to download QR code.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleActive = async (table: any) => {
    try {
      const updatedStatus = !table.isActive;
      // Optimistic update
      setTables(prev =>
        prev.map(t => t.id === table.id ? { ...t, isActive: updatedStatus } : t)
      );

      await api.patch(`/restaurants/tables/${table.id}`, {
        isActive: updatedStatus
      });
      
      setSuccess(`Table "${table.name}" status set to ${updatedStatus ? 'Active' : 'Inactive'}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error toggling table status:', err);
      setError(err.response?.data?.message || 'Failed to update table activation status.');
      // Rollback
      setTables(prev =>
        prev.map(t => t.id === table.id ? { ...t, isActive: table.isActive } : t)
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = tables.filter(t => t.isActive).length;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen font-sans">
      
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Table Management
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Store Layout
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor allocated tables and toggle active status for QR ordering.
          </p>
        </div>
        {/* Live Active Stat — compact header pill */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 shrink-0 self-start sm:self-auto">
          <Database className="w-5 h-5 text-primary opacity-80" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-none">Live Active</span>
            <span className="text-xl font-black text-white leading-tight">{activeCount} <span className="text-xs text-slate-500 font-normal">tables</span></span>
          </div>
        </div>
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


      {/* Search and Bulk Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
            type="text"
            placeholder="Search tables by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-100 placeholder-slate-500 w-full"
          />
        </div>

        {/* Bulk Operations for Restaurant Admins */}
        {tables.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-slate-900 border border-slate-850 rounded-xl items-center shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Bulk Actions</span>
            <button
              onClick={() => printBulkQrCodes(
                tables,
                restaurantName,
                restaurantSlug,
                qrFgColor,
                qrBgColor,
                qrLogoUrl
              )}
              className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> Print All
            </button>
            <button
              onClick={handleBulkDownloadZip}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download ZIP
            </button>
          </div>
        )}
      </div>

      {/* Tables List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, idx) => (
            <CardSkeleton key={idx} type="table" theme="dark" />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl text-slate-500">
          <Database className="w-10 h-10 mb-2 text-slate-600" />
          {searchTerm.trim() ? (
            <>
              <p className="text-sm font-bold text-slate-400">No tables match your search</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                No tables found for &quot;<span className="text-slate-300">{searchTerm}</span>&quot;. Try a different name or clear the search.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-400">No tables allocated yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                Ask the Super Admin to configure and add tables for your restaurant in the platform operator panel.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map(table => (
            <RestaurantTableCard
              key={table.id}
              table={table}
              restaurantSlug={restaurantSlug}
              restaurantName={restaurantName}
              qrFgColor={qrFgColor}
              qrBgColor={qrBgColor}
              qrLogoUrl={qrLogoUrl}
              onToggleActive={handleToggleActive}
              onOpenQrInfo={setQrModalTable}
              onDownload={handleDownloadSingleQr}
              onPrint={(t) => printBulkQrCodes([t], restaurantName, restaurantSlug, qrFgColor, qrBgColor, qrLogoUrl)}
            />
          ))}
        </div>
      )}

      {/* QR Code Detail Modal */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-white">Table Scanner Info</h3>
                <p className="text-[10px] text-slate-500">{qrModalTable.name}</p>
              </div>
              <button 
                onClick={() => setQrModalTable(null)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center bg-slate-950 border border-slate-850 rounded-xl p-6 gap-3">
              <FullQrPreview
                table={qrModalTable}
                restaurantSlug={restaurantSlug}
                qrFgColor={qrFgColor}
                qrBgColor={qrBgColor}
                qrLogoUrl={qrLogoUrl}
              />
              <div className="text-center w-full mt-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Live Ordering URL Target</span>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/r/${restaurantSlug}/table/${qrModalTable.id}` : ''}
                  className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-[9px] text-slate-300 rounded mt-1.5 text-center truncate focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => setQrModalTable(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg transition-all"
            >
              Close Info Card
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
