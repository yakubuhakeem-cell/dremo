import React, { useState } from 'react';
import { Transaction, Product, CURRENCY_SYMBOL } from '../types';
import { DollarSign, Wallet, ShoppingBag, TrendingUp, HelpCircle, Eye, RefreshCw, Layers, FileSpreadsheet, ArrowDownWideNarrow, CreditCard, Clock, Smartphone } from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  onExportTransactionsCSV: () => void;
}

export default function AnalyticsView({ transactions, products, onExportTransactionsCSV }: AnalyticsViewProps) {
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  // Financial compilation
  const grossSales = transactions.reduce((sum, tx) => sum + tx.total, 0);
  
  // Calculate COGS (Cost of sold products)
  const totalCogs = transactions.reduce((acc, tx) => {
    return acc + tx.items.reduce((itemAcc, item) => {
      const match = products.find(p => p.id === item.productId);
      const itemCost = match ? match.cost : 0;
      return itemAcc + (itemCost * item.quantity);
    }, 0);
  }, 0);

  const netMargins = grossSales - totalCogs;
  const marginPercent = grossSales > 0 ? (netMargins / grossSales) * 100 : 0;
  const checksCount = transactions.length;

  // Breakdown of terminals
  const paymentMethodStats = transactions.reduce(
    (acc, tx) => {
      acc[tx.paymentMethod] = (acc[tx.paymentMethod] || 0) + tx.total;
      return acc;
    },
    { Cash: 0, Card: 0, 'Mobile Pay': 0, 'Split Payment': 0 } as Record<Transaction['paymentMethod'], number>
  );

  // Custom SVG line chart coordinates generator
  const getLineCoordinates = () => {
    if (transactions.length === 0) return '';
    const points = transactions.map((tx, idx) => {
      const x = (idx / Math.max(1, transactions.length - 1)) * 340 + 30; // 30px label padding horizontal
      // Map total value to height (140 max y height, 20 padding top)
      const maxVal = Math.max(...transactions.map(t => t.total), 50);
      const y = 140 - (tx.total / maxVal) * 100;
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 h-full select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dremo Intelligence</h2>
          <p className="text-xs text-slate-500">Live cashier sales logs, cash drawers totals, and gross profit aggregates.</p>
        </div>
        <button
          id="export-sales-csv-btn"
          onClick={onExportTransactionsCSV}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
        >
          <FileSpreadsheet className="size-4" /> Export Sales Workbook CSV
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Gross Accumulative Sales', value: `${CURRENCY_SYMBOL}${grossSales.toFixed(2)}`, icon: Wallet, color: 'text-indigo-600', sub: 'Total transaction revenues' },
          { title: 'Cost of Goods (COGS)', value: `${CURRENCY_SYMBOL}${totalCogs.toFixed(2)}`, icon: Layers, color: 'text-slate-500', sub: 'Calculated SKU production cost' },
          { title: 'Operating Profit', value: `${CURRENCY_SYMBOL}${netMargins.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600', sub: `Healthy ${marginPercent.toFixed(0)}% gross margin` },
          { title: 'Sales Ticket Checks', value: checksCount, icon: ShoppingBag, color: 'text-slate-800', sub: 'Cumulative closed checks' }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="bg-white rounded-2xl border border-slate-150 p-4.5 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{item.title}</span>
                <h3 className="text-2xl font-extrabold text-slate-900">{item.value}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{item.sub}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                <Icon className="size-4.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Timeline Graph (SVG) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Timeline Transaction Flow</h3>
            <p className="text-[11px] text-slate-400">Sequence progression of gross ticket amounts.</p>
          </div>

          {transactions.length === 0 ? (
            <div className="height-48 flex items-center justify-center text-slate-400 text-xs font-medium">
              Awaiting checkout operations to draw graphs.
            </div>
          ) : (
            <div className="h-44 relative bg-slate-50 rounded-xl border border-slate-100 p-2 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 400 160">
                {/* Y grids */}
                <line x1="30" y1="20" x2="380" y2="20" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="30" y1="70" x2="380" y2="70" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="30" y1="120" x2="380" y2="120" stroke="#f1f5f9" strokeDasharray="4" />
                
                {/* SVG Curve Line */}
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  points={getLineCoordinates()}
                />
                
                {/* Highlight circles on ticks */}
                {transactions.map((tx, idx) => {
                  const maxVal = Math.max(...transactions.map(t => t.total), 55);
                  const cx = (idx / Math.max(1, transactions.length - 1)) * 340 + 30;
                  const cy = 140 - (tx.total / maxVal) * 100;
                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r="4"
                      className="fill-indigo-600 stroke-white stroke-[2] cursor-pointer hover:r-6 hover:fill-amber-500 transition-all"
                      title={`Tx: ${tx.id} - ${CURRENCY_SYMBOL}${tx.total.toFixed(2)}`}
                      onClick={() => setSelectedTxDetail(tx)}
                    />
                  );
                })}
              </svg>
              <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[9px] font-bold font-mono text-slate-400">
                <span>First sale line</span>
                <span>Active checkpoint</span>
                <span>Last compiled ticket</span>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Right Sidebar: Metrics and Activities */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Payment Processor Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Payments Terminal Distribution</h3>
              <p className="text-[11px] text-slate-400">Breakdown aggregate by terminal processors.</p>
            </div>

            <div className="space-y-3.5 mt-4">
              {[
                { label: 'Physical Cash Drawer', amount: paymentMethodStats.Cash, color: 'bg-emerald-500', pct: grossSales > 0 ? (paymentMethodStats.Cash / grossSales) * 100 : 0 },
                { label: 'Card Swipes', amount: paymentMethodStats.Card, color: 'bg-indigo-500', pct: grossSales > 0 ? (paymentMethodStats.Card / grossSales) * 100 : 0 },
                { label: 'Mobile Wallets', amount: paymentMethodStats['Mobile Pay'], color: 'bg-amber-500', pct: grossSales > 0 ? (paymentMethodStats['Mobile Pay'] / grossSales) * 100 : 0 },
                { label: 'Split Payments', amount: paymentMethodStats['Split Payment'], color: 'bg-violet-500', pct: grossSales > 0 ? (paymentMethodStats['Split Payment'] / grossSales) * 100 : 0 }
              ].map((method, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                    <span className="text-slate-500 flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${method.color}`} /> {method.label}</span>
                    <span className="text-slate-800">{CURRENCY_SYMBOL}{method.amount.toFixed(2)} ({method.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${method.color}`} style={{ width: `${method.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Panel for Customer Service Inquiries */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Recent Customer Activity</h3>
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md">Last 5</span>
              </div>
              <p className="text-[11px] text-slate-400">Quick-checkout logs for lookup & instant receipt inquiries.</p>
            </div>

            <div className="space-y-2.5">
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-sans leading-relaxed border border-dashed border-slate-150 rounded-xl">
                  No active sales records logged yet.
                </div>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        tx.paymentMethod === 'Cash' ? 'bg-emerald-50 text-emerald-600' :
                        tx.paymentMethod === 'Card' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {tx.paymentMethod === 'Cash' ? (
                          <DollarSign className="size-3.5" />
                        ) : tx.paymentMethod === 'Card' ? (
                          <CreditCard className="size-3.5" />
                        ) : (
                          <Smartphone className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 font-mono tracking-tight">{tx.id}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-sans font-medium">
                            <Clock className="size-2.5 text-slate-300" />
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans truncate max-w-[130px] leading-tight mt-0.5">
                          {tx.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-xs font-bold font-mono text-slate-900 pr-1">
                        {CURRENCY_SYMBOL}{tx.total.toFixed(2)}
                      </div>
                      <button
                        id={`sidemenu-view-tx-${tx.id}`}
                        onClick={() => setSelectedTxDetail(tx)}
                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-sans text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Quick View Check"
                      >
                        <Eye className="size-3 text-slate-500 font-bold" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Logs */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mb-20">
        <div className="p-4 bg-slate-50/60 border-b border-slate-150">
          <h3 className="text-sm font-bold text-slate-800">Closed Transaction Ledger</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">No checked transactions registered</p>
            <p className="text-xs text-slate-400 mt-1">Sales tickers registered via Cashier Register will display details sequentially here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50/30 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-150">
                  <th className="p-4 w-36">Timestamp</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4 w-28 text-right">Cart Total</th>
                  <th className="p-4 w-32 text-center">Payment System</th>
                  <th className="p-4 w-32 text-center">XL Row Log</th>
                  <th className="p-4 w-24 text-right">Verify Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-slate-500 leading-none">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono">
                      <span className="font-bold text-slate-900">{tx.id}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{tx.items.length} dynamic items compiled</div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                      {CURRENCY_SYMBOL}{tx.total.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                        tx.paymentMethod === 'Card' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-500">
                      #{tx.excelRowIndex || 2}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        id={`btn-view-tx-${tx.id}`}
                        onClick={() => setSelectedTxDetail(tx)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <Eye className="size-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Transaction Modal View */}
      {selectedTxDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 font-mono text-xs text-slate-700">
            <div className="text-center space-y-2 border-b border-dashed border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-950 font-sans uppercase">Tender Audit Receipt</h3>
              <p className="text-[10px] text-slate-400">Invoice ID: {selectedTxDetail.id}</p>
              <p className="text-[10px] text-slate-400">{new Date(selectedTxDetail.timestamp).toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block">Purchased Details</span>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                {selectedTxDetail.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.name} x{it.quantity}</span>
                    <span>{CURRENCY_SYMBOL}{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{CURRENCY_SYMBOL}{selectedTxDetail.subtotal.toFixed(2)}</span>
              </div>
              {selectedTxDetail.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>DISCOUNT ({selectedTxDetail.discount}%)</span>
                  <span>-{CURRENCY_SYMBOL}{((selectedTxDetail.subtotal * selectedTxDetail.discount) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TAX ({selectedTxDetail.tax}%)</span>
                <span>{CURRENCY_SYMBOL}{selectedTxDetail.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200/50">
                <span>TOTAL AMOUNT</span>
                <span>{CURRENCY_SYMBOL}{selectedTxDetail.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 space-y-1 text-center font-sans">
              <p>Terminal Clerk: {selectedTxDetail.cashierName}</p>
              <p className="font-semibold text-indigo-600 font-mono">Row Index in Sales_Log Workbook: Row #{selectedTxDetail.excelRowIndex || 2}</p>
            </div>

            <button
              id="details-close-btn"
              onClick={() => setSelectedTxDetail(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-sans font-bold uppercase transition-colors"
            >
              Close Receipt Dialogue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
