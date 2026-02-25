export const ROLES = {
  HELPER: { id: 'helper', name: '小幫手', level: 1, label: '小幫手' },
  STAFF: { id: 'staff', name: '員工', level: 2, label: '員工' },
  STORE_MANAGER: { id: 'store_manager', name: '店長', level: 3, label: '店長' },
  MANAGER: { id: 'manager', name: '經理', level: 4, label: '經理' },
  ADMIN: { id: 'admin', name: '管理員', level: 5, label: '管理員' },
  CREATOR: { id: 'creator', name: '製作者', level: 99, label: '製作者' }
};

export const TABS = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  EXPENSES: 'expenses', 
  BANK_IMPORT: 'bank_import',
  BANK: 'bank', 
  REPORTS: 'reports',
  PAYROLL: 'payroll',
  ADMIN_PAGE: 'admin_page'
};

export const LOCATIONS = [
  { id: 'qiangang', name: '前港店' },
  { id: 'longdong', name: '龍洞店' }
];

export const PAYMENT_METHODS = [
  { id: 'cash', name: '現金' },
  { id: 'transfer', name: '銀行匯款' },
  { id: 'line_pay', name: 'Line Pay' },
];

export const BANK_ACCOUNTS = [
  { id: 'ctbc', name: '中國信託' },
  { id: 'fubon', name: '台北富邦' },
  { id: 'esun', name: '玉山銀行' }
];

export const STAFF_MEMBERS = ['阿甘', '東陸', '黃上', '伊暉', '晨柔', '彥儒', '潘潘', '家輝'];

export const INCOME_CATEGORIES = ['教學', '銷售', '東北角活動', '龍洞', '國內團', '國外團', '特殊', '待確認']; 

export const EXPENSE_CATEGORIES = [
  '龍洞支出', '教學支出', 'FD幹部支出', '幹部支出', '銷售支出', '東北角支出', 
  '國內團支出', '國外團支出', '車輛支出', '維修保養支出', '水電瓦斯支出', 
  '廣告支出', '員工支出', '代收代付', '稅金', '保險支出', '學員退款', '金流手續費' 
];

export const COGS_CATEGORIES = [
  '龍洞支出', '教學支出', '東北角支出', '國內團支出', '國外團支出', 
  '代收代付', '保險支出', '學員退款' 
];

export const OPEX_CATEGORIES = [
  'FD幹部支出', '幹部支出', '銷售支出', '車輛支出', '維修保養支出', 
  '水電瓦斯支出', '廣告支出', '員工支出', '稅金', '金流手續費'
];

export const POS_SHORTCUTS: Record<string, {name: string, price: number | string}[]> = {
  '教學': [
    { name: 'OW定金', price: 3000 },
    { name: 'FD定金', price: 3000 },
    { name: 'OW尾款', price: '' }, 
    { name: 'FD尾款', price: '' }, 
    { name: '專長定金', price: 3000 },
    { name: '專長尾款', price: '' }, 
  ],
  '東北角活動': [
    { name: '套裝(會)', price: 2000 },
    { name: '套裝(非會)', price: 2300 },
    { name: 'NV', price: -50 },
    { name: 'MD', price: -100 },
  ],
  '龍洞': [
    { name: '泡麵', price: 60 },
    { name: '住宿(假)', price: 900 },
    { name: '住宿(平)', price: 800 },
    { name: '課住宿(假)', price: 750 },
    { name: '課住宿(平)', price: 650 },
    { name: '車資來回', price: 300 },
    { name: '幹部/教練', price: '' }, 
    { name: '誠實箱', price: '' }, 
  ],
  '國內團': [
    { name: '定金', price: 5000 },
    { name: '尾款', price: '' }, 
  ],
  '國外團': [
    { name: '定金', price: 20000 },
    { name: '尾款', price: '' }, 
  ],
  '特殊': [
    { name: '4F房租', price: 6000 },
  ]
};
