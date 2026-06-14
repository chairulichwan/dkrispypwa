// src/lib/utils/pdf-generator.ts


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import type { NetWorthSnapshot, Asset, Liability, CashFlowPrediction } from '@/types/analytics';

// ✅ Type alias untuk warna RGB - tuple dengan panjang pasti 3
type RGB = [number, number, number];

interface NetWorthReportData {
  userName: string;
  currentNetWorth: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  assets: Asset[];
  liabilities: Liability[];
  history: NetWorthSnapshot[];
  generatedAt: Date;
}

interface CashFlowReportData {
  userName: string;
  predictions: CashFlowPrediction[];
  insights: {
    lowestBalance: number;
    trend: number;
    averageConfidence: number;
    hasNegativeDay: boolean;
    negativeDate?: string;
  };
  generatedAt: Date;
}

// ✅ Warna didefinisikan dengan type RGB - mutable tapi tetap tuple
const COLORS = {
  primary: [6, 182, 212] as RGB,      // cyan-500
  success: [16, 185, 129] as RGB,     // emerald-500
  danger: [239, 68, 68] as RGB,       // red-500
  warning: [245, 158, 11] as RGB,     // amber-500
  purple: [139, 92, 246] as RGB,      // violet-500
  dark: [11, 17, 32] as RGB,          // #0B1120
  darkCard: [21, 30, 50] as RGB,      // #151E32
  textLight: [241, 245, 249] as RGB,  // #F1F5F9
  textMuted: [100, 116, 139] as RGB,  // #64748B
  border: [30, 41, 59] as RGB,        // #1E293B
  white: [255, 255, 255] as RGB,
  lightGray: [248, 250, 252] as RGB,
  darkText: [30, 41, 59] as RGB,      // #1E293B
  altRow: [248, 250, 252] as RGB,     // #F8FAFC
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function addHeader(doc: jsPDF, title: string, userName: string) {
  // Background gelap
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 40, 210, 1, 'F');
  
  // Title
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  
  // Subtitle
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Laporan untuk: ${userName}`, 14, 28);
  
  // Date
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Dibuat: ${dateStr}`, 14, 34);
  
  // Logo/branding
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DKRISPY', 196, 20, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Premium Analytics', 196, 26, { align: 'right' });
  
  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, 196, pageHeight - 15);
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `DKRISPY Premium Analytics • Halaman ${pageNum} dari ${totalPages}`,
    14,
    pageHeight - 10
  );
  doc.text(
    `Dokumen ini digenerate otomatis pada ${new Date().toLocaleString('id-ID')}`,
    196,
    pageHeight - 10,
    { align: 'right' }
  );
}

function addSummaryCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  value: string,
  accentColor: RGB  // ✅ Menggunakan type RGB
) {
  doc.setFillColor(...COLORS.darkCard);
  doc.roundedRect(x, y, width, 25, 2, 2, 'F');
  
  doc.setFillColor(...accentColor);
  doc.rect(x, y, width, 1, 'F');
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), x + 4, y + 8);
  
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 4, y + 18);
}

// ============================================
// NET WORTH REPORT
// ============================================
export function generateNetWorthReport(data: NetWorthReportData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  let yPos = 50;

  addHeader(doc, 'Laporan Kekayaan Bersih', data.userName);

  // Summary Cards
  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  addSummaryCard(doc, margin, yPos, cardWidth, 'Kekayaan Bersih', formatCurrency(data.currentNetWorth.netWorth), COLORS.primary);
  addSummaryCard(doc, margin + cardWidth + 4, yPos, cardWidth, 'Total Aset', formatCurrency(data.currentNetWorth.totalAssets), COLORS.success);
  addSummaryCard(doc, margin + (cardWidth + 4) * 2, yPos, cardWidth, 'Total Kewajiban', formatCurrency(data.currentNetWorth.totalLiabilities), COLORS.danger);

  yPos += 35;

  // Assets Table
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Daftar Aset', margin, yPos);
  yPos += 6;

  if (data.assets.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Nama Aset', 'Tipe', 'Nilai']],
      body: data.assets.map(a => [
        a.name,
        a.type.charAt(0).toUpperCase() + a.type.slice(1),
        formatCurrency(a.current_value)
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.darkCard,
        textColor: COLORS.primary,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: COLORS.white,
        textColor: COLORS.darkText,
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: COLORS.altRow,
      },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(9);
    doc.text('Belum ada aset terdaftar', margin, yPos);
    yPos += 10;
  }

  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // Liabilities Table
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Daftar Kewajiban', margin, yPos);
  yPos += 6;

  if (data.liabilities.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Nama Kewajiban', 'Tipe', 'Saldo', 'Bunga']],
      body: data.liabilities.map(l => [
        l.name,
        l.type.charAt(0).toUpperCase() + l.type.slice(1),
        formatCurrency(l.current_balance),
        l.interest_rate ? `${l.interest_rate}%` : '-'
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.darkCard,
        textColor: COLORS.danger,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: COLORS.white,
        textColor: COLORS.darkText,
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: COLORS.altRow,
      },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(9);
    doc.text('Belum ada kewajiban terdaftar', margin, yPos);
    yPos += 10;
  }

  // History Table
  if (data.history.length > 0 && yPos < 220) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...COLORS.textLight);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Kekayaan Bersih', margin, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Tanggal', 'Aset', 'Kewajiban', 'Kekayaan Bersih']],
      body: data.history.slice(-12).map(h => [
        new Date(h.snapshot_date).toLocaleDateString('id-ID', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        }),
        formatCurrency(h.total_assets),
        formatCurrency(h.total_liabilities),
        formatCurrency(h.net_worth)
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.darkCard,
        textColor: COLORS.primary,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: COLORS.white,
        textColor: COLORS.darkText,
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: COLORS.altRow,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
}

// ============================================
// CASH FLOW REPORT
// ============================================
export function generateCashFlowReport(data: CashFlowReportData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  let yPos = 50;

  addHeader(doc, 'Prediksi Arus Kas 30 Hari', data.userName);

  // Warning banner
  if (data.insights.hasNegativeDay) {
    doc.setFillColor(...COLORS.danger);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 15, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠️ PERINGATAN: Saldo diprediksi negatif!', margin + 4, yPos + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Pada tanggal ${data.insights.negativeDate || '-'}, saldo Anda diprediksi minus. Segera evaluasi pengeluaran.`,
      margin + 4,
      yPos + 11
    );
    yPos += 22;
  }

  // Summary cards
  const cardWidth = (pageWidth - margin * 2 - 4) / 2;
  addSummaryCard(
    doc,
    margin,
    yPos,
    cardWidth,
    'Tren 30 Hari',
    (data.insights.trend >= 0 ? '+' : '') + formatCurrency(data.insights.trend),
    data.insights.trend >= 0 ? COLORS.success : COLORS.warning
  );
  addSummaryCard(
    doc,
    margin + cardWidth + 4,
    yPos,
    cardWidth,
    'Akurasi Prediksi',
    `${(data.insights.averageConfidence * 100).toFixed(0)}%`,
    COLORS.purple
  );
  yPos += 35;

  // Predictions table
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detail Prediksi Harian', margin, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['Tanggal', 'Saldo Prediksi', 'Pemasukan', 'Pengeluaran', 'Akurasi']],
    body: data.predictions.map(p => [
      new Date(p.prediction_date).toLocaleDateString('id-ID', {
        weekday: 'short', day: 'numeric', month: 'short'
      }),
      formatCurrency(p.predicted_balance),
      formatCurrency(p.predicted_income),
      formatCurrency(p.predicted_expense),
      `${(p.confidence_score * 100).toFixed(0)}%`
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.darkCard,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: COLORS.white,
      textColor: COLORS.darkText,
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.altRow,
    },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
   didParseCell: function(dataCell) {
  if (dataCell.section === 'body' && dataCell.column.index === 1) {
    const value = dataCell.cell.raw as string;
    if (value.includes('-')) {
      dataCell.cell.styles.textColor = COLORS.danger; // ✅ Benar
      dataCell.cell.styles.fontStyle = 'bold';        // ✅ Benar
    }
  }
}
  });

  // Disclaimer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < 260) {
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, 20, 2, 2, 'F');
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Disclaimer: Prediksi ini berdasarkan pola historis transaksi Anda dan bersifat estimasi.',
      margin + 4,
      finalY + 7
    );
    doc.text(
      'Hasil aktual dapat berbeda tergantung pada transaksi di masa depan.',
      margin + 4,
      finalY + 13
    );
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
}

// Helper function to download
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}