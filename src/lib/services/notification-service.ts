// src/lib/services/notification-service.ts

import type { CashFlowPrediction } from '@/types/analytics';

export interface BalanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
  predictedBalance: number;
  dismissed: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'dkrispy_balance_alerts';
const DISMISSED_KEY = 'dkrispy_dismissed_alerts';

// Cek prediksi dan generate alert
export function analyzePredictions(predictions: CashFlowPrediction[]): BalanceAlert[] {
  const alerts: BalanceAlert[] = [];
  const dismissed = getDismissedAlerts();
  
  predictions.forEach((pred, index) => {
    const balance = pred.predicted_balance;
    const date = pred.prediction_date;
    
    // Critical: Saldo negatif
    if (balance < 0) {
      const alertId = `critical-${date}`;
      if (!dismissed.includes(alertId)) {
        alerts.push({
          id: alertId,
          type: 'critical',
          title: 'Saldo Negatif Terdeteksi!',
          message: `Pada ${formatDate(date)}, saldo Anda diprediksi ${formatCurrency(balance)}. Segera kurangi pengeluaran.`,
          date,
          predictedBalance: balance,
          dismissed: false,
          createdAt: new Date().toISOString()
        });
      }
    }
    // Warning: Saldo sangat rendah (< 1 juta)
    else if (balance < 1_000_000 && balance >= 0) {
      const alertId = `warning-${date}`;
      if (!dismissed.includes(alertId)) {
        alerts.push({
          id: alertId,
          type: 'warning',
          title: 'Saldo Rendah',
          message: `Pada ${formatDate(date)}, saldo diprediksi hanya ${formatCurrency(balance)}.`,
          date,
          predictedBalance: balance,
          dismissed: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  });
  
  return alerts;
}

// Get alerts dari localStorage
export function getStoredAlerts(): BalanceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save alerts ke localStorage
export function storeAlerts(alerts: BalanceAlert[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.error('Failed to store alerts:', error);
  }
}

// Dismiss alert
export function dismissAlert(alertId: string) {
  if (typeof window === 'undefined') return;
  try {
    const dismissed = getDismissedAlerts();
    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      // Simpan hanya 100 alert terakhir untuk hemat storage
      const recent = dismissed.slice(-100);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(recent));
    }
  } catch (error) {
    console.error('Failed to dismiss alert:', error);
  }
}

function getDismissedAlerts(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Request permission untuk Web Push (opsional)
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Send browser notification (untuk Web Push)
export function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  
  if (Notification.permission !== 'granted') {
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: tag || 'dkrispy-alert',
      requireInteraction: true,
      data: {
        url: '/analytics',
        timestamp: Date.now()
      }
    });
    
    notification.onclick = () => {
      window.focus();
      window.location.href = '/analytics';
      notification.close();
    };
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Helpers
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}