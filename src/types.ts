export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  color: string; // Tailwind background color key for aesthetic visuals
}

export const CURRENCY_SYMBOL = 'GH₵';
export const CURRENCY_CODE = 'GHS';


export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Mobile Pay' | 'Split Payment';
  timestamp: string;
  cashierName: string;
  excelRowIndex?: number; // Simulated row index if exported to Excel logs
}

export interface MacroPreset {
  id: string;
  title: string;
  description: string;
  category: 'inventory' | 'sales' | 'reports' | 'utility';
  code: string;
  instructions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  vbaCode?: string; // If model generated a code, store it separately for full rendering
}
