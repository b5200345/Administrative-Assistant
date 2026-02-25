import { COGS_CATEGORIES, OPEX_CATEGORIES } from './constants';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

export const formatDateTime = (isoString: string) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

export const formatDate = (isoString: string) => {
  return formatDateTime(isoString);
};

export const hasPermission = (userRole: any, requiredRole: any) => {
  if (!userRole || typeof userRole.level === 'undefined') return false;
  return userRole.level >= requiredRole.level;
};

export const getExpenseType = (category: string) => {
  if (COGS_CATEGORIES.includes(category)) return 'COGS'; 
  if (OPEX_CATEGORIES.includes(category)) return 'OPEX'; 
  return 'OTHER';
};

export const smartCategorize = (categoryStr: string) => {
  if (!categoryStr) return '待確認';
  const text = categoryStr.trim();
  if (text.includes('俱樂部')) return '東北角活動';
  if (text.includes('教學')) return '教學';
  if (text.includes('東北角收入')) return '龍洞'; 
  if (text.includes('銷售')) return '銷售';
  return '待確認';
};
