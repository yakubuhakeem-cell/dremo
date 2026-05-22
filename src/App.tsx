import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RegisterView from './components/RegisterView';
import InventoryView from './components/InventoryView';
import AnalyticsView from './components/AnalyticsView';
import MacroView from './components/MacroView';
import { INITIAL_PRODUCTS, MACRO_PRESETS } from './data';
import { Product, CartItem, Transaction } from './types';

// In-memory fallback if localStorage is sandboxed/disabled in preview iframe
const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage read access blocked or failed:", e);
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage write access blocked or failed:", e);
      memoryStorage[key] = value;
    }
  }
};

export default function App() {
  const [currentView, setView] = useState<string>('register');
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const local = safeStorage.getItem('dremo_products');
      return local ? JSON.parse(local) : INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Failed to parse products from storage:", e);
      return INITIAL_PRODUCTS;
    }
  });
  
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const local = safeStorage.getItem('dremo_categories');
      return local ? JSON.parse(local) : ['Cafe', 'Workspace', 'Goods'];
    } catch (e) {
      console.error("Failed to parse categories from storage:", e);
      return ['Cafe', 'Workspace', 'Goods'];
    }
  });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const local = safeStorage.getItem('dremo_transactions');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      console.error("Failed to parse transactions from storage:", e);
      return [];
    }
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Sync to local storage for realistic persistence
  useEffect(() => {
    try {
      safeStorage.setItem('dremo_products', JSON.stringify(products));
    } catch (e) {
      console.warn("Failed to set products in storage:", e);
    }
  }, [products]);

  useEffect(() => {
    try {
      safeStorage.setItem('dremo_categories', JSON.stringify(categories));
    } catch (e) {
      console.warn("Failed to set categories in storage:", e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      safeStorage.setItem('dremo_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.warn("Failed to set transactions in storage:", e);
    }
  }, [transactions]);

  // Operations: Category actions
  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  };

  const updateCategory = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!oldName || !trimmedNew || oldName === trimmedNew) return;
    setCategories(prev => prev.map(c => c === oldName ? trimmedNew : c));
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmedNew } : p));
    setCart(prev => prev.map(item => item.product.category === oldName ? { ...item, product: { ...item.product, category: trimmedNew } } : item));
  };

  const deleteCategory = (categoryName: string) => {
    setCategories(prev => prev.filter(c => c !== categoryName));
    setProducts(prev => prev.map(p => p.category === categoryName ? { ...p, category: 'Uncategorized' } : p));
    setCart(prev => prev.map(item => item.product.category === categoryName ? { ...item, product: { ...item.product, category: 'Uncategorized' } } : item));
  };

  // Operations: Cart actions
  const addToCart = (product: Product) => {
    // Check stock availability
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Ensure we don't buy more than in stock
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Temp subtract stock visually while item is in cart
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, stock: p.stock - 1 } : p))
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const matchCartItem = cart.find(item => item.product.id === productId);
    if (!matchCartItem) return;

    const diff = quantity - matchCartItem.quantity;
    const matchProduct = products.find(p => p.id === productId);

    if (!matchProduct && diff > 0) return;
    // Check absolute stock limit when increasing
    if (diff > 0 && matchProduct && matchProduct.stock < diff) return;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: p.stock - diff } : p))
    );
  };

  const removeFromCart = (productId: string) => {
    const matchCartItem = cart.find(item => item.product.id === productId);
    if (!matchCartItem) return;

    // Return stock back to inventory
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, stock: p.stock + matchCartItem.quantity } : p
      )
    );

    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    // Return stock of all items back to catalog
    setProducts(prev => {
      let updated = [...prev];
      cart.forEach(item => {
        updated = updated.map(p =>
          p.id === item.product.id ? { ...p, stock: p.stock + item.quantity } : p
        );
      });
      return updated;
    });
    setCart([]);
  };

  const checkout = (
    paymentMethod: Transaction['paymentMethod'],
    discount: number,
    taxRate: number,
    cashTendered?: number
  ): Transaction | null => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const discountAmount = (subtotal * discount) / 100;
    const taxable = subtotal - discountAmount;
    const tax = (taxable * taxRate) / 100;
    const total = taxable + tax;

    // VBA Incremental layout row
    const nextRowIndex = transactions.length + 2; // Rows 1 is headers config

    const newTx: Transaction = {
      id: `DRM-${Date.now().toString().slice(-6)}`,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      timestamp: new Date().toISOString(),
      cashierName: 'Yakubu Hakeem',
      excelRowIndex: nextRowIndex
    };

    setTransactions(prev => [newTx, ...prev]);
    setCart([]); // Clear cart (products stock updated previously during add to cart)
    
    // Smooth layout syncing alert feedback
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1200);

    return newTx;
  };

  // Inventory master modifiers
  const addProduct = (newP: Omit<Product, 'id'>) => {
    const pid = `p-${Date.now()}`;
    setProducts(prev => [...prev, { ...newP, id: pid }]);
  };

  const updateStock = (productId: string, newStock: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
    );
  };

  const updateProduct = (updatedP: Product) => {
    setProducts(prev => prev.map(p => (p.id === updatedP.id ? updatedP : p)));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleForceRecalcSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1500);
  };

  // CSV Exporters to easily copy-paste into Excel tables
  const exportTransactionsCSV = () => {
    if (transactions.length === 0) {
      alert("Awaiting transactions to write sales spreadsheets.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header corresponding to RecordTransaction vba input
    csvContent += "Timestamp,Transaction ID,Subtotal,Tax,Discount,Total Revenue,Payment Method,Excel Row Index\r\n";

    transactions.forEach(tx => {
      const row = [
        tx.timestamp,
        tx.id,
        tx.subtotal.toFixed(2),
        tx.tax.toFixed(2),
        tx.discount,
        tx.total.toFixed(2),
        tx.paymentMethod,
        tx.excelRowIndex || 2
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dremo_pos_sales_workbook_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Product Name,Category,Cost Price,Sell Price,Current Stock,Min Safety Stock\r\n";

    products.forEach(p => {
      const row = [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.cost.toFixed(2),
        p.price.toFixed(2),
        p.stock,
        p.minStock
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dremo_pos_inventory_workbook_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 font-sans antialiased text-slate-800">
      
      {/* Drawer Sidebar Control Rail */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        syncStatus={syncStatus}
        onForceSync={handleForceRecalcSync}
        txCount={transactions.length}
      />

      {/* Main Container Portal */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-l-3xl shadow-2xl relative">
        {currentView === 'register' && (
          <RegisterView
            products={products}
            categories={categories}
            cart={cart}
            addToCart={addToCart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            checkout={checkout}
          />
        )}

        {currentView === 'inventory' && (
          <InventoryView
            products={products}
            categories={categories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            addProduct={addProduct}
            updateStock={updateStock}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
            onExportInventoryCSV={exportInventoryCSV}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            transactions={transactions}
            products={products}
            onExportTransactionsCSV={exportTransactionsCSV}
          />
        )}

        {currentView === 'macros' && (
          <MacroView
            presets={MACRO_PRESETS}
          />
        )}
      </main>
    </div>
  );
}
