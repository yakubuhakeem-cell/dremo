import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Transaction, CURRENCY_SYMBOL } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Smartphone, Check, Hash, Tag, Sparkles, Printer, QrCode, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';

interface RegisterViewProps {
  products: Product[];
  categories: string[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkout: (paymentMethod: Transaction['paymentMethod'], discount: number, taxRate: number, cashTendered?: number) => Transaction | null;
}

export default function RegisterView({
  products,
  categories: initialCategories = ['Cafe', 'Workspace', 'Goods'],
  cart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  checkout
}: RegisterViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(8); // Default to 8% POS state tax
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<Transaction['paymentMethod']>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

  // Mobile QR Pay State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isQrPaymentSimulatedSuccess, setIsQrPaymentSimulatedSuccess] = useState<boolean>(false);

  // Thermal Printing Options State
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [includeBarcode, setIncludeBarcode] = useState<boolean>(true);
  const [includeHeaderLogo, setIncludeHeaderLogo] = useState<boolean>(true);
  const [printError, setPrintError] = useState<string | null>(null);

  const handlePrint = () => {
    setPrintError(null);
    try {
      if (typeof window === 'undefined' || !window.print) {
        throw new Error("Direct Print APIs cannot be accessed inside this display device style context.");
      }
      window.print();
    } catch (err: any) {
      console.warn("Thermal print system call failed/blocked:", err);
      setPrintError(
        "Browser layout sandbox restriction detected. Safe fallback: Open the application in a new separate tab, or press Ctrl+P (Cmd+P on Mac OS) manual shortcut to proceed with print queueing."
      );
    }
  };

  // QR & Barcode Laser Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerLogs, setScannerLogs] = useState<{ time: string; msg: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Synthesize custom cash register chime frequency using Web Audio Context
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime); // Standard POS high register chime
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (err) {
      console.warn("Dremo beep synthesizer warning:", err);
    }
  };

  // Synthesize heavier low pitch alarm warning buzzer for scanner errors
  const playBeepError = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime); // Low buzz
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + 0.28);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (err) {
      console.warn("Dremo beep synthesizer error:", err);
    }
  };

  // Scan processor
  const handleScannedValue = (skuOrId: string) => {
    const cleanedText = skuOrId.trim();
    const matchedProduct = products.find(
      p => p.sku.toLowerCase() === cleanedText.toLowerCase() || p.id.toLowerCase() === cleanedText.toLowerCase()
    );

    if (matchedProduct) {
      if (matchedProduct.stock <= 0) {
        playBeepError();
        setScannerLogs(prev => [
          { time: new Date().toLocaleTimeString(), msg: `OUT OF STOCK: "${matchedProduct.name}" (${cleanedText})`, type: 'error' },
          ...prev.slice(0, 19)
        ]);
        return;
      }
      
      addToCart(matchedProduct);
      playBeep();
      setScannerLogs(prev => [
        { time: new Date().toLocaleTimeString(), msg: `SUCCESS: "${matchedProduct.name}" (${matchedProduct.sku}) added!`, type: 'success' },
        ...prev.slice(0, 19)
      ]);
    } else {
      playBeepError();
      setScannerLogs(prev => [
        { time: new Date().toLocaleTimeString(), msg: `UNKNOWN CODE: "${cleanedText}"`, type: 'error' },
        ...prev.slice(0, 19)
      ]);
    }
  };

  // Query Cameras when scanner turns on
  useEffect(() => {
    if (!isScannerOpen) {
      setAvailableCameras([]);
      return;
    }

    try {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setAvailableCameras(devices.map(d => ({
            id: d.id,
            label: d.label || `Camera ${devices.indexOf(d) + 1}`
          })));
          
          const backCam = devices.find(
            d => d.label.toLowerCase().includes('back') || 
                 d.label.toLowerCase().includes('environment') || 
                 d.label.toLowerCase().includes('rear')
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setScannerError("No direct camera device found. Please use the Interactive Simulator below.");
        }
      }).catch((e: any) => {
        console.warn("Camera enumeration permission error:", e);
        setScannerError("Camera permission blocked. You can still use the Interactive Simulator below to scan products.");
      });
    } catch (e: any) {
      console.warn("Camera media-devices browser restriction:", e);
      setScannerError("Unsupported sandbox context. Please use the Interactive Simulator below to test checkout scanning.");
    }
  }, [isScannerOpen]);

  // Main stream controller effect
  useEffect(() => {
    if (!isScannerOpen) return;

    const scannerId = "qrcode-reader-element";
    const element = document.getElementById(scannerId);
    if (!element) return;

    let activeInstance: any = null;
    let isInstanceScanning = false;

    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      activeInstance = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleScannedValue(decodedText);
      };

      const qrCodeErrorCallback = () => {
        // Quiet scanning logs
      };

      const cameraConfig = activeCameraId ? activeCameraId : { facingMode: "environment" };

      html5QrCode.start(
        cameraConfig,
        { fps: 15, qrbox: { width: 220, height: 220 } },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      ).then(() => {
        isInstanceScanning = true;
        setScannerError(null);
      }).catch((err: any) => {
        console.warn("Failed to boot camera feed:", err);
        setScannerError("Camera currently busy or unsupported. Safe fallback option: scan products directly from the interactive simulator bar!");
      });
    } catch (e: any) {
      console.warn("Scanner constructor error:", e);
      setScannerError("Sandbox permission issue. Please interact with the click-simulation chips to test checkout trigger.");
    }

    return () => {
      if (activeInstance && isInstanceScanning) {
        activeInstance.stop().catch((e: any) => console.log("Cleanup camera stop fail:", e));
      }
    };
  }, [isScannerOpen, activeCameraId, products]);

  // Filters
  const categories = ['All', ...initialCategories];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Math Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountAmount = (cartSubtotal * discountPercent) / 100;
  const taxableAmount = cartSubtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const cartTotal = taxableAmount + taxAmount;

  // Dynamic QR Code generation for payment method
  useEffect(() => {
    if (!isCheckoutOpen || paymentMethod !== 'Mobile Pay') {
      setQrCodeDataUrl('');
      return;
    }

    const payUri = `https://dremo-pay.app/invoice/pay?amount=${cartTotal.toFixed(2)}&currency=GHS&tx_token=dremo_tx_${Date.now()}`;
    
    QRCode.toDataURL(payUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#4f46e5', // Brand Indigo-600
        light: '#ffffff'
      }
    })
      .then(url => {
        setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error("Failed to generate payment QR code:", err);
      });
  }, [isCheckoutOpen, paymentMethod, cartTotal]);

  const simulateMobilePaymentScan = () => {
    playBeep();
    setIsQrPaymentSimulatedSuccess(true);
  };

  // Tender options
  const tenderShortcuts = [5, 10, 20, 50, 100];

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashTendered(Math.ceil(cartTotal));
    setIsCheckoutOpen(true);
    setCompletedTx(null);
    setPrintError(null);
    setIsQrPaymentSimulatedSuccess(false);
  };

  const processSale = () => {
    const tx = checkout(paymentMethod, discountPercent, taxRate, paymentMethod === 'Cash' ? cashTendered : undefined);
    if (tx) {
      setCompletedTx(tx);
    }
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setCompletedTx(null);
    clearCart();
    setDiscountPercent(0);
    setPrintError(null);
    setIsQrPaymentSimulatedSuccess(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Product Catalog Column */}
      <div className="flex-1 flex flex-col bg-slate-50 p-6 overflow-y-auto">
        {/* Banner/Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Checkout Terminal</h2>
            <p className="text-xs text-slate-500">Scan SKUs or click items to construct the transaction cart.</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-400 bg-white border border-slate-200 py-1.5 px-3 rounded-lg shadow-sm">
            Cashier Desk Open
          </div>
        </div>

        {/* Collapsible Laser/QR Camera Scanner Dashboard */}
        <AnimatePresence>
          {isScannerOpen && (
            <motion.div
              id="qr-scanner-dashboard"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col xl:flex-row gap-5 relative shadow-lg shrink-0"
            >
              {/* Left Viewport Col: Camera feed and Target bounds */}
              <div className="w-full xl:w-5/12 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-indigo-400 font-bold uppercase">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                    </span>
                    Live Camera Target Feed
                  </span>
                  
                  {availableCameras.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Camera className="size-3 text-slate-400" />
                      <select
                        id="camera-device-select"
                        value={activeCameraId}
                        onChange={(e) => setActiveCameraId(e.target.value)}
                        className="bg-slate-850 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[9px] outline-none font-bold"
                      >
                        {availableCameras.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="relative w-full aspect-square md:aspect-video max-h-[190px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <div id="qrcode-reader-element" className="w-full h-full object-cover" />
                  
                  {/* Scanner HUD target markers */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                    <div className="flex justify-between w-full">
                      <div className="size-4.5 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm" />
                      <div className="size-4.5 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm" />
                    </div>
                    
                    {/* Linear scrolling light bar */}
                    <div className="w-full h-[2.5px] bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />

                    <div className="flex justify-between w-full">
                      <div className="size-4.5 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm" />
                      <div className="size-4.5 border-b-4 border-r-4 border-indigo-500 rounded-br-sm" />
                    </div>
                  </div>
                </div>

                {scannerError ? (
                  <p className="text-[10px] text-amber-300 leading-normal bg-slate-950 p-2 border border-slate-800 rounded font-medium">
                    {scannerError}
                  </p>
                ) : (
                  <p className="text-[9px] text-slate-400 italic text-center font-mono">
                    Point camera at a barcode to scan automatically.
                  </p>
                )}
              </div>

              {/* Right Viewport Col: Dashboard diagnostics & Interactive simulator */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Simulator section */}
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold tracking-wider uppercase text-slate-400 font-sans">Active Cashier Barcode Sheet (Interactive Simulator)</h4>
                    <span className="text-[9px] bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">Chime Synthesizer</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    Click any product chip below to simulate a real hardware scanner laser ping on that item SKU. Excellent for testing offline:
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleScannedValue(p.sku)}
                        className="py-1 px-2 bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-slate-100 rounded-lg border border-slate-700 flex items-center gap-1.5 hover:text-indigo-300 hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm"
                      >
                        <span className="inline-block size-1.5 rounded-full bg-indigo-400" />
                        <span>{p.name}</span>
                        <span className="font-mono text-[8px] text-indigo-350 bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-900/50">{p.sku}</span>
                      </button>
                    ))}
                    {/* Test failure barcode scan */}
                    <button
                      type="button"
                      onClick={() => handleScannedValue("BAD-SKU-99")}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-amber-500 rounded-lg border border-slate-700 flex items-center gap-1.5 hover:bg-rose-950/20 hover:border-rose-900/60 transition-all cursor-pointer shadow-sm"
                      title="Simulate scanning a bad or unknown barcode to verify audio feedback"
                    >
                      <span className="inline-block size-1.5 rounded-full bg-rose-500" />
                      <span>Simulate Bad Scan</span>
                      <span className="font-mono text-[8px] text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-900/50">SKU-ERR</span>
                    </button>
                  </div>
                </div>

                {/* Laser diagnostic logs list */}
                <div className="flex-1 flex flex-col min-h-[110px] max-h-[140px] bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-[10px] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5 text-slate-400 font-sans">
                    <span className="font-bold text-[9px] tracking-wider uppercase">Scanner Diagnostic Logs</span>
                    <span className="text-[8px] font-mono">Roll history</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {scannerLogs.length === 0 ? (
                      <p className="text-slate-500 italic text-center pt-5 font-sans leading-relaxed">
                        Awaiting code triggers. Align barcode in front of webcam or click any simulator chip above!
                      </p>
                    ) : (
                      scannerLogs.map((log, lIdx) => (
                        <div key={lIdx} className="flex gap-2">
                          <span className="text-[9px] text-slate-500 shrink-0 select-none font-bold">{log.time}</span>
                          <span className={`leading-tight ${
                            log.type === 'success' ? 'text-emerald-400 font-semibold' :
                            log.type === 'error' ? 'text-rose-400 font-semibold' : 'text-slate-300'
                          }`}>
                            {log.msg}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Categories Filter */}
        <div className="flex flex-col xl:flex-row gap-3 mb-6 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
            <input
              id="product-search"
              type="text"
              placeholder="Search product names, categories, or SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex p-0.5 gap-1 bg-slate-200/60 rounded-xl select-none items-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`cat-filter-${cat.toLowerCase()}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              id="qr-scanner-toggle-btn"
              type="button"
              onClick={() => setIsScannerOpen(!isScannerOpen)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border shadow-sm transition-all shrink-0 cursor-pointer ${
                isScannerOpen
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 hover:scale-[1.01]"
              }`}
            >
              <QrCode className="size-4" />
              <span>{isScannerOpen ? "Close Laser Scanner" : "Scan Products / QR Code"}</span>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((p) => {
              const outOfStock = p.stock <= 0;
              const lowStock = p.stock > 0 && p.stock <= p.minStock;
              return (
                <motion.div
                  key={p.id}
                  id={`product-card-${p.sku}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => !outOfStock && addToCart(p)}
                  className={`bg-white rounded-2xl border border-slate-150 p-4 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between cursor-pointer group relative overflow-hidden select-none ${
                    outOfStock ? 'opacity-55 cursor-not-allowed border-dashed border-slate-200' : ''
                  }`}
                >
                  {/* Category Accent Indicator */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${p.color}`} />

                  <div className="pl-2.5">
                    {/* Item SKU and Status */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">{p.sku}</span>
                      {outOfStock ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 font-mono">Out of Stock</span>
                      ) : lowStock ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">Restock ({p.stock})</span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 font-mono">Stock: {p.stock}</span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-3 group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex items-end justify-between pl-2.5 pt-2 border-t border-slate-100 mt-2">
                    <div>
                      <span className="text-xs text-slate-400 font-mono leading-none block">Unit Price</span>
                      <span className="text-base font-extrabold text-slate-900 font-mono">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</span>
                    </div>
                    {!outOfStock && (
                      <div className="size-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 transition-colors flex items-center justify-center text-indigo-600 group-hover:text-white">
                        <Plus className="size-4.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Processing Sidebar */}
      <div className="w-100 bg-white border-l border-slate-200 flex flex-col justify-between h-full shadow-xl relative z-10 shrink-0 select-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Shopping Cart</h2>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
              {cart.reduce((s, c) => s + c.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              id="clear-cart-btn"
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors"
            >
              <Trash2 className="size-3.5" /> Clear Cart
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="size-14 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                <ShoppingCart className="size-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-44">Select products from the layout panel to build an invoice</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.product.id}
                  id={`cart-row-${item.product.sku}`}
                  initial={{ opacity: 0, scale: 0.98, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{CURRENCY_SYMBOL}{item.product.price.toFixed(2)} /unit</span>
                  </div>

                  {/* Quantity adjustment cluster */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="size-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono text-slate-700">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="size-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Total line item price */}
                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800 font-mono">
                      {CURRENCY_SYMBOL}{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors"
                      title="Remove product"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Math & Billing Panel */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3.5">
          {/* Discount & Tax controls info */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">Discount %</label>
              <div className="relative">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                <input
                  id="checkout-discount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">Sales Tax %</label>
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                <input
                  id="checkout-tax"
                  type="number"
                  min="0"
                  max="50"
                  value={taxRate || ''}
                  onChange={(e) => setTaxRate(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between">
              <span>Cart Subtotal</span>
              <span className="font-semibold">{CURRENCY_SYMBOL}{cartSubtotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-{CURRENCY_SYMBOL}{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax Amount ({taxRate}%)</span>
              <span className="font-semibold">{CURRENCY_SYMBOL}{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200/50">
              <span className="font-sans">Receipt total</span>
              <span>{CURRENCY_SYMBOL}{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Trigger checkout button */}
          <button
            id="trigger-billing-btn"
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="size-4.5" /> Checkout Invoice ({CURRENCY_SYMBOL}{cartTotal.toFixed(2)})
          </button>
        </div>

        {/* Interactive Payment and Receipt Modal */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col pt-6 font-sans text-slate-800"
            >
              {/* Completed Screen or Payment Options Screen */}
              {!completedTx ? (
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-950">Confirm Checkout Payment</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Choose your customer tender option to close current drawer ledger.</p>
                  </div>

                  {/* Summary card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Outstanding Tender</span>
                    <h4 className="text-3xl font-extrabold text-indigo-600 font-mono">{CURRENCY_SYMBOL}{cartTotal.toFixed(2)}</h4>
                    <p className="text-[10px] text-slate-400">{cart.reduce((s, c) => s + c.quantity, 0)} items compiled</p>
                  </div>

                  {/* Method select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 font-mono tracking-wider block">Method Select</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'Cash', label: 'Cash', icon: DollarSign },
                        { id: 'Card', label: 'Card Swipe', icon: CreditCard },
                        { id: 'Mobile Pay', label: 'QR Mob', icon: Smartphone },
                        { id: 'Split Payment', label: 'Split', icon: Sparkles },
                      ].map((term) => {
                        const Icon = term.icon;
                        const IsSel = paymentMethod === term.id;
                        return (
                          <button
                            key={term.id}
                            id={`pay-method-${term.id.toLowerCase().replace(' ', '-')}`}
                            onClick={() => setPaymentMethod(term.id as Transaction['paymentMethod'])}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                              IsSel
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="size-5" />
                            <span className="text-[10px] font-bold leading-none">{term.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cash Change Panel if Payment Method is Cash */}
                  {paymentMethod === 'Cash' && (
                    <div className="space-y-3.5 p-4.5 bg-indigo-50/30 rounded-2xl border border-indigo-150/60">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-slate-500 font-mono tracking-wider">Cash Tendered</label>
                        <span className="text-xs font-bold text-indigo-600 font-mono">{CURRENCY_SYMBOL}{cashTendered.toFixed(2)}</span>
                      </div>
                      
                      {/* Direct Keyboard entry */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-indigo-500 font-mono">{CURRENCY_SYMBOL}</span>
                        <input
                          id="cash-tendered-input"
                          type="number"
                          value={cashTendered || ''}
                          onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-150 rounded-xl text-lg font-mono font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Cash tendered quick buttons */}
                      <div className="flex gap-1.5 justify-between">
                        {tenderShortcuts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setCashTendered(prev => prev + amount)}
                            className="flex-1 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-700 shadow-sm"
                          >
                            +{amount}
                          </button>
                        ))}
                        <button
                          onClick={() => setCashTendered(cartTotal)}
                          className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-extrabold uppercase font-mono shadow-sm"
                        >
                          Exact
                        </button>
                      </div>

                      {/* Display Change */}
                      {cashTendered >= cartTotal ? (
                        <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-emerald-700">
                          <span className="text-xs font-bold uppercase">Customer Change</span>
                          <span className="text-xl font-extrabold font-mono">{CURRENCY_SYMBOL}{(cashTendered - cartTotal).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-red-600">
                          <span className="text-xs font-bold uppercase">Insufficient Cash Tendered</span>
                          <span className="text-xs font-bold font-mono">Need {CURRENCY_SYMBOL}{(cartTotal - cashTendered).toFixed(2)} more</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile QR Pay Panel if Payment Method is Mobile Pay */}
                  {paymentMethod === 'Mobile Pay' && (
                    <div className="space-y-4 p-4.5 bg-indigo-50/10 rounded-2xl border border-indigo-150/60 flex flex-col items-center">
                      <div className="text-center space-y-1">
                        <label className="text-xs font-extrabold uppercase text-indigo-700 font-mono tracking-wider">Scan to Pay via Mobile Device</label>
                        <p className="text-[10px] text-slate-500 font-medium">Total Payable amount: <span className="font-mono font-bold text-indigo-600">{CURRENCY_SYMBOL}{cartTotal.toFixed(2)}</span></p>
                      </div>

                      <div className="relative p-3 bg-white rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-center overflow-hidden">
                        {qrCodeDataUrl ? (
                          <img 
                            src={qrCodeDataUrl} 
                            alt="Payment QR Code" 
                            className="size-36 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="size-36 flex items-center justify-center text-xs text-slate-450 font-mono animate-pulse">
                            Generating QR...
                          </div>
                        )}
                        
                        {/* Interactive scan confirmation badge */}
                        {isQrPaymentSimulatedSuccess && (
                          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-3 text-center space-y-1 rounded-2xl">
                            <div className="size-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                              <Check className="size-6 stroke-[3]" />
                            </div>
                            <span className="text-xs font-bold text-emerald-800">Mobile Payment Approved</span>
                            <span className="text-[9px] text-slate-450 font-medium leading-tight">Mock authorization tokens exchanged securely.</span>
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-2 w-full">
                        <p className="text-[10px] text-slate-400 font-medium leading-normal italic">
                          Accepts Venmo, CashApp, Apple Pay, and Google Pay wallets
                        </p>
                        
                        {!isQrPaymentSimulatedSuccess ? (
                          <button
                            type="button"
                            onClick={simulateMobilePaymentScan}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <QrCode className="size-4" />
                            <span>Simulate Customer Scan & Pay</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsQrPaymentSimulatedSuccess(false)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium font-sans underline cursor-pointer"
                          >
                            Reset Mobile Simulation
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      id="modal-payment-cancel"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold rounded-xl"
                    >
                      Wait, Back to Bill
                    </button>
                    <button
                      id="modal-payment-submit"
                      disabled={
                        (paymentMethod === 'Cash' && cashTendered < cartTotal) ||
                        (paymentMethod === 'Mobile Pay' && !isQrPaymentSimulatedSuccess)
                      }
                      onClick={processSale}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check className="size-4" /> Save & Log Payment File
                    </button>
                  </div>
                </div>
              ) : (
                /* Completed Receipt visual representation */
                <div className="p-6 space-y-6 flex flex-col items-center max-h-[85vh] overflow-y-auto">
                  <div className="size-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                    <Check className="size-7 stroke-[3]" />
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900">Checkout Ledger Settled!</h3>
                    <p className="text-xs text-slate-400">Transaction ID: <span className="font-mono">{completedTx.id}</span></p>
                  </div>

                  {/* Thermal Printer Settings Panel */}
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-sans">
                    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200/60 pb-2">
                      <Printer className="size-4 text-indigo-600 animate-pulse" />
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Thermal Print Configurator</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Roll Width</span>
                        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => setPaperSize('80mm')}
                            className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all ${
                              paperSize === '80mm'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            80mm Std
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaperSize('58mm')}
                            className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all ${
                              paperSize === '58mm'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            58mm Compact
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Store Header</span>
                        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => setIncludeHeaderLogo(true)}
                            className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all ${
                              includeHeaderLogo
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Show
                          </button>
                          <button
                            type="button"
                            onClick={() => setIncludeHeaderLogo(false)}
                            className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all ${
                              !includeHeaderLogo
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Include Footer Barcode</span>
                      <button
                        type="button"
                        onClick={() => setIncludeBarcode(!includeBarcode)}
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
                          includeBarcode
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {includeBarcode ? 'Include' : 'Exclude'}
                      </button>
                    </div>
                  </div>

                  {/* Vintage Receipt aesthetics - Printable targeting applied */}
                  <div 
                    id="receipt-container"
                    className={`receipt-printable w-full bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4 font-mono select-text selection:bg-indigo-200/50 shadow-inner flex flex-col transition-all mx-auto ${
                      paperSize === '58mm' ? 'max-w-[280px] text-[10px]' : 'max-w-[360px]'
                    }`}
                  >
                    {includeHeaderLogo && (
                      <div className="text-center border-b border-dashed border-slate-200 pb-3 space-y-1">
                        <div className="font-sans font-black text-slate-900 text-base tracking-widest uppercase">
                          DREMO CAFE & CO
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans tracking-tight leading-relaxed">
                          100 Hybrid Ledger Dr, POS City<br/>
                          TEL: (555) 0199-2810<br/>
                          --- ORIGINAL SALES RECEIPT ---
                        </div>
                      </div>
                    )}

                    <div className="text-center text-xs space-y-1.5 pb-2 border-b border-dashed border-slate-200 text-slate-500">
                      <p className="font-sans font-bold text-slate-800 text-xs tracking-wide">DREMO HYBRID POS SYSTEM</p>
                      <p className="text-[9px]">Excel Macro-Logs Sync Active</p>
                      <p className="text-[9px]">{new Date(completedTx.timestamp).toLocaleString()}</p>
                    </div>

                    {/* Receipt Items */}
                    <div className="text-[11px] space-y-2 text-slate-700 max-h-40 overflow-y-auto">
                      {completedTx.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-44 font-medium">{it.name} x{it.quantity}</span>
                          <span className="font-semibold">{CURRENCY_SYMBOL}{(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-600 space-y-1 bg-white/20 p-2.5 rounded-lg">
                      <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span>{CURRENCY_SYMBOL}{completedTx.subtotal.toFixed(2)}</span>
                      </div>
                      {completedTx.discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>DISCOUNT ({completedTx.discount}%)</span>
                          <span>-{CURRENCY_SYMBOL}{((completedTx.subtotal * completedTx.discount) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>TAX ({taxRate}%)</span>
                        <span>{CURRENCY_SYMBOL}{completedTx.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200/50 animate-pulse">
                        <span>TOTAL PAID</span>
                        <span>{CURRENCY_SYMBOL}{completedTx.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 border-t border-dashed border-slate-200 pt-2 space-y-1 text-slate-400 font-sans">
                      <p className="font-bold flex items-center justify-center gap-1.5"><Sparkles className="size-3 text-indigo-500" /> Live Excel Log Index: #{completedTx.excelRowIndex || 2}</p>
                      <p className="text-[8px] px-2 text-slate-400 leading-tight">Open VBA Module &rarr; Run &apos;RecordTransaction&apos; to write Excel</p>
                    </div>

                    {includeBarcode && (
                      <div className="text-center pt-3 border-t border-dashed border-slate-200 flex flex-col items-center">
                        <div className="h-6 w-full max-w-[160px] flex items-stretch gap-[1.5px] bg-white justify-center overflow-hidden">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-full bg-slate-950 ${
                                i % 3 === 0 ? 'w-[1px]' : i % 5 === 0 ? 'w-[3.5px]' : i % 7 === 0 ? 'w-[0.5px]' : 'w-[2px]'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-[8px] text-slate-400 tracking-wider mt-1">*{completedTx.id}*</span>
                      </div>
                    )}
                  </div>

                   {printError && (
                    <div className="w-full p-3.5 bg-amber-50 border border-amber-200 text-amber-850 rounded-xl text-xs space-y-1 font-sans animate-fade-in">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <Printer className="size-4 text-amber-600 animate-pulse shrink-0" />
                        <span>Print Service Notice</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-amber-700 font-medium">{printError}</p>
                    </div>
                  )}

                  <div className="w-full space-y-2.5 pt-1">
                    <button
                      id="thermal-print-trigger-btn"
                      onClick={handlePrint}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Printer className="size-4" /> Print Thermal Receipt (Ctrl+P)
                    </button>
                    
                    <button
                      id="receipt-close-btn"
                      onClick={handleCloseCheckout}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
                    >
                      Start New Register Transaction
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
