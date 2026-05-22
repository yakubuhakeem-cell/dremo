import React, { useState } from 'react';
import { Product, CURRENCY_SYMBOL } from '../types';
import { Plus, Edit3, Trash2, ArrowUpRight, TrendingUp, AlertTriangle, PackageCheck, ShieldAlert, Sparkles, Download, FileSpreadsheet, Tag, Settings, Edit, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryViewProps {
  products: Product[];
  categories: string[];
  addCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (categoryName: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateStock: (productId: string, newStock: number) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  onExportInventoryCSV: () => void;
}

export default function InventoryView({
  products,
  categories,
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateStock,
  updateProduct,
  deleteProduct,
  onExportInventoryCSV
}: InventoryViewProps) {
  // Modal controllers
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states map
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [stock, setStock] = useState(1);
  const [minStock, setMinStock] = useState(5);
  const [category, setCategory] = useState('Cafe');

  // New Custom Category state definitions
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Category Manager Drawer Modal State
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');

  // Inline adjust state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [adjustStockVal, setAdjustStockVal] = useState<number>(0);
  const [justUpdatedProductId, setJustUpdatedProductId] = useState<string | null>(null);

  // Stats calculate
  const totalUniqueSkus = products.length;
  const lowStockThresholdCount = products.filter(p => p.stock <= p.minStock).length;
  const totalStockVolume = products.reduce((acc, p) => acc + p.stock, 0);
  const inventoryValueDollars = products.reduce((acc, p) => acc + (p.stock * p.price), 0);

  const handleStartAddProduct = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setPrice(0);
    setCost(0);
    setStock(1);
    setMinStock(5);
    setCategory(categories[0] || 'Cafe');
    setIsNewCategoryMode(false);
    setCustomCategoryName('');
    setIsOpen(true);
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setPrice(p.price);
    setCost(p.cost);
    setStock(p.stock);
    setMinStock(p.minStock);
    if (categories.includes(p.category)) {
      setCategory(p.category);
      setIsNewCategoryMode(false);
      setCustomCategoryName('');
    } else {
      setCategory('custom_new');
      setIsNewCategoryMode(true);
      setCustomCategoryName(p.category);
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || price <= 0 || cost <= 0) return;

    let finalCategory = category;
    if (isNewCategoryMode || category === 'custom_new') {
      finalCategory = customCategoryName.trim();
      if (!finalCategory) {
        alert("Please specify a custom category name.");
        return;
      }
      addCategory(finalCategory);
    }

    // Dynamic visual gradient selector
    let color = 'from-indigo-600 to-violet-800';
    if (finalCategory === 'Cafe') color = 'from-amber-700 to-amber-900';
    else if (finalCategory === 'Goods') color = 'from-emerald-600 to-teal-800';
    else if (finalCategory === 'Workspace') color = 'from-blue-600 to-cyan-800';
    else {
      const colors = [
        'from-purple-600 to-fuchsia-800',
        'from-pink-600 to-rose-800',
        'from-rose-600 to-orange-700',
        'from-cyan-600 to-teal-800',
        'from-teal-600 to-emerald-800',
        'from-neutral-600 to-neutral-800',
        'from-blue-600 to-violet-800',
        'from-violet-600 to-fuchsia-800'
      ];
      const hash = finalCategory.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      color = colors[hash % colors.length];
    }

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        sku: sku.toUpperCase(),
        name,
        price,
        cost,
        stock,
        minStock,
        category: finalCategory,
        color
      });
    } else {
      addProduct({
        sku: sku.toUpperCase(),
        name,
        price,
        cost,
        stock,
        minStock,
        category: finalCategory,
        color
      });
    }

    // Reset Form
    setSku('');
    setName('');
    setPrice(0);
    setCost(0);
    setStock(1);
    setMinStock(5);
    setCategory(categories[0] || 'Cafe');
    setIsNewCategoryMode(false);
    setCustomCategoryName('');
    setEditingProduct(null);
    setIsOpen(false);
  };

  const handleEditQuickStock = (p: Product) => {
    setEditingProductId(p.id);
    setAdjustStockVal(p.stock);
  };

  const handleSaveStockAdjust = (pid: string) => {
    updateStock(pid, adjustStockVal);
    setJustUpdatedProductId(pid);
    setTimeout(() => {
      setJustUpdatedProductId(null);
    }, 2000);
    setEditingProductId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 h-full select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Desk & SKUs</h2>
          <p className="text-xs text-slate-500">Manage products, pricing indexes, and view automated reorder warning bounds.</p>
        </div>
        <div className="flex gap-2">
          <button
            id="export-inventory-csv-btn"
            onClick={onExportInventoryCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="size-4" /> Export CSV Sheet
          </button>
          <button
            id="manage-categories-modal-trigger"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-100 shadow-sm flex items-center gap-2 cursor-pointer transition-all animate-none"
          >
            <Tag className="size-4" /> Manage Categories
          </button>
          <button
            id="add-product-modal-trigger"
            onClick={handleStartAddProduct}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="size-4" /> Add New SKU
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Registered SKUs', value: totalUniqueSkus, icon: PackageCheck, color: 'text-indigo-600', sub: 'Active inventory catalog' },
          { title: 'Low Stock Warnings', value: lowStockThresholdCount, icon: ShieldAlert, color: lowStockThresholdCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400', sub: 'Urgent restock needed', warning: lowStockThresholdCount > 0 },
          { title: 'Total In-Stock Units', value: totalStockVolume, icon: TrendingUp, color: 'text-emerald-600', sub: 'Aggregate volume in warehouse' },
          { title: 'Est. Warehouse Valuation', value: `${CURRENCY_SYMBOL}${inventoryValueDollars.toFixed(2)}`, icon: ArrowUpRight, color: 'text-slate-900 font-mono', sub: 'Market value (Units * Price)' },
        ].map((item, id) => {
          const Icon = item.icon;
          return (
            <div key={id} className={`bg-white rounded-2xl border p-4.5 shadow-sm flex items-start justify-between ${
              item.warning ? 'border-rose-200 bg-rose-50/50' : 'border-slate-150'
            }`}>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{item.title}</span>
                <h3 className={`text-2xl font-extrabold ${item.color}`}>{item.value}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{item.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${item.warning ? 'bg-rose-100/50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                <Icon className="size-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mb-20">
        <div className="p-4 bg-slate-50/60 border-b border-slate-150 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Product Stocks Master Table</h3>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Sparkles className="size-3 text-indigo-500" /> Structure optimized for VBA 'ScanLowStockAlerts' macro execution
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/30 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-150">
                <th className="p-4 w-28">SKU Code</th>
                <th className="p-4">Product details</th>
                <th className="p-4 w-28">Category</th>
                <th className="p-4 w-24 text-right">Cost Price</th>
                <th className="p-4 w-24 text-right">Sell Price</th>
                <th className="p-4 w-32 text-right">Margin / Profit</th>
                <th className="p-4 w-44">In-Stock Progress</th>
                <th className="p-4 w-40 text-right">Operating Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const markup = p.price - p.cost;
                const marginPercent = p.price > 0 ? (markup / p.price) * 100 : 0;
                const outOfStock = p.stock <= 0;
                const lowStock = p.stock > 0 && p.stock <= p.minStock;
                const isRecentlyUpdated = p.id === justUpdatedProductId;
                
                // Color bands
                const progressColor = outOfStock ? 'bg-rose-500' : lowStock ? 'bg-amber-500 animate-pulse' : 'bg-indigo-600';
                const progressBg = outOfStock ? 'bg-rose-100' : lowStock ? 'bg-amber-100' : 'bg-slate-150';

                return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${
                    isRecentlyUpdated ? 'animate-stock-flash' :
                    outOfStock ? 'bg-rose-50/20' : lowStock ? 'bg-amber-50/10' : ''
                  }`}>
                    {/* SKU */}
                    <td className="p-4 font-mono font-bold text-slate-600 tracking-wide">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 uppercase">{p.sku}</span>
                    </td>
                    
                    {/* DETAILS */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm leading-tight">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                        Safety thresh: {p.minStock} units
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">{p.category}</span>
                    </td>

                    {/* COST */}
                    <td className="p-4 text-right font-mono text-slate-500">
                      {CURRENCY_SYMBOL}{p.cost.toFixed(2)}
                    </td>

                    {/* PRICE */}
                    <td className="p-4 text-right font-mono font-semibold text-slate-800">
                      {CURRENCY_SYMBOL}{p.price.toFixed(2)}
                    </td>

                    {/* MARKUP MARGIN */}
                    <td className="p-4 text-right">
                      <div className="font-mono text-slate-800 font-semibold">+{CURRENCY_SYMBOL}{markup.toFixed(2)}</div>
                      <div className="text-[10px] text-teal-600 font-bold font-mono">{marginPercent.toFixed(0)}% Margin</div>
                    </td>

                    {/* STOCK SLIDER BAR */}
                    <td className="p-4">
                      {editingProductId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={adjustStockVal}
                            onChange={(e) => setAdjustStockVal(parseInt(e.target.value) || 0)}
                            className="w-16 p-1 text-center font-mono font-bold bg-white border border-indigo-300 rounded focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveStockAdjust(p.id)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5" onClick={() => handleEditQuickStock(p)}>
                          <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                            <span className={outOfStock ? 'text-rose-600' : lowStock ? 'text-amber-600' : 'text-slate-600'}>
                              {p.stock} units
                            </span>
                            <span className="text-slate-300">Max cap: 150</span>
                          </div>
                          <div className={`w-full h-2 rounded-full ${progressBg} overflow-hidden cursor-pointer`}>
                            <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(100, (p.stock / 150) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* CONTROLS */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEditProduct(p)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit product parameters & category"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuickStock(p)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Quick update stock values"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-600 transition-colors"
                          title="Delete from stock database"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit SKU Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 flex flex-col pt-6 font-sans text-slate-800"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Configure Existing SKU Parameters' : 'Register New Stock SKU'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Define your barcode tags, pricing indices, safety counts and cost structure.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAF-ESP-12"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategory(val);
                      if (val === 'custom_new') {
                        setIsNewCategoryMode(true);
                      } else {
                        setIsNewCategoryMode(false);
                      }
                    }}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="custom_new" className="text-indigo-600 font-bold">+ Create Custom...</option>
                  </select>
                </div>
              </div>

              {isNewCategoryMode && (
                <div className="bg-indigo-50/55 p-3 rounded-xl border border-indigo-100/80 flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase text-indigo-700 font-mono tracking-wider">New Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beverages, Merch, Services"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-540 font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Product Title Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Matcha Latte Sachet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cost Price ({CURRENCY_SYMBOL})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Cost"
                    value={cost || ''}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Selling Price ({CURRENCY_SYMBOL})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Sell"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Min Alert Limit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action Clusters */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-transform shadow-md"
                >
                  {editingProduct ? 'Save Parameters' : 'Save to Datatable'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 flex flex-col pt-6 font-sans text-slate-800"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Tag className="size-4 text-indigo-600" /> Category Control Panel
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Add, edit, or remove catalog categories. This updates active products in real time.</p>
              </div>
              <button 
                onClick={() => setIsCategoryManagerOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-450 hover:text-slate-700 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Part 1: Add Category Form */}
            <div className="p-3 bg-indigo-50/20 border border-indigo-100/60 rounded-2xl space-y-2">
              <label className="text-[10px] font-bold uppercase text-indigo-700 font-mono tracking-wider block">Add New Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Beverages, Baked Goods, Tech"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
                <button
                  onClick={() => {
                    if (!newCatInput.trim()) return;
                    addCategory(newCatInput);
                    setNewCatInput('');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Part 2: Active Categories Listing */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Existing Categories list</span>
              
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {categories.map((cat) => {
                  const productsCount = products.filter(p => p.category === cat).length;
                  const isRenaming = editingCatOldName === cat;

                  return (
                    <div key={cat} className="flex items-center justify-between p-3 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-all">
                      {isRenaming ? (
                        <div className="flex-1 flex gap-2 items-center mr-2">
                          <input
                            type="text"
                            value={editingCatNewName}
                            onChange={(e) => setEditingCatNewName(e.target.value)}
                            className="flex-1 p-1 bg-slate-50 border border-indigo-250 rounded text-xs font-semibold"
                          />
                          <button
                            onClick={() => {
                              if (!editingCatNewName.trim()) return;
                              updateCategory(cat, editingCatNewName);
                              setEditingCatOldName(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save renamed value"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            onClick={() => setEditingCatOldName(null)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Cancel rename"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{cat}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{productsCount} products assigned</span>
                        </div>
                      )}

                      {!isRenaming && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCatOldName(cat);
                              setEditingCatNewName(cat);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Rename Category"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (productsCount > 0) {
                                if (!confirm(`Are you sure? Removing "${cat}" will recategorize ${productsCount} products into "Uncategorized"!`)) {
                                  return;
                                }
                              }
                              deleteCategory(cat);
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-600 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Close block */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer"
              >
                Close Control Panel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
