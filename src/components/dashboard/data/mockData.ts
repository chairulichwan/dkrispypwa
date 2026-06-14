//src/components/dashboard/data/mockData.ts
// Mock data untuk CashFlowForecast component
// Nanti bisa diganti dengan data real dari Supabase

export interface CashFlowDataPoint {
  month: string;
  pemasukan: number;
  pengeluaran: number;
  tabungan: number;
  forecast?: boolean;
}

export interface ExpenseCategory {
  icon: string;
  name: string;
  amount: number;
  pct: number;
  color: string;
}

export interface SavingsGoal {
  icon: string;
  name: string;
  current: number;
  target: number;
  color: string;
}

// Data arus kas 6 bulan terakhir + 3 bulan prediksi
export const cashFlowData: CashFlowDataPoint[] = [
  { month: 'Jan', pemasukan: 8500000, pengeluaran: 6200000, tabungan: 2300000, forecast: false },
  { month: 'Feb', pemasukan: 8500000, pengeluaran: 5800000, tabungan: 2700000, forecast: false },
  { month: 'Mar', pemasukan: 9000000, pengeluaran: 6500000, tabungan: 2500000, forecast: false },
  { month: 'Apr', pemasukan: 8800000, pengeluaran: 6100000, tabungan: 2700000, forecast: false },
  { month: 'Mei', pemasukan: 9200000, pengeluaran: 6400000, tabungan: 2800000, forecast: false },
  { month: 'Jun', pemasukan: 9500000, pengeluaran: 6700000, tabungan: 2800000, forecast: false },
  // Prediksi 3 bulan ke depan
  { month: 'Jul', pemasukan: 9500000, pengeluaran: 6800000, tabungan: 2700000, forecast: true },
  { month: 'Agu', pemasukan: 9500000, pengeluaran: 6900000, tabungan: 2600000, forecast: true },
  { month: 'Sep', pemasukan: 9500000, pengeluaran: 7000000, tabungan: 2500000, forecast: true },
];

// Kategori pengeluaran bulan ini
export const expenseCategories: ExpenseCategory[] = [
  { icon: '🍔', name: 'Makanan & Minuman', amount: 2350000, pct: 35, color: '#f97316' },
  { icon: '🚗', name: 'Transportasi', amount: 1200000, pct: 18, color: '#3b82f6' },
  { icon: '🛒', name: 'Belanja', amount: 950000, pct: 14, color: '#8b5cf6' },
  { icon: '🎮', name: 'Hiburan', amount: 680000, pct: 10, color: '#ec4899' },
  { icon: '💡', name: 'Tagihan & Utilitas', amount: 850000, pct: 13, color: '#06b6d4' },
  { icon: '📚', name: 'Pendidikan', amount: 420000, pct: 6, color: '#10b981' },
  { icon: '🏥', name: 'Kesehatan', amount: 280000, pct: 4, color: '#ef4444' },
];

// Target tabungan
export const savingsGoals: SavingsGoal[] = [
  { icon: '🏠', name: 'Dana Darurat', current: 15000000, target: 30000000, color: '#06b6d4' },
  { icon: '✈️', name: 'Liburan ke Jepang', current: 8500000, target: 25000000, color: '#8b5cf6' },
  { icon: '💻', name: 'Laptop Baru', current: 12000000, target: 15000000, color: '#10b981' },
  { icon: '🚗', name: 'DP Mobil', current: 25000000, target: 100000000, color: '#f97316' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NET WORTH TRACKER DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface NetWorthHistoryPoint {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface BreakdownItem {
  icon: string;
  name: string;
  value: number;
  color: string;
}

// Riwayat kekayaan bersih 12 bulan terakhir
export const netWorthHistory: NetWorthHistoryPoint[] = [
  { month: 'Jan', assets: 85000000, liabilities: 25000000, netWorth: 60000000 },
  { month: 'Feb', assets: 88000000, liabilities: 24500000, netWorth: 63500000 },
  { month: 'Mar', assets: 92000000, liabilities: 24000000, netWorth: 68000000 },
  { month: 'Apr', assets: 95000000, liabilities: 23500000, netWorth: 71500000 },
  { month: 'Mei', assets: 98000000, liabilities: 23000000, netWorth: 75000000 },
  { month: 'Jun', assets: 102000000, liabilities: 22500000, netWorth: 79500000 },
  { month: 'Jul', assets: 105000000, liabilities: 22000000, netWorth: 83000000 },
  { month: 'Agu', assets: 108000000, liabilities: 21500000, netWorth: 86500000 },
  { month: 'Sep', assets: 112000000, liabilities: 21000000, netWorth: 91000000 },
  { month: 'Okt', assets: 115000000, liabilities: 20500000, netWorth: 94500000 },
  { month: 'Nov', assets: 118000000, liabilities: 20000000, netWorth: 98000000 },
  { month: 'Des', assets: 122000000, liabilities: 19500000, netWorth: 102500000 },
];

// Breakdown aset
export const assetBreakdown: BreakdownItem[] = [
  { icon: '🏠', name: 'Properti', value: 500000000, color: '#3b82f6' },
  { icon: '💰', name: 'Tabungan', value: 45000000, color: '#22d3ee' },
  { icon: '📈', name: 'Investasi', value: 35000000, color: '#8b5cf6' },
  { icon: '🚗', name: 'Kendaraan', value: 25000000, color: '#f97316' },
  { icon: '🥇', name: 'Emas', value: 15000000, color: '#eab308' },
  { icon: '💎', name: 'Lainnya', value: 7000000, color: '#64748b' },
];

// Breakdown kewajiban
export const liabilityBreakdown: BreakdownItem[] = [
  { icon: '🏦', name: 'KPR Rumah', value: 250000000, color: '#ef4444' },
  { icon: '🚗', name: 'Kredit Mobil', value: 45000000, color: '#f97316' },
  { icon: '💳', name: 'Kartu Kredit', value: 8500000, color: '#ec4899' },
  { icon: '👥', name: 'Pinjaman Pribadi', value: 5000000, color: '#8b5cf6' },
  { icon: '📋', name: 'Cicilan Lainnya', value: 3500000, color: '#64748b' },
];