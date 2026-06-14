'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { Asset, Liability } from '@/types/analytics';

interface AssetsManagerProps {
  userId: string;
  type: 'assets' | 'liabilities';
}

export default function AssetsManager({ userId, type }: AssetsManagerProps) {
  const supabase = createClient();
  const [items, setItems] = useState<(Asset | Liability)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Asset | Liability | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // ✅ FIX 1: Cast data dari Supabase ke union type kita
      setItems((data as unknown as (Asset | Liability)[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type, userId]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"?`)) return;

    try {
      const { error } = await supabase.from(type).delete().eq('id', id);
      if (error) throw error;
      
      setItems(items.filter(item => item.id !== id));
      toast.success(`${name} berhasil dihapus`);
    } catch (error) {
      toast.error('Gagal menghapus data');
    }
  };

  const handleSave = async (data: Record<string, any>) => {
    try {
      if (editingItem) {
        // ✅ FIX: Cast ke 'any' untuk bypass strict checking pada dynamic table
        const { error } = await (supabase.from(type) as any)
          .update(data)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        toast.success('Data berhasil diupdate');
      } else {
        // ✅ FIX: Cast ke 'any' untuk bypass strict checking pada dynamic table
        const { error } = await (supabase.from(type) as any)
          .insert({ ...data, user_id: userId });
        
        if (error) throw error;
        toast.success('Data berhasil ditambahkan');
      }

      await loadData();
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Gagal menyimpan data');
    }
  };

  const title = type === 'assets' ? 'Kelola Aset' : 'Kelola Kewajiban';
  const IconComponent = type === 'assets' ? Wallet : CreditCard;
  const accentColor = type === 'assets' ? 'emerald' : 'rose';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/analytics"
          className="p-2.5 rounded-xl bg-[#151E32] border border-white/[0.06] hover:bg-[#1E293B] transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-[#F1F5F9]" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "p-3 rounded-2xl border",
            type === 'assets' 
              ? 'bg-emerald-500/20 border-emerald-400/30'
              : 'bg-rose-500/20 border-rose-400/30'
          )}>
            <IconComponent className={cn("w-6 h-6", type === 'assets' ? 'text-emerald-400' : 'text-rose-400')} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">{title}</h1>
            <p className="text-xs text-[#64748B]">{items.length} item terdaftar</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
            type === 'assets'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20'
          )}
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#151E32] border border-white/[0.06] flex items-center justify-center mb-4">
            <IconComponent className="w-8 h-8 text-[#475569]" />
          </div>
          <p className="text-[#64748B] mb-2">Belum ada {type === 'assets' ? 'aset' : 'kewajiban'}</p>
          <p className="text-xs text-[#475569] mb-4">Belum ada aset? Klik &quot;Tambah Aset&quot; untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl p-4 border border-white/[0.06] bg-[#151E32]/80 backdrop-blur-xl hover:bg-[#1E293B]/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg",
                      type === 'assets'
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/30'
                    )}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#F1F5F9] truncate">{item.name}</p>
                      <p className="text-xs text-[#64748B] capitalize">{item.type}</p>
                      {'interest_rate' in item && item.interest_rate && (
                        <p className="text-xs text-amber-400 mt-0.5">Bunga: {item.interest_rate}%</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <p className={cn(
                      "font-bold tabular-nums",
                      type === 'assets' ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {formatCurrency(type === 'assets' ? (item as Asset).current_value : (item as Liability).current_balance)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-[#64748B] hover:text-[#F1F5F9]" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-[#64748B] hover:text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ItemForm
            type={type}
            item={editingItem}
            onSave={handleSave}
            onClose={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form Component ───────────────────────────────────────────────────────────
function ItemForm({ type, item, onSave, onClose }: {
  type: 'assets' | 'liabilities';
  item: Asset | Liability | null;
  onSave: (data: Record<string, any>) => void;
  onClose: () => void;
}) {
  // ✅ FIX 2: Pisahkan state form agar tidak konflik dengan union type yang ketat
  const [name, setName] = useState(item?.name || '');
  const [itemType, setItemType] = useState<string>(item?.type || (type === 'assets' ? 'savings' : 'loan'));
  const [currentValue, setCurrentValue] = useState(type === 'assets' ? (item as Asset)?.current_value || 0 : 0);
  const [currentBalance, setCurrentBalance] = useState(type === 'liabilities' ? (item as Liability)?.current_balance || 0 : 0);
  const [interestRate, setInterestRate] = useState(type === 'liabilities' ? (item as Liability)?.interest_rate || 0 : 0);
  const [description, setDescription] = useState(item?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ FIX 3: Bangun object data secara dinamis, TS tidak akan komplain
    const data: Record<string, any> = {
      name,
      type: itemType,
      description: description || null,
    };

    if (type === 'assets') {
      data.current_value = Number(currentValue);
    } else {
      data.current_balance = Number(currentBalance);
      data.interest_rate = Number(interestRate) || null;
    }

    onSave(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md rounded-3xl border border-white/[0.06] bg-[#0B1120] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-6">
          {item ? 'Edit' : 'Tambah'} {type === 'assets' ? 'Aset' : 'Kewajiban'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">
              Nama
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder={type === 'assets' ? 'Tabungan BCA' : 'KPR Rumah'}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">
              Tipe
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {type === 'assets' ? (
                <>
                  <option value="savings">Tabungan</option>
                  <option value="investment">Investasi</option>
                  <option value="property">Properti</option>
                  <option value="vehicle">Kendaraan</option>
                  <option value="other">Lainnya</option>
                </>
              ) : (
                <>
                  <option value="mortgage">KPR/Mortgage</option>
                  <option value="credit_card">Kartu Kredit</option>
                  <option value="loan">Pinjaman</option>
                  <option value="installment">Cicilan</option>
                  <option value="other">Lainnya</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">
              {type === 'assets' ? 'Nilai Saat Ini (Rp)' : 'Saldo Saat Ini (Rp)'}
            </label>
            <input
              type="number"
              value={type === 'assets' ? currentValue : currentBalance}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (type === 'assets') setCurrentValue(val);
                else setCurrentBalance(val);
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="0"
              required
            />
          </div>

          {type === 'liabilities' && (
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">
                Suku Bunga (% per tahun)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="0"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">
              Deskripsi (Opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              rows={3}
              placeholder="Catatan tambahan..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#94A3B8] font-semibold hover:bg-white/[0.08] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className={cn(
                "flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all",
                type === 'assets'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40'
              )}
            >
              {item ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}