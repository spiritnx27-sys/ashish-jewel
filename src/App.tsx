/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Plus,
  Calculator,
  RotateCcw,
  Trash2,
  Sparkles,
  Info,
  Coins,
  FileSpreadsheet,
  Download,
  Upload,
  CoinsIcon,
  HelpCircle,
  FileText,
  Printer,
  Image as ImageIcon,
  Phone,
  Building,
  Briefcase,
  IndianRupee,
  Menu,
  Edit2,
  Save,
  FolderOpen,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { LedgerRow, GrandTotals } from './types';

// Preset Logo SVGs for the Jeweller's Gallery Selector
export interface LogoPreset {
  id: string;
  name: string;
  color: string;
  bg: string;
  svg: React.ReactNode;
}

const LOGO_PRESETS: LogoPreset[] = [
  {
    id: 'crown',
    name: 'Imperial Crown (Gold)',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    svg: (
      <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 19h20v2H2v-2zm1-2h18L19.5 7l-3.5 4.5L12 3 8 11.5 4.5 7 3 17z" />
      </svg>
    )
  },
  {
    id: 'diamond',
    name: 'Royal Diamond Spark',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    svg: (
      <svg className="w-8 h-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.54L18.46 12 12 18.46 5.54 12 12 5.54z" />
      </svg>
    )
  },
  {
    id: 'ring',
    name: 'Heritage Golden Ring',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    svg: (
      <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="14" r="6" />
        <path d="M12 3l2.5 3h-5z" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'classic',
    name: 'Karat Flower Motif',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    svg: (
      <svg className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.83-1.22 3.5-3 3.87V15h2a3 3 0 0 1 3 3v2H6v-2a3 3 0 0 1 3-3h2v-5.13c-1.78-.37-3-2.04-3-3.87a4 4 0 0 1 4-4z" />
      </svg>
    )
  }
];

// Standard select options
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const BLANK_ROW = (id: string): LedgerRow => ({
  id,
  day1: '',
  month1: '',
  year1: '',
  weight1: '',
  percent1: '',
  day2: '',
  month2: '',
  year2: '',
  weight2: '',
  percent2: '',
  manualMoney: ''
});

// Converts unsupported modern oklch colors into safe hex/rgb strings using browser canvas
function oklchToRgb(colorStr: string): string {
  if (!colorStr || !colorStr.includes('oklch')) return colorStr;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = colorStr;
      const resolved = ctx.fillStyle;
      if (resolved && resolved !== '#000000' && resolved !== 'rgba(0,0,0,0)') {
        return resolved;
      }
    }
  } catch (e) {
    // fine fallback
  }
  return 'rgb(16, 124, 65)'; // Fallback to safe Ashish Jewellers primary green pigment
}

export default function App() {
  const [rows, setRows] = useState<LedgerRow[]>(() => [BLANK_ROW('row-1'), BLANK_ROW('row-2'), BLANK_ROW('row-3')]);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(true);
  
  // Custom states for Ashish Jewellers Branding
  const [selectedLogoId, setSelectedLogoId] = useState<string>(() => {
    return localStorage.getItem('ashish_selected_logo_id') || 'crown';
  });
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(() => {
    return localStorage.getItem('ashish_custom_logo_base64') || null;
  });
  const [showLogoPicker, setShowLogoPicker] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  // Saved sheets list, active sheet states
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [currentSheetName, setCurrentSheetName] = useState<string>("New Gold Ledger");
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const [showSheetsDropdown, setShowSheetsDropdown] = useState<boolean>(false);
  const [savingSheet, setSavingSheet] = useState<boolean>(false);
  const [loadingSheets, setLoadingSheets] = useState<boolean>(false);
  const [editingSheetName, setEditingSheetName] = useState<boolean>(false);
  const [isSavedNotification, setIsSavedNotification] = useState<boolean>(false);

  // Install / PWA Installation Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [showInstallInfo, setShowInstallInfo] = useState<boolean>(false);

  // Fetch all sheets metadata
  const fetchSavedSheets = async () => {
    setLoadingSheets(true);
    try {
      const res = await fetch("/api/sheets");
      if (res.ok) {
        const data = await res.json();
        setSavedSheets(data || []);
      }
    } catch (err) {
      console.error("Failed to load sheets list:", err);
    } finally {
      setLoadingSheets(false);
    }
  };

  // Load sheets list and listen to PWA install prompt on initial mount
  React.useEffect(() => {
    fetchSavedSheets();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User installation decision: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      setShowInstallInfo(true);
    }
  };

  // Save / Auto-save the current gold ledger
  const handleSaveSheet = async () => {
    setSavingSheet(true);
    try {
      const body = {
        id: currentSheetId,
        name: currentSheetName,
        rows,
        selectedLogoId,
        uploadedLogo,
        totals
      };
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrentSheetId(saved.id);
        setCurrentSheetName(saved.name);
        await fetchSavedSheets();
        setIsSavedNotification(true);
        setTimeout(() => setIsSavedNotification(false), 2500);
      } else {
        const errData = await res.json();
        alert("Could not save sheet: " + (errData.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Network failure during sheet save: " + err.message);
    } finally {
      setSavingSheet(false);
    }
  };

  // Load a single sheet's ledger rows and state
  const handleLoadSheet = async (id: string) => {
    try {
      const res = await fetch(`/api/sheets/${id}`);
      if (res.ok) {
        const sheet = await res.json();
        setCurrentSheetId(sheet.id);
        setCurrentSheetName(sheet.name);
        setRows(sheet.rows || [BLANK_ROW("row-1"), BLANK_ROW("row-2"), BLANK_ROW("row-3")]);
        if (sheet.selectedLogoId) {
          setSelectedLogoId(sheet.selectedLogoId);
          localStorage.setItem("ashish_selected_logo_id", sheet.selectedLogoId);
        }
        if (sheet.uploadedLogo) {
          setUploadedLogo(sheet.uploadedLogo);
          localStorage.setItem("ashish_custom_logo_base64", sheet.uploadedLogo);
        } else {
          setUploadedLogo(null);
          localStorage.removeItem("ashish_custom_logo_base64");
        }
        if (sheet.totals) {
          setTotals({ ...sheet.totals, calculated: true, loading: false });
        } else {
          setTotals({
            calculated: false,
            loading: false,
            totalWeight1: 0,
            totalOutput1: 0,
            totalWeight2: 0,
            totalOutput2: 0,
            totalManualMoney: 0
          });
        }
        setShowSheetsDropdown(false);
      }
    } catch (err) {
      console.error("Failed to load sheet detail:", err);
    }
  };

  // Delete a saved sheet by identifier
  const handleDeleteSavedSheet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this sheet permanently?")) return;
    try {
      const res = await fetch(`/api/sheets/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (currentSheetId === id) {
          setCurrentSheetId(null);
          setCurrentSheetName("New Gold Ledger");
          resetLedgerToBlank();
        }
        await fetchSavedSheets();
      }
    } catch (err) {
      console.error("Failed to delete sheet:", err);
    }
  };

  // Create a fresh new blank sheet
  const handleAddNewSheet = () => {
    setCurrentSheetId(null);
    setCurrentSheetName("New Gold Ledger");
    resetLedgerToBlank();
    setShowSheetsDropdown(false);
  };

  const [exportingPDF, setExportingPDF] = useState<boolean>(false);

  const handleDownloadPDF = async () => {
    setExportingPDF(true);
    let autoClose = false;
    
    // Save original references to restore securely in finally block
    const originalGetComputedStyle = window.getComputedStyle;
    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalContents = styleElements.map(el => el.innerHTML);

    try {
      // 1. Double fortification: Override getComputedStyle to bypass OKLCH resolution crash in html2canvas
      window.getComputedStyle = function (elt, pseudoElt) {
        const styles = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(styles, {
          get(target, prop, receiver) {
            const val = Reflect.get(target, prop, receiver);
            if (typeof val === 'string' && val.includes('oklch')) {
              return oklchToRgb(val);
            }
            if (typeof val === 'function') {
              if (prop === 'getPropertyValue') {
                return function (key: string) {
                  const rawVal = target.getPropertyValue(key);
                  if (typeof rawVal === 'string' && rawVal.includes('oklch')) {
                    return oklchToRgb(rawVal);
                  }
                  return rawVal;
                };
              }
              return val.bind(target);
            }
            return val;
          }
        }) as any;
      };

      // 2. Temporarily clean styles containing oklch
      styleElements.forEach((styleEl) => {
        if (styleEl.innerHTML.includes('oklch')) {
          styleEl.innerHTML = styleEl.innerHTML.replace(/oklch\([^)]+\)/g, (match) => {
            return oklchToRgb(match);
          });
        }
      });

      // If modal is not open, open it temporarily
      if (!showInvoiceModal) {
        setShowInvoiceModal(true);
        autoClose = true;
        // Wait for rendering & animation transition to complete
        await new Promise(resolve => setTimeout(resolve, 450));
      }

      const element = document.getElementById("invoice-print-area");
      if (!element) {
        throw new Error("Receipt template container not found in DOM.");
      }

      const canvas = await html2canvas(element, {
        scale: 2.2, // Enhance text sharpness and logo print crispness
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const sanitizedName = currentSheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`Ashish_Jewellers_${sanitizedName}_${new Date().getTime().toString().substring(7)}.pdf`);
    } catch (err: any) {
      console.error("PDF download error:", err);
      alert("Unable to generate PDF document: " + err.message);
    } finally {
      // 3. Unconditionally restore original CSS and getComputedStyle functions
      window.getComputedStyle = originalGetComputedStyle;
      styleElements.forEach((styleEl, index) => {
        if (originalContents[index] !== undefined) {
          styleEl.innerHTML = originalContents[index];
        }
      });

      if (autoClose) {
        setShowInvoiceModal(false);
      }
      setExportingPDF(false);
    }
  };

  // Dynamic totals state
  const [totals, setTotals] = useState<GrandTotals & { loading: boolean }>({
    calculated: false,
    loading: false,
    totalWeight1: 0,
    totalOutput1: 0,
    totalWeight2: 0,
    totalOutput2: 0,
    totalManualMoney: 0
  });

  // Save branding properties in local storage
  const handleLogoChange = (presetId: string) => {
    setSelectedLogoId(presetId);
    setUploadedLogo(null);
    localStorage.setItem('ashish_selected_logo_id', presetId);
    localStorage.removeItem('ashish_custom_logo_base64');
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedLogo(base64String);
        setSelectedLogoId('custom');
        localStorage.setItem('ashish_custom_logo_base64', base64String);
        localStorage.setItem('ashish_selected_logo_id', 'custom');
      };
      reader.readAsDataURL(file);
    }
  };

  // Formatter for weight
  const formatWeight = (val: number): string => {
    return val.toFixed(2) + ' g';
  };

  // Formatter for Indian Rupees (₹) specifically requested for Col 7
  const formatINR = (amt: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amt);
  };

  // Real-time calculated results for presentation inside rows (Pure Weight)
  const getRowOutput1 = (row: LedgerRow): number => {
    const w = parseFloat(row.weight1);
    const p = parseFloat(row.percent1);
    if (isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return 0;
    return w * (p / 100);
  };

  const getRowOutput2 = (row: LedgerRow): number => {
    const w = parseFloat(row.weight2);
    const p = parseFloat(row.percent2);
    if (isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return 0;
    return w * (p / 100);
  };

  // Set individual cell values
  const handleInputChange = (rowIndex: number, field: keyof LedgerRow, value: string) => {
    const updated = [...rows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [field]: value
    };
    setRows(updated);

    // If an input is changed, invalidate previous grand calculation to preserve strict precision
    if (totals.calculated) {
      setTotals(prev => ({
        ...prev,
        calculated: false
      }));
    }
  };

  // Add Row
  const addNewRow = () => {
    const newId = `row-${Date.now()}`;
    setRows([...rows, BLANK_ROW(newId)]);
    if (totals.calculated) {
      setTotals(prev => ({ ...prev, calculated: false }));
    }
  };

  // Delete Row
  const deleteRow = (index: number) => {
    if (rows.length <= 1) {
      // Keep at least one blank row instead of full deletion
      setRows([BLANK_ROW(`row-${Date.now()}`)]);
    } else {
      setRows(rows.filter((_, i) => i !== index));
    }
    if (totals.calculated) {
      setTotals(prev => ({ ...prev, calculated: false }));
    }
  };

  // Reset entire ledger
  const resetLedgerToBlank = () => {
    setRows([BLANK_ROW(`row-1`), BLANK_ROW(`row-2`), BLANK_ROW(`row-3`)]);
    setTotals({
      calculated: false,
      loading: false,
      totalWeight1: 0,
      totalOutput1: 0,
      totalWeight2: 0,
      totalOutput2: 0,
      totalManualMoney: 0
    });
  };

  // Calculate totals asynchronously with a nice loading spinner overlay
  const calculateTotalSum = () => {
    setTotals(prev => ({ ...prev, loading: true, calculated: false }));

    // Simulate an async computational run of our spreadsheet logic (e.g. 900ms delay)
    setTimeout(() => {
      let sumWt1 = 0;
      let sumOut1 = 0;
      let sumWt2 = 0;
      let sumOut2 = 0;
      let sumManual = 0;

      rows.forEach(row => {
        const wt1 = parseFloat(row.weight1) || 0;
        const wt2 = parseFloat(row.weight2) || 0;
        const mm = parseFloat(row.manualMoney) || 0;

        sumWt1 += wt1;
        sumOut1 += getRowOutput1(row);
        sumWt2 += wt2;
        sumOut2 += getRowOutput2(row);
        sumManual += mm;
      });

      startTransition(() => {
        setTotals({
          calculated: true,
          loading: false,
          totalWeight1: sumWt1,
          totalOutput1: sumOut1,
          totalWeight2: sumWt2,
          totalOutput2: sumOut2,
          totalManualMoney: sumManual
        });
      });
    }, 950);
  };

  // CSV Exporter for spreadsheet audit
  const exportToCSV = () => {
    const titleRows = [
      '# BRAND REPORT',
      'Company Name,Ashish Jewellers',
      'Mobile Number,9819150997',
      'Export Date,' + new Date().toLocaleDateString('en-IN'),
      'Formula Scheme,Set 1 Fine Weight = Weight1 * (Percent1/100); Set 2 Fine Weight = Weight2 * (Percent2/100)',
      'Balance Sheet Formula,Balance Fine Weight = Set 1 Fine Weight - Set 2 Fine Weight',
      ''
    ];

    const headers = [
      'Row ID',
      'Date 1',
      'Weight 1 (g)',
      'Percent 1 (%)',
      'Fine Weight 1 (g)',
      'Date 2',
      'Weight 2 (g)',
      'Percent 2 (%)',
      'Fine Weight 2 (g)',
      'Manual Entry (INR ₹)'
    ];

    const lines = rows.map((r, idx) => {
      const date1 = `${r.day1 || ''}-${r.month1 || ''}-${r.year1 || ''}`;
      const date2 = `${r.day2 || ''}-${r.month2 || ''}-${r.year2 || ''}`;
      const out1 = getRowOutput1(r).toFixed(2);
      const out2 = getRowOutput2(r).toFixed(2);
      return [
        idx + 1,
        `"${date1}"`,
        r.weight1 || 0,
        r.percent1 || 0,
        out1,
        `"${date2}"`,
        r.weight2 || 0,
        r.percent2 || 0,
        out2,
        r.manualMoney || 0
      ].join(',');
    });

    const csvData = [
      ...titleRows,
      headers.join(','),
      ...lines
    ].join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Ashish_Jewellers_9819150997_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderActiveLogo = (sizeClass = "w-8 h-8") => {
    if (selectedLogoId === 'custom' && uploadedLogo) {
      return (
        <img
          src={uploadedLogo}
          alt="Ashish Jewellers Logo"
          className={`${sizeClass} rounded-md object-cover border border-amber-350 shadow-sm`}
          referrerPolicy="no-referrer"
        />
      );
    }
    const preset = LOGO_PRESETS.find(p => p.id === selectedLogoId) || LOGO_PRESETS[0];
    // Create cloned element with correct size class
    return (
      <div className={`p-1.5 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center shrink-0`}>
        {preset.svg}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-sans" id="jewelry-ledger-root">
      
      {/* Floating autosave status alert */}
      <AnimatePresence>
        {isSavedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-24 right-4 bg-emerald-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xl z-50 flex items-center space-x-2 border border-emerald-500"
            id="autosave-floating-alert"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            <span>Sheet Saved Automatically & Secured in Database!</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Excel styled green navigation banner with Ashish Jewellers Branding */}
      <header className="bg-[#107c41] text-white shadow-md relative z-30" id="ledger-header">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Main Jewellers Brand Identity & Logo customization */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group cursor-pointer" onClick={() => setShowLogoPicker(!showLogoPicker)} title="Click to custom style or upload logo">
              {renderActiveLogo("w-11 h-11")}
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-900 border border-white text-[8px] font-bold px-1 rounded-full scale-90 group-hover:scale-105 transition">
                LOGO
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5" id="ledger-title-main">
                  Ashish Jewellers
                </h1>
                <span className="bg-amber-400 text-emerald-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Gold Ledger
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-green-100 font-medium" id="ledger-subtitle-info">
                <Phone className="h-3 w-3 text-amber-300" />
                <span className="font-mono text-amber-300 font-bold bg-green-900/30 px-1.5 py-0.5 rounded">9819150997</span>
                <span className="text-green-300">•</span>
                <button 
                  onClick={() => setShowLogoPicker(!showLogoPicker)}
                  className="hover:underline text-amber-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>Choose Gallery Logo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preset Logos Dropdown Picker Bubble */}
          <AnimatePresence>
            {showLogoPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-4 top-16 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-4 w-72 z-50 text-xs"
                id="logo-gallery-picker-dropdown"
              >
                <div className="flex justify-between items-center mb-2.5 border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Branded Logo Gallery
                  </span>
                  <button 
                    onClick={() => setShowLogoPicker(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                {/* Preset motifs */}
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Select Preset Theme Emblem</span>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        handleLogoChange(preset.id);
                        setShowLogoPicker(false);
                      }}
                      className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition duration-150 ${
                        selectedLogoId === preset.id 
                          ? 'border-amber-500 bg-amber-50/60 font-medium' 
                          : 'border-slate-100 hover:bg-slate-50'
                      } cursor-pointer`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded shrink-0">
                        {preset.svg}
                      </div>
                      <span className="text-[10px] truncate text-slate-700 leading-tight">{preset.name}</span>
                    </button>
                  ))}
                </div>

                {/* Upload from local device gallery option */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Or Choose custom from gallery</span>
                  <label className="flex flex-col items-center justify-center py-2 px-3 border border-dashed border-slate-300 rounded-lg hover:bg-amber-50/20 hover:border-amber-400 transition cursor-pointer text-center group">
                    <Upload className="h-4 w-4 text-slate-400 group-hover:text-amber-500 mb-1" />
                    <span className="text-[10px] text-slate-600 font-medium">Upload custom photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCustomLogoUpload}
                      className="hidden" 
                    />
                  </label>
                  {uploadedLogo && (
                    <div className="mt-2 flex items-center justify-between p-1 px-2 bg-slate-50 rounded text-[10px] text-slate-500">
                      <span className="truncate max-w-[150px]">✓ Custom logo active</span>
                      <button 
                        onClick={() => {
                          setUploadedLogo(null);
                          setSelectedLogoId('crown');
                          localStorage.removeItem('ashish_custom_logo_base64');
                        }}
                        className="text-rose-500 hover:underline font-bold"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Stats Toolbar */}
          <div className="flex items-center space-x-2 text-xs font-mono" id="ledger-quick-stats">
            <span className="bg-green-800/60 px-3 py-1.5 rounded-md border border-green-700">
              Active Rows: <strong className="text-white text-sm">{rows.length}</strong>
            </span>
            <span className={`px-3 py-1.5 rounded-md border text-xs transition-colors duration-150 ${totals.calculated ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-amber-950/60 text-amber-200 border-amber-800'}`}>
              Status: <strong>{totals.calculated ? 'COMPUTED' : 'UNSAVED' }</strong>
            </span>
          </div>

          {/* Preset & Database Operations Dropdown (3-Line Hamburger Menu) */}
          <div className="flex items-center space-x-3.5" id="toolbar-actions">
            
            {/* Active Sheet Name Indicator */}
            <div className="hidden lg:flex flex-col text-right font-sans mr-2">
              <span className="text-[9px] uppercase tracking-wider text-green-200">Active Document</span>
              <span className="text-[11px] font-bold text-amber-300 truncate max-w-[150px]">{currentSheetName}</span>
            </div>

            <button
              onClick={resetLedgerToBlank}
              className="bg-white/5 hover:bg-white/15 text-white/95 rounded px-3 py-1.5 text-xs font-medium flex items-center space-x-1.5 transition duration-150 border border-white/10 active:scale-95 cursor-pointer"
              title="Reset spreadsheet to blank entries"
              id="btn-reset-ledger"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear Sheet</span>
            </button>

            {/* Install App Button */}
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 inline-flex items-center space-x-1 border border-emerald-600 hover:border-emerald-500 bg-emerald-950/40 text-green-300 hover:text-white rounded text-xs font-bold transition duration-150 active:scale-95 cursor-pointer shadow-sm"
              title="Install Gold Ledger as an app for easy offline desktop/mobile access"
              id="btn-install-app"
            >
              <Download className="h-3.5 w-3.5 animate-bounce shrink-0" style={{ animationDuration: '3s' }} />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* The 3-Line Hamburger Menu on the right hand corner */}
            <div className="relative" id="sheets-hamburger-menu-container">
              <button
                onClick={() => setShowSheetsDropdown(!showSheetsDropdown)}
                className="px-3.5 py-1.5 inline-flex items-center space-x-1.5 text-xs font-bold rounded-lg bg-emerald-800/80 hover:bg-emerald-950/80 border border-emerald-600 hover:border-emerald-500 text-amber-300 transition active:scale-95 cursor-pointer shadow-sm"
                title="Saved Sheets & Database Operations Menu"
                id="btn-sheets-menu"
              >
                <Menu className="h-4 w-4" />
                <span>Saved Sheets</span>
              </button>

              <AnimatePresence>
                {showSheetsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-4 w-85 z-50 text-xs"
                    id="sheets-list-dropdown"
                  >
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                        Saved Gold Sheets
                      </span>
                      <button
                        onClick={() => setShowSheetsDropdown(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                      >
                        ×
                      </button>
                    </div>

                    {/* Active Sheet Section */}
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg mb-4">
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Rename Active Sheet</span>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={currentSheetName}
                          onChange={(e) => setCurrentSheetName(e.target.value)}
                          className="flex-grow font-sans font-semibold text-slate-800 bg-white border border-slate-250 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="e.g. June Gold Ornaments"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2.5">
                        {/* Save Button */}
                        <button
                          onClick={handleSaveSheet}
                          disabled={savingSheet}
                          className="inline-flex items-center justify-center space-x-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md transition duration-150 cursor-pointer disabled:opacity-50 text-[10px] uppercase"
                        >
                          {savingSheet ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          <span>Save Sheet</span>
                        </button>

                        {/* New Sheet Button */}
                        <button
                          onClick={handleAddNewSheet}
                          className="inline-flex items-center justify-center space-x-1.5 p-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-md transition duration-150 cursor-pointer text-[10px] uppercase"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>New Blank</span>
                        </button>
                      </div>
                    </div>

                    {/* Saved Sheets List */}
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Saved Databases on Cloud</span>
                      
                      {loadingSheets ? (
                        <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                          <span>Fetching index...</span>
                        </div>
                      ) : savedSheets.length === 0 ? (
                        <div className="py-5 text-center text-slate-400 text-xs italic bg-slate-50 rounded border border-dashed border-slate-200">
                          No sheets saved on backend yet.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                          {savedSheets.map((s) => {
                            const isActive = currentSheetId === s.id;
                            const savedDate = new Date(s.updatedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            });

                            return (
                              <div
                                key={s.id}
                                onClick={() => handleLoadSheet(s.id)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-left transition duration-150 group cursor-pointer ${
                                  isActive
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'border-slate-100 hover:bg-slate-50'
                                }`}
                              >
                                <div className="truncate flex-grow mr-2">
                                  <span className="block truncate text-[11px] leading-tight text-slate-800 font-semibold">{s.name}</span>
                                  <span className="block text-[9px] text-slate-400 font-medium font-mono leading-none mt-0.5">{savedDate} • {s.rowCount} rows</span>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteSavedSheet(s.id, e)}
                                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition duration-150 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Delete Sheet Permanently"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-grow flex flex-col space-y-6" id="dashboard-layout">
        
        {/* Dynamic Formula Panel */}
        <AnimatePresence>
          {showFormulaInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#eefcf3] border-l-4 border-[#107c41] text-emerald-900 rounded-r-lg p-4 shadow-sm relative overflow-hidden"
              id="formula-banner"
            >
              <button
                onClick={() => setShowFormulaInfo(false)}
                className="absolute top-2 right-2 text-emerald-700 hover:text-emerald-950 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 cursor-pointer"
                id="btn-close-formula-banner"
              >
                ×
              </button>
              <div className="flex items-start space-x-3 pr-6" id="formula-detail-grid">
                <Info className="h-5 w-5 text-[#107c41] mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-emerald-950 text-sm">Automated Fine Weight Output Engine</h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Cells in <strong>Calculated Output 1 (C)</strong> and <strong>Calculated Output 2 (F)</strong> evaluate in real-time as you type weights and percentages.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono bg-white/60 inline-block px-3 py-1.5 rounded border border-emerald-200">
                    <div>
                      <strong className="text-emerald-950">Formula Schema:</strong> (Weight × (Percent / 100))
                    </div>
                    <div className="text-emerald-700 hidden md:block">
                      | &nbsp; Exact fine weight of gold in grams
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Excel Matrix Table Wrapper */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col" id="ledger-grid-card">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500" id="matrix-toolbar">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-[#eefcf3] border border-emerald-200 rounded"></span>
                <span>Real-Time Formula Active</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-[#107c41]/10 border border-[#107c41]/40 rounded"></span>
                <span>Active Focused Coordinate Indicator</span>
              </span>
            </div>
            {focusedCell ? (
              <span className="bg-[#107c41]/10 text-[#107c41] font-bold px-2 py-0.5 rounded border border-[#107c41]/20">
                Cell: Column {focusedCell.colName}, Row {focusedCell.rowIndex + 1}
              </span>
            ) : (
              <span className="text-slate-400">Select any cell to see Excel alignment</span>
            )}
          </div>

          <div className="overflow-x-auto" id="spreadsheet-scroller">
            <table className="w-full border-collapse text-left min-w-[1200px]" id="ledger-table-grid">
              <thead>
                {/* Excel letters headers row (A-G) */}
                <tr className="bg-slate-100 text-xs text-slate-500 border-b border-slate-200">
                  <th className="w-12 text-center select-none font-mono py-1.5 border-r border-slate-200">#</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'A' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>A</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'B' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>B</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'C' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>C</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'D' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>D</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'E' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>E</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'F' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>F</th>
                  <th className={`px-4 py-1.5 tracking-wider border-r border-slate-200 text-center font-mono transition-colors duration-150 ${focusedCell?.colName === 'G' ? 'bg-[#107c41]/20 text-[#107c41] font-semibold' : ''}`}>G</th>
                  <th className="w-12 py-1.5 text-center">Actions</th>
                </tr>

                {/* Practical Descriptive Column Names */}
                <tr className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-tight divide-x divide-slate-200 border-b border-rose-100">
                  {/* Spacer indicator */}
                  <th className="py-3 px-2 text-center bg-slate-100 text-slate-500 border-r border-slate-300">Ctrl</th>
                  
                  {/* Column 1: Date Set 1 */}
                  <th className="px-3 py-3 w-[18%]">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold">Col 1: Primary Date</span>
                      <span className="text-[10px] text-slate-500 font-normal normal-case">Transaction Set 1</span>
                    </div>
                  </th>

                  {/* Column 2: Weight + Percent Set 1 */}
                  <th className="px-3 py-3 w-[15%]">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold">Col 2: Set 1 Inputs</span>
                      <span className="text-[10px] text-slate-500 font-normal normal-case">Weight (g) & percent (%)</span>
                    </div>
                  </th>

                  {/* Column 3: Realtime formula valuation result 1 */}
                  <th className="px-3 py-3 w-[15%] bg-[#f4faf6] text-emerald-950 font-bold">
                    <div className="flex flex-col">
                      <span className="text-[#107c41] font-extrabold flex items-center space-x-1">
                        <span>Col 3: Fine Weight 1 </span>
                      </span>
                      <span className="text-[10px] text-[#2c774d] font-normal normal-case font-mono italic">Realtime (wt × %)</span>
                    </div>
                  </th>

                  {/* Column 4: Date Set 2 */}
                  <th className="px-3 py-3 w-[18%]">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold">Col 4: Secondary Date</span>
                      <span className="text-[10px] text-slate-500 font-normal normal-case">Transaction Set 2</span>
                    </div>
                  </th>

                  {/* Column 5: Weight + Percent Set 2 */}
                  <th className="px-3 py-3 w-[15%]">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold">Col 5: Set 2 Inputs</span>
                      <span className="text-[10px] text-slate-500 font-normal normal-case">Weight (g) & percent (%)</span>
                    </div>
                  </th>

                  {/* Column 6: Realtime formula valuation result 2 */}
                  <th className="px-3 py-3 w-[15%] bg-[#f4faf6] text-emerald-950 font-bold">
                    <div className="flex flex-col">
                      <span className="text-[#107c41] font-extrabold flex items-center space-x-1">
                        <span>Col 6: Fine Weight 2 </span>
                      </span>
                      <span className="text-[10px] text-[#2c774d] font-normal normal-case font-mono italic">Realtime (wt × %)</span>
                    </div>
                  </th>

                  {/* Column 7: Manual rate/money sum input in Rupees */}
                  <th className="px-3 py-3 w-[14%] bg-[#fcf9f2]">
                    <div className="flex flex-col">
                      <span className="text-amber-900 font-bold">Col 7: Manual Sum</span>
                      <span className="text-[10px] text-amber-700 font-normal normal-case">Enter amount manually (₹)</span>
                    </div>
                  </th>

                  {/* Row Delete handle column */}
                  <th className="py-3 px-2 text-center bg-slate-50 text-slate-500">Del</th>
                </tr>
              </thead>

              {/* Rows List */}
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row, idx) => {
                  const out1 = getRowOutput1(row);
                  const out2 = getRowOutput2(row);
                  
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        focusedCell?.rowIndex === idx ? 'bg-[#107c41]/5' : ''
                      }`}
                      id={`ledger-row-tr-${idx}`}
                    >
                      {/* Left Side Index indicator */}
                      <td 
                        className={`text-center font-mono text-xs select-none border-r border-slate-200 py-3 font-semibold transition-all ${
                          focusedCell?.rowIndex === idx ? 'bg-[#107c41] text-white' : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </td>

                      {/* Column 1: Date Set 1 (Dropdown selection group Day, Month, Year) */}
                      <td className="p-1 border-r border-slate-100 w-[18%]" id={`col-1-date1-${idx}`}>
                        <div className="flex space-x-1">
                          {/* Day dropdown */}
                          <select
                            value={row.day1}
                            onChange={(e) => handleInputChange(idx, 'day1', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'A' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`day1-select-${idx}`}
                          >
                            <option value="">DD</option>
                            {DAYS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>

                          {/* Month dropdown */}
                          <select
                            value={row.month1}
                            onChange={(e) => handleInputChange(idx, 'month1', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'A' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`month1-select-${idx}`}
                          >
                            <option value="">Mon</option>
                            {MONTHS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>

                          {/* Year dropdown */}
                          <select
                            value={row.year1}
                            onChange={(e) => handleInputChange(idx, 'year1', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'A' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`year1-select-${idx}`}
                          >
                            <option value="">YYYY</option>
                            {YEARS.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Column 2: Inputs Set 1 (Weight and Percent inputs) */}
                      <td className="p-1 border-r border-slate-100" id={`col-2-inputs1-${idx}`}>
                        <div className="flex space-x-1 relative">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Wt (g)"
                              value={row.weight1}
                              onChange={(e) => {
                                // Strip invalid characters, allow typing dots and empty
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleInputChange(idx, 'weight1', val);
                              }}
                              onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'B' })}
                              onBlur={() => setFocusedCell(null)}
                              className="w-full bg-white border border-slate-300 rounded pl-1.5 pr-1 py-1.5 text-xs focus:ring-1 focus:ring-[#107c41] focus:border-[#107c41] focus:outline-none text-right font-mono"
                              id={`weight1-input-${idx}`}
                            />
                            <span className="absolute left-1.5 top-0.5 text-[7px] text-slate-400 select-none">g</span>
                          </div>
                          
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="%"
                              value={row.percent1}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleInputChange(idx, 'percent1', val);
                              }}
                              onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'B' })}
                              onBlur={() => setFocusedCell(null)}
                              className="w-full bg-white border border-slate-300 rounded pl-1.5 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-[#107c41] focus:border-[#107c41] focus:outline-none text-right font-mono"
                              id={`percent1-input-${idx}`}
                            />
                            <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 select-none">%</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Read-only live evaluation of Set 1 */}
                      <td className="p-2 border-r border-slate-100 bg-[#fbfdfc] text-right font-mono text-xs" id={`col-3-output1-${idx}`}>
                        {out1 > 0 ? (
                          <span className="text-[#107c41] font-semibold">{formatWeight(out1)}</span>
                        ) : (
                          <span className="text-slate-300">0.00 g</span>
                        )}
                      </td>

                      {/* Column 4: Date Set 2 */}
                      <td className="p-1 border-r border-slate-100 w-[18%]" id={`col-4-date2-${idx}`}>
                        <div className="flex space-x-1">
                          {/* Day dropdown */}
                          <select
                            value={row.day2}
                            onChange={(e) => handleInputChange(idx, 'day2', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'D' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`day2-select-${idx}`}
                          >
                            <option value="">DD</option>
                            {DAYS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>

                          {/* Month dropdown */}
                          <select
                            value={row.month2}
                            onChange={(e) => handleInputChange(idx, 'month2', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'D' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`month2-select-${idx}`}
                          >
                            <option value="">Mon</option>
                            {MONTHS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>

                          {/* Year dropdown */}
                          <select
                            value={row.year2}
                            onChange={(e) => handleInputChange(idx, 'year2', e.target.value)}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'D' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] cursor-pointer"
                            id={`year2-select-${idx}`}
                          >
                            <option value="">YYYY</option>
                            {YEARS.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Column 5: Inputs Set 2 (Weight and Percent inputs) */}
                      <td className="p-1 border-r border-slate-100" id={`col-5-inputs2-${idx}`}>
                        <div className="flex space-x-1 relative">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Wt (g)"
                              value={row.weight2}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleInputChange(idx, 'weight2', val);
                              }}
                              onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'E' })}
                              onBlur={() => setFocusedCell(null)}
                              className="w-full bg-white border border-slate-300 rounded pl-1.5 pr-1 py-1.5 text-xs focus:ring-1 focus:ring-[#107c41] focus:border-[#107c41] focus:outline-none text-right font-mono"
                              id={`weight2-input-${idx}`}
                            />
                            <span className="absolute left-1.5 top-0.5 text-[7px] text-slate-400 select-none">g</span>
                          </div>
                          
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="%"
                              value={row.percent2}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleInputChange(idx, 'percent2', val);
                              }}
                              onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'E' })}
                              onBlur={() => setFocusedCell(null)}
                              className="w-full bg-white border border-slate-300 rounded pl-1.5 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-[#107c41] focus:border-[#107c41] focus:outline-none text-right font-mono"
                              id={`percent2-input-${idx}`}
                            />
                            <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 select-none">%</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 6: Read-only live evaluation of Set 2 */}
                      <td className="p-2 border-r border-slate-100 bg-[#fbfdfc] text-right font-mono text-xs" id={`col-6-output2-${idx}`}>
                        {out2 > 0 ? (
                          <span className="text-[#107c41] font-semibold">{formatWeight(out2)}</span>
                        ) : (
                          <span className="text-slate-300">0.00 g</span>
                        )}
                      </td>

                      {/* Column 7: Manual money entry cell in Indian Rupees (₹) */}
                      <td className="p-1 border-r border-slate-100 bg-[#fefcf8]" id={`col-7-manual-money-${idx}`}>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="₹ Manual Sum"
                            value={row.manualMoney}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              handleInputChange(idx, 'manualMoney', val);
                            }}
                            onFocus={() => setFocusedCell({ rowIndex: idx, colName: 'G' })}
                            onBlur={() => setFocusedCell(null)}
                            className="w-full bg-white border border-amber-300 rounded pl-4.5 pr-1.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-right font-mono text-amber-900"
                            id={`manual-money-input-${idx}`}
                          />
                          <span className="absolute left-1.5 top-1.5 text-[10px] text-amber-600 font-bold select-none">₹</span>
                        </div>
                      </td>

                      {/* Extra Delete handle column */}
                      <td className="p-1 text-center align-middle" id={`del-btn-container-${idx}`}>
                        <button
                          onClick={() => deleteRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition duration-150 inline-flex items-center cursor-pointer"
                          title="Delete row"
                          id={`btn-del-row-${idx}`}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Sub-table summary spacing or bottom footer boundary */}
                <tr className="bg-slate-50 border-t border-slate-200 select-none">
                  <td colSpan={9} className="h-2 py-0"></td>
                </tr>

                {/* GRAND SUMMARY EXCEL FOOTER ROW */}
                <tr className="bg-slate-100/90 text-sm border-t-2 border-slate-300 font-semibold" id="grand-summary-tr">
                  {/* Spacer indicator */}
                  <td className="p-3 bg-slate-200 text-center text-xs font-mono text-slate-500 border-r border-slate-300">
                    SUM
                  </td>
                  
                  {/* Column 1 Placeholder */}
                  <td className="p-3 border-r border-slate-200 text-xs text-slate-500 font-mono italic">
                    All Date Sums
                  </td>

                  {/* Column 2: Weight Total (Set 1) */}
                  <td className="p-3 border-r border-slate-200 text-right relative" id="col-2-summary-cell">
                    {totals.loading && (
                      <div className="absolute inset-0 bg-slate-200/90 flex items-center justify-end pr-3">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#107c41] border-t-transparent"></span>
                      </div>
                    )}
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-normal">Sum of Weight</span>
                        <span className="font-mono text-slate-700">{totals.totalWeight1.toFixed(2)} g</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">— / 0</span>
                    )}
                  </td>

                  {/* Column 3: Output 1 Total */}
                  <td className="p-3 border-r border-slate-200 bg-[#f4faf6] text-right text-[#107c41] relative" id="col-3-summary-cell">
                    {totals.loading && (
                      <div className="absolute inset-0 bg-emerald-50/95 flex items-center justify-end pr-3">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent"></span>
                      </div>
                    )}
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-emerald-600 font-normal">Set 1 Fine Weight</span>
                        <span className="font-mono font-bold text-sm">{formatWeight(totals.totalOutput1)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">0.00 g</span>
                    )}
                  </td>

                  {/* Column 4 Placeholder */}
                  <td className="p-3 border-r border-slate-200 text-xs text-slate-500 font-mono italic">
                    Date Set 2 Total
                  </td>

                  {/* Column 5: Weight Total (Set 2) */}
                  <td className="p-3 border-r border-slate-200 text-right relative" id="col-5-summary-cell">
                    {totals.loading && (
                      <div className="absolute inset-0 bg-slate-200/90 flex items-center justify-end pr-3">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#107c41] border-t-transparent"></span>
                      </div>
                    )}
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-normal">Sum of Weight</span>
                        <span className="font-mono text-slate-700">{totals.totalWeight2.toFixed(2)} g</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">— / 0</span>
                    )}
                  </td>

                  {/* Column 6: Output 2 Total */}
                  <td className="p-3 border-r border-slate-200 bg-[#f4faf6] text-right text-[#107c41] relative" id="col-6-summary-cell">
                    {totals.loading && (
                      <div className="absolute inset-0 bg-emerald-50/95 flex items-center justify-end pr-3">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent"></span>
                      </div>
                    )}
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-emerald-600 font-normal">Set 2 Fine Weight</span>
                        <span className="font-mono font-bold text-sm">{formatWeight(totals.totalOutput2)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">0.00 g</span>
                    )}
                  </td>

                  {/* Column 7: Manual Money Input Total in Indian Rupees (₹) */}
                  <td className="p-3 border-r border-slate-200 bg-[#fffdf9] text-right text-amber-900 relative" id="col-7-summary-cell">
                    {totals.loading && (
                      <div className="absolute inset-0 bg-amber-50/95 flex items-center justify-end pr-3">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-amber-600 border-t-transparent"></span>
                      </div>
                    )}
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-amber-700 font-normal font-sans">Sum of Manual</span>
                        <span className="font-mono font-bold text-sm text-amber-800">{formatINR(totals.totalManualMoney)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">₹0.00</span>
                    )}
                  </td>

                  {/* Spacer Delete Footer column */}
                  <td className="p-3 bg-slate-100"></td>
                </tr>

                {/* HIGHLY INTERACTIVE EXCEL BRANDED BALANCE SHEET ROW */}
                <tr className="bg-amber-100/40 text-sm border-t border-b-2 border-amber-300 font-semibold shadow-inner" id="balance-sheet-tr">
                  {/* Label Column indicator */}
                  <td className="p-3 bg-amber-100/90 text-center text-xs font-mono text-amber-800 border-r border-amber-200">
                    BAL
                  </td>
                  
                  {/* Spanned Details */}
                  <td colSpan={2} className="px-4 py-3 border-r border-amber-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Balance Sheet (Set 1 Fine Wt. - Set 2 Fine Wt.)</span>
                  </td>

                  {/* Calculated Balance weight outcome with custom coloring */}
                  <td colSpan={3} className="p-3 border-r border-amber-200 text-right bg-amber-50 relative" id="balance-sheet-offset">
                    {totals.calculated ? (
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-200/50 text-amber-800 font-semibold">Net Pure Gold Balance:</span>
                        <span className={`font-mono font-bold text-base ${totals.totalOutput1 - totals.totalOutput2 >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {totals.totalOutput1 - totals.totalOutput2 >= 0 ? '+' : ''}{(totals.totalOutput1 - totals.totalOutput2).toFixed(2)} g
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-500/70 font-mono text-xs font-medium">Run Rollup Calculations to view Balance</span>
                    )}
                  </td>

                  {/* Wages total summary box */}
                  <td className="p-3 border-r border-amber-200 text-right bg-amber-50/60" colSpan={2}>
                    {totals.calculated ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase tracking-wide text-amber-700 font-normal">Wages Total</span>
                        <span className="font-mono font-bold text-sm text-amber-900">{formatINR(totals.totalManualMoney)}</span>
                      </div>
                    ) : (
                      <span className="text-amber-400 font-mono text-xs">₹0.00</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick status message below table scroll */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2" id="grid-bottom-bar">
            <span>💡 <em>Excel Hack:</em> Click <strong>"Calculate Total Sum"</strong> as you add or alter values to trigger a comprehensive vertical rollup calculation.</span>
            <span className="text-slate-400 font-mono">Formula: Pure Weight = Weight × (Percent / 100)</span>
          </div>
        </div>

        {/* LEDGER GRID OPERATORS / CONTROL BOX */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm" id="matrix-controller">
          <div className="flex items-center space-x-2" id="add-entry-container">
            <button
              onClick={addNewRow}
              className="bg-[#107c41] hover:bg-[#0c5c30] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 shadow-sm transition hover:shadow-md active:scale-95 cursor-pointer"
              id="btn-add-new-row"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Row Entry</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2" id="summation-and-export">
            {/* Generate & Download Print Slip Modal button */}
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2.5 inline-flex items-center space-x-2 text-sm font-semibold rounded-lg text-amber-850 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95 cursor-pointer shadow-sm hover:shadow"
              title="Generate a beautiful, printable receipt with logo and mobile number"
              id="btn-print-slip"
            >
              <Printer className="h-4 w-4 text-amber-700" />
              <span>Print Branded Receipt</span>
            </button>

            {/* Direct premium high-fidelity instant PDF Downloader */}
            <button
              onClick={handleDownloadPDF}
              disabled={exportingPDF}
              className="px-4 py-2.5 inline-flex items-center space-x-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 border border-emerald-500/30 transition active:scale-95 cursor-pointer shadow-sm hover:shadow"
              title="Download beautiful balance sheet receipt directly as PDF"
              id="btn-download-pdf-direct"
            >
              {exportingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <FileText className="h-4 w-4 text-emerald-100" />
              )}
              <span>{exportingPDF ? "Exporting PDF..." : "Download PDF Bill"}</span>
            </button>

            {/* Export Ledger to Comma Separated CSV */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 inline-flex items-center space-x-2 text-sm font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 cursor-pointer"
              title="Download backup file for Excel, Google Sheets or retail import"
              id="btn-export-csv"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV Spreadsheet</span>
            </button>

            {/* Calculate Total Multiplier Sum trigger */}
            <button
              onClick={calculateTotalSum}
              disabled={totals.loading}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center space-x-2 shadow-sm relative transition active:scale-95 cursor-pointer ${
                totals.loading 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : totals.calculated 
                  ? 'bg-[#107c41] hover:bg-[#0d6434] text-white hover:shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
              }`}
              id="btn-calculate-totals"
            >
              {totals.loading ? (
                <>
                  <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-slate-500 border-t-transparent"></span>
                  <span>Compiling Calculations...</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4.5 w-4.5" />
                  <span>Calculate Total Sum</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUMMARY VISUALIZATION CARDS */}
        {totals.calculated && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            id="summary-visualizations-grid"
          >
            {/* Primary Ledger Summary */}
            <div className="bg-[#f0faf4] border border-[#a3e2bc] rounded-xl p-4.5 shadow-sm" id="viz-card-set-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Set 1 Fine Weight</span>
                <Coins className="h-4.5 w-4.5 text-[#107c41]" />
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-extrabold text-emerald-950 font-mono" id="viz-set1-sum">
                  {formatWeight(totals.totalOutput1)}
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                  <span>Gross Weight 1:</span>
                  <span className="font-bold underline">{totals.totalWeight1.toFixed(2)} g</span>
                </div>
              </div>
            </div>

            {/* Secondary Ledger Summary */}
            <div className="bg-[#f0faf4] border border-[#a3e2bc] rounded-xl p-4.5 shadow-sm" id="viz-card-set-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Set 2 Fine Weight</span>
                <Coins className="h-4.5 w-4.5 text-[#107c41]" />
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-extrabold text-[#107c41] font-mono" id="viz-set2-sum">
                  {formatWeight(totals.totalOutput2)}
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                  <span>Gross Weight 2:</span>
                  <span className="font-bold underline">{totals.totalWeight2.toFixed(2)} g</span>
                </div>
              </div>
            </div>

            {/* The Balance Sheet (Set 1 Fine Weight subtracted by Set 2 Fine Weight) */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4.5 shadow-sm" id="viz-card-balance-sheet">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">⚖️ Balance Sheet Gold</span>
                <Briefcase className="h-4.5 w-4.5 text-amber-700" />
              </div>
              <div className="mt-2.5">
                <div className={`text-xl font-extrabold font-mono ${(totals.totalOutput1 - totals.totalOutput2) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} id="viz-balance-sheet-sum">
                  {(totals.totalOutput1 - totals.totalOutput2) >= 0 ? '+' : ''}{(totals.totalOutput1 - totals.totalOutput2).toFixed(2)} g
                </div>
                <div className="text-[10px] text-amber-800 mt-1 flex items-center justify-between">
                  <span>Logic:</span>
                  <span className="font-semibold text-amber-900">(Set 1 Fine - Set 2 Fine)</span>
                </div>
              </div>
            </div>

            {/* Combined Wages in Indian Rupees */}
            <div className="bg-[#fffdf9] border border-amber-200 rounded-xl p-4.5 shadow-sm" id="viz-card-combined">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Wages (INR)</span>
                <IndianRupee className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-extrabold text-amber-950 font-mono" id="viz-aggregate-sum">
                  {formatINR(totals.totalManualMoney)}
                </div>
                <div className="text-[10px] text-amber-700 mt-1 flex items-center justify-between">
                  <span>Active entries:</span>
                  <span className="font-bold">{rows.filter(r => r.manualMoney).length} rows</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* BRANDED PRINT BILLING SLIP / INVOICE MODAL */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto" id="invoice-modal-backdrop">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #invoice-print-area, #invoice-print-area * {
                  visibility: visible !important;
                }
                #invoice-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print-element {
                  display: none !important;
                }
              }
            `}</style>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-205 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
              id="invoice-modal-container"
            >
              {/* Modal control header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center no-print-element" id="invoice-modal-header">
                <div className="flex items-center space-x-2">
                  <Printer className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-sm tracking-tight">Active Jewellery Transaction Receipt</span>
                </div>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-slate-400 hover:text-white font-bold bg-slate-800 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer transition"
                >
                  ×
                </button>
              </div>

              {/* Printable Area - looks like real corporate tax billing invoice */}
              <div 
                className="p-8 overflow-y-auto flex-grow space-y-6" 
                id="invoice-print-area"
              >
                {/* Invoice Letterhead */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-200 pb-5 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-amber-300 shadow-sm shrink-0">
                      {renderActiveLogo("w-14 h-14")}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Ashish Jewellers</h2>
                      <p className="text-xs text-amber-600 font-extrabold flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 inline" />
                        <span>Mobile No. +91 9819150997</span>
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                        Zaveri Bazaar, Mumbai, Maharashtra 400002. Specialists in Gold Bullion, Retail Ornaments & Pure Melting Valuations.
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right font-mono text-xs text-slate-500 space-y-1 sm:self-center">
                    <div className="text-base font-extrabold text-slate-900 uppercase">TRANSACTION MEMO</div>
                    <div>Date: <strong className="text-slate-800">{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong></div>
                    <div>Doc ID: <strong className="text-slate-800">AJ-{new Date().getTime().toString().substring(7)}</strong></div>
                    <div>Formulas: <strong className="text-slate-800">Set 1 - Set 2 Purified</strong></div>
                  </div>
                </div>

                {/* Grid Summary Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-600">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Spreadsheet Rules</div>
                    <ul className="space-y-1 list-disc pl-4">
                      <li>Set 1 Fine Weight = Gross Wt. × (Percent / 100)</li>
                      <li>Set 2 Fine Weight = Gross Wt. × (Percent / 100)</li>
                      <li>Balance Sheet logic applied below (Set 1 Fine gold subtract Set 2 Fine gold)</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 mb-1">Company Guarantee</div>
                    <p className="text-[11px] leading-relaxed text-slate-700">
                      Ashish Jewellers guarantees the mathematical accuracy of gold purity calculations entered under this gold ledger. Weight computations are rounded to two decimal places.
                    </p>
                  </div>
                </div>

                {/* Ledger Entries Table */}
                <div>
                  <div className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">Detailed Ornaments Weight Log</div>
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider divide-x divide-slate-800">
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2">Date Set 1</th>
                        <th className="p-2 text-right">Set 1 Gross / Purity</th>
                        <th className="p-2 text-right">Set 1 Fine Wt (g)</th>
                        <th className="p-2">Date Set 2</th>
                        <th className="p-2 text-right">Set 2 Gross / Purity</th>
                        <th className="p-2 text-right">Set 2 Fine Wt (g)</th>
                        <th className="p-2 text-right">Manual Fee (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, idx) => {
                        const out1 = getRowOutput1(row);
                        const out2 = getRowOutput2(row);
                        const hasContent = row.weight1 || row.percent1 || row.weight2 || row.percent2 || row.manualMoney;
                        
                        if (!hasContent) return null;

                        const date1 = `${row.day1 || ''}-${row.month1 || ''}-${row.year1 || ''}`;
                        const date2 = `${row.day2 || ''}-${row.month2 || ''}-${row.year2 || ''}`;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 font-mono divide-x divide-slate-100">
                            <td className="p-2 text-center text-[10px] text-slate-400">{idx + 1}</td>
                            <td className="p-2 text-slate-700">{date1 !== '--' ? date1 : 'N/A'}</td>
                            <td className="p-2 text-right text-slate-600">
                              {row.weight1 ? `${parseFloat(row.weight1).toFixed(2)}g / ${row.percent1 || 0}%` : '-'}
                            </td>
                            <td className="p-2 text-right text-slate-900 font-semibold bg-emerald-50/20">
                              {out1 > 0 ? out1.toFixed(2) + ' g' : '0.00 g'}
                            </td>
                            <td className="p-2 text-slate-700">{date2 !== '--' ? date2 : 'N/A'}</td>
                            <td className="p-2 text-right text-slate-600">
                              {row.weight2 ? `${parseFloat(row.weight2).toFixed(2)}g / ${row.percent2 || 0}%` : '-'}
                            </td>
                            <td className="p-2 text-right text-slate-900 font-semibold bg-emerald-50/20">
                              {out2 > 0 ? out2.toFixed(2) + ' g' : '0.00 g'}
                            </td>
                            <td className="p-2 text-right text-amber-900 font-semibold bg-amber-50/20">
                              {row.manualMoney ? formatINR(parseFloat(row.manualMoney) || 0) : '₹0.00'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary Ledger Box */}
                <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Set 1 Fine Gold Weight:</span>
                      <strong className="text-slate-900">{formatWeight(totals.totalOutput1)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Set 2 Fine Gold Weight:</span>
                      <strong className="text-slate-900">{formatWeight(totals.totalOutput2)}</strong>
                    </div>
                    <div className="border-t border-slate-200 my-1"></div>
                    <div className="flex justify-between font-mono text-xs">
                      <span>Gross Accumulated Gold Wt:</span>
                      <strong>{formatWeight(totals.totalOutput1 + totals.totalOutput2)}</strong>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3.5 border border-amber-300 flex flex-col justify-center space-y-2">
                    {/* The Balance Sheet subtractions rule */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px]">⚖️ Balance Sheet Net Balance</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">Rule: Set 1 - Set 2</span>
                    </div>
                    
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-600">Net Pure Gold Balance:</span>
                      <strong className={`font-mono text-lg ${(totals.totalOutput1 - totals.totalOutput2) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {(totals.totalOutput1 - totals.totalOutput2) >= 0 ? '+' : ''}{(totals.totalOutput1 - totals.totalOutput2).toFixed(2)} g
                      </strong>
                    </div>

                    <div className="border-t border-slate-100 my-1.5"></div>

                    <div className="flex justify-between items-baseline font-mono">
                      <span className="text-[11px] text-slate-600 font-sans">Total Services / Wages Bill:</span>
                      <strong className="text-amber-950 text-base">{formatINR(totals.totalManualMoney)}</strong>
                    </div>
                  </div>
                </div>

                {/* Sign Off Footers */}
                <div className="pt-16 flex justify-between text-xs text-slate-400 no-print-element">
                  <div className="border-t border-slate-200 pt-1.5 w-40 text-center uppercase font-mono tracking-wider">
                    Customer Seal
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 w-40 text-center uppercase font-mono tracking-wider">
                    Authorised Signatory
                  </div>
                </div>

                <div className="text-center pt-8 border-t border-slate-100 text-[9px] text-slate-400">
                  Note: "SET 1 FINE WEIGHT will be subtracted by set 2 fine weight as the name of balance sheet". System generated document — does not require physical signature of Ashish Jewellers.
                </div>
              </div>

              {/* Action operations controls footer */}
              <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center gap-2 no-print-element" id="invoice-modal-ops">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-5 py-2.5 inline-flex items-center space-x-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow transition cursor-pointer active:scale-95"
                    id="btn-trigger-pdf-print"
                  >
                    <Printer className="h-4.5 w-4.5" />
                    <span>Print Bill / Memo</span>
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={exportingPDF}
                    className="px-5 py-2.5 inline-flex items-center space-x-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg shadow transition cursor-pointer active:scale-95"
                    id="btn-download-pdf-modal"
                  >
                    {exportingPDF ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <FileText className="h-4.5 w-4.5" />
                    )}
                    <span>{exportingPDF ? "Exporting PDF..." : "Download PDF Bill"}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const printHTML = `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Ashish Jewellers - Gold Invoice</title>
                            <meta charset="utf-8">
                            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          </head>
                          <body class="bg-gray-50 p-8 font-sans">
                            <div class="max-w-4xl mx-auto bg-white p-12 rounded-xl shadow border border-gray-100">
                              ${document.getElementById("invoice-print-area")?.innerHTML || "Empty Receipt data"}
                            </div>
                          </body>
                        </html>
                      `;
                      const element = document.createElement("a");
                      const file = new Blob([printHTML], { type: 'text/html' });
                      element.href = URL.createObjectURL(file);
                      element.download = `Ashish_Jewellers_Invoice_${new Date().getTime().toString().substring(7)}.html`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="px-4 py-2.5 inline-flex items-center space-x-1 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition cursor-pointer"
                    id="btn-download-offline-html"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Offline HTML Copy</span>
                  </button>

                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-300 hover:bg-slate-400 rounded-lg transition cursor-pointer"
                    id="btn-close-invoice"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WEB APP INSTALLATION GUIDE MODAL (PWA DETAILED INFO) */}
      <AnimatePresence>
        {showInstallInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4" id="pwa-install-backdrop">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 text-slate-800 relative z-50"
              id="pwa-install-container"
            >
              <button
                onClick={() => setShowInstallInfo(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold bg-slate-100 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer transition"
              >
                ×
              </button>

              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Download className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                  Install Ashish Jewellers Web App
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Install this gold ledger spreadsheet directly on your device to access it offline with app-like speed, zero browser clutter, and desktop launcher shortcut.
                </p>
              </div>

              <div className="mt-6 space-y-4 font-sans text-xs">
                {/* Desktop instructions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <span className="font-bold text-slate-900 block mb-1">💻 Desktop (Chrome, Edge, Brave)</span>
                  <p className="text-slate-600 leading-relaxed">
                    Look at the browser's URL address bar. Click the <strong className="text-emerald-700 font-semibold font-mono">Install App icon</strong> (usually looking like a laptop with an arrow or three dots menu) and click <strong className="font-semibold text-slate-900">Install</strong>.
                  </p>
                </div>

                {/* iOS instructions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <span className="font-bold text-slate-900 block mb-1">📱 Apple iPhone / iPad (Safari)</span>
                  <p className="text-slate-600 leading-relaxed">
                    1. Tap the <strong className="text-emerald-700 font-semibold">Share</strong> button at the bottom of Safari.<br />
                    2. Scroll down and select <strong className="text-slate-950 font-semibold">"Add to Home Screen"</strong>.<br />
                    3. Tap <strong className="text-emerald-700 font-bold">Add</strong> at the top-right corner to complete!
                  </p>
                </div>

                {/* Google Android instructions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <span className="font-bold text-slate-900 block mb-1">🤖 Android (Chrome)</span>
                  <p className="text-slate-600 leading-relaxed">
                    Tap the three dots menu <strong className="text-slate-900">⁝</strong> at the top right corner of Chrome and choose <strong className="text-emerald-700 font-semibold">"Add to Home screen"</strong> or <strong className="text-emerald-700 font-semibold">"Install app"</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowInstallInfo(false)}
                  className="px-5 py-2.5 bg-[#107c41] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer active:scale-95"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer credits and information */}
      <footer className="mt-auto py-6 bg-slate-900 text-slate-400 border-t border-slate-800" id="ledger-footer-credits">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-sm">
            Jewelry Ledger Spreadsheet — Built in pristine React with custom formula engines.
          </p>
          <div className="text-xs text-slate-600 font-mono flex items-center justify-center space-x-3">
            <span>Microsoft Excel Engine Emulation v4.2S</span>
            <span>•</span>
            <span>Local Secure Client Persistent Memory</span>
            <span>•</span>
            <span>Pure Gold Fine Weight Calculation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
