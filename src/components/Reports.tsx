import React, { useState, useMemo } from 'react';
import { Download, AlertCircle, MapPin, Calculator, PieChart, TrendingUp, FileText, Banknote, BarChart3, Lock, Eye, EyeOff } from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, getExpenseType, hasPermission } from '../utils/helpers';
import { LOCATIONS, PAYMENT_METHODS, ROLES } from '../utils/constants';
import { PaymentBreakdown, SensitiveValue } from './Shared';
import { analyzeFinancialReport } from '../services/gemini';
import Markdown from 'react-markdown';

export const Reports = ({ transactions, bankRecords, payrolls, currentUser }: any) => {
  const [reportTab, setReportTab] = useState('daily');
  const [dailyFilterLoc, setDailyFilterLoc] = useState('qiangang'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewByDisbursement, setViewByDisbursement] = useState(false); 
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false); 

  const [cashRegisterState, setCashRegisterState] = useState<any>({ qiangang: '', longdong: '' });
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
     const d = new Date();
     const day = d.getDay() || 7; 
     if(day !== 1) d.setHours(-24 * (day - 1));
     return d.toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [annualTax, setAnnualTax] = useState('');
  
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleExportReport = () => {
     let exportData: any[] = [];
     let filename = '';

     if (reportTab === 'daily') {
         exportData = dailyData;
         filename = `日帳務_${selectedDate}_${dailyFilterLoc}`;
     } else if (reportTab === 'weekly') {
         exportData = weeklyData;
         filename = `周帳務_${selectedWeekStart}`;
     } else if (reportTab === 'monthly') {
         exportData = monthlyData;
         filename = `月帳務_${selectedMonth}`;
     } else {
         exportData = yearlyData;
         filename = `年帳務_${selectedYear}`;
     }

     if (exportData.length === 0) {
         alert('當前區間無資料可匯出');
         return;
     }

     const headers = ['日期', '客戶/學員', '付款方式', '項目類別', '品項名稱', '金額', '手續費', '結帳人員/建立者', '地點'];
     
     const rows: any[] = [];
     exportData.forEach(t => {
         const baseRow = [
             formatDate(t.date),
             t.customer || t.beneficiary || '-',
             t.method === 'cash' ? '現金' : (t.method === 'transfer' ? '匯款' : 'Line Pay'),
             t.createdBy || '-',
             LOCATIONS.find(l => l.id === t.location)?.name || '-'
         ];

         if (t.details && t.details.length > 0) {
             t.details.forEach((d: any) => {
                 rows.push([
                     ...baseRow.slice(0, 3),
                     d.category, 
                     `"${(d.item || '').replace(/"/g, '""')}"`,
                     d.price, 
                     t.fee ? Math.round(d.price * 0.022) : 0, 
                     ...baseRow.slice(3) 
                 ]);
             });
         } else {
             rows.push([
                 ...baseRow.slice(0, 3),
                 t.category,
                 `"${(t.description || t.item || '').replace(/"/g, '""')}"`,
                 t.amount,
                 t.fee || 0,
                 ...baseRow.slice(3) 
             ]);
         }
     });

     const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
     const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.setAttribute('download', `iDiving_${filename}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const getPayrollExpense = (periodPrefix: string) => {
      if (!payrolls) return 0;
      return payrolls
        .filter((p: any) => p.month.startsWith(periodPrefix))
        .reduce((sum: number, p: any) => {
          const payableSalary = (p.baseSalary || 0) + (p.positionAllowance || 0) + (p.specialTask || 0) + (p.seniorityBonus || 0) + (p.teachingBonus || 0) + (p.leadingBonus || 0);
          return sum + payableSalary;
        }, 0);
  };

  const processFinancials = (data: any[], payrollExpense: number = 0) => {
      let income = 0;
      let cogs = 0;
      let opex = payrollExpense;
      let incomeByMethod: any = { cash: 0, transfer: 0, line_pay: 0 };
      const catBreakdown: any = {};
      
      if (payrollExpense > 0) {
          catBreakdown['員工支出'] = -payrollExpense;
      }

      data.forEach(t => {
          if (t.type === 'income') {
              income += t.amount;
              if(incomeByMethod[t.method] !== undefined) incomeByMethod[t.method] += t.amount;
              if (!catBreakdown[t.category]) catBreakdown[t.category] = 0;
              catBreakdown[t.category] += t.amount;
              
              if (t.fee) {
                  opex += t.fee;
                  if (!catBreakdown['金流手續費']) catBreakdown['金流手續費'] = 0;
                  catBreakdown['金流手續費'] -= t.fee;
              }
          }
              if (t.type === 'expense') {
              const expType = getExpenseType(t.category);
              if (expType === 'COGS') cogs += t.amount;
              else if (expType === 'OPEX') opex += t.amount;
              
              if (!catBreakdown[t.category]) catBreakdown[t.category] = 0;
              catBreakdown[t.category] -= t.amount;
          }
      });
      
      const grossProfit = income - cogs;
      const operatingIncome = grossProfit - opex;
      const grossMargin = income > 0 ? (grossProfit / income) : 0;

      return { income, cogs, opex, grossProfit, operatingIncome, grossMargin, incomeByMethod, catBreakdown };
  };
  
  const renderSimpleDashboard = (summary: any, titlePrefix: string) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
            <p className="text-slate-500 mb-2">{titlePrefix}總收入</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
            <p className="text-slate-500 mb-2">{titlePrefix}總支出</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.cogs + summary.opex)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
            <p className="text-slate-500 mb-2">{titlePrefix}淨利</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.income - (summary.cogs + summary.opex))}</p>
        </div>
    </div>
  );

  const dailyData = useMemo(() => transactions.filter((t: any) => {
        let txDate = t.date;
        if (viewByDisbursement && t.type === 'expense' && t.disbursementDate) txDate = t.disbursementDate;
        return txDate.startsWith(selectedDate) && (t.location === dailyFilterLoc || (!t.location && dailyFilterLoc==='qiangang'));
  }), [transactions, selectedDate, dailyFilterLoc, viewByDisbursement]);

  const dailySummary = useMemo(() => {
     const financials = processFinancials(dailyData, 0);
     let systemCash = 0;
     dailyData.forEach((t: any) => { if(t.type==='income' && t.method==='cash') systemCash += t.amount; });
     return { ...financials, systemCash };
  }, [dailyData]);
  
  const cashDiff = useMemo(() => {
      const actual = cashRegisterState[dailyFilterLoc];
      if (actual === '') return null;
      return parseInt(actual) - dailySummary.systemCash;
  }, [cashRegisterState, dailyFilterLoc, dailySummary.systemCash]);

  const weeklyData = useMemo(() => {
      const start = new Date(selectedWeekStart);
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
      return transactions.filter((t: any) => { const d = new Date(t.date); return d >= start && d <= end; });
  }, [transactions, selectedWeekStart]);

  const weeklySummary = useMemo(() => processFinancials(weeklyData, 0), [weeklyData]);

  const monthlyData = useMemo(() => transactions.filter((t: any) => t.date.startsWith(selectedMonth)), [transactions, selectedMonth]);
  const monthlySummary = useMemo(() => processFinancials(monthlyData, getPayrollExpense(selectedMonth)), [monthlyData, selectedMonth, payrolls]);

  const yearlyData = useMemo(() => transactions.filter((t: any) => t.date.startsWith(selectedYear)), [transactions, selectedYear]);
  const yearlySummary = useMemo(() => {
      const payrollExp = getPayrollExpense(selectedYear);
      const financials = processFinancials(yearlyData, payrollExp);
      const monthlyStats = Array(12).fill(0).map(() => ({ income: 0, expense: 0, net: 0 }));
      
      if (payrolls) {
          payrolls.forEach((p: any) => {
              if (p.month.startsWith(selectedYear)) {
                  const m = parseInt(p.month.split('-')[1], 10) - 1;
                  const payableSalary = (p.baseSalary || 0) + (p.positionAllowance || 0) + (p.specialTask || 0) + (p.seniorityBonus || 0) + (p.teachingBonus || 0) + (p.leadingBonus || 0);
                  monthlyStats[m].expense += payableSalary;
              }
          });
      }

      yearlyData.forEach((t: any) => {
          const m = new Date(t.date).getMonth();
          if(t.type === 'income') monthlyStats[m].income += t.amount;
          else monthlyStats[m].expense += t.amount;
          
          if(t.type === 'income' && t.fee) monthlyStats[m].expense += t.fee;
      });

      monthlyStats.forEach(stat => {
          stat.net = stat.income - stat.expense;
      });

      return { ...financials, monthlyStats };
  }, [yearlyData, selectedYear, payrolls]);

  const yearlyNetIncome = useMemo(() => {
      const tax = parseFloat(annualTax) || 0;
      return yearlySummary.operatingIncome - tax;
  }, [yearlySummary, annualTax]);

  const unmatchedBankDeposits = useMemo(() => {
     return bankRecords
       .filter((r: any) => !r.matchedTransactionId && r.amount > 0)
       .reduce((sum: number, r: any) => sum + r.amount, 0);
  }, [bankRecords]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      let dataToAnalyze;
      if (reportTab === 'daily') dataToAnalyze = dailySummary;
      else if (reportTab === 'weekly') dataToAnalyze = weeklySummary;
      else if (reportTab === 'monthly') dataToAnalyze = monthlySummary;
      else dataToAnalyze = yearlySummary;

      const analysis = await analyzeFinancialReport(dataToAnalyze);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("AI Analysis failed", error);
      setAiAnalysis("分析失敗，請檢查 API 金鑰設定或稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderFinancialDashboard = (summary: any) => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-sm font-bold mb-1">營業收入 (Revenue)</p>
                  <p className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(summary.income)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-sm font-bold mb-1">營業成本 (COGS)</p>
                  <p className="text-2xl font-bold text-red-500 font-mono">{formatCurrency(summary.cogs)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 size={48} className="text-blue-500"/></div>
                  <p className="text-blue-600 text-sm font-bold mb-1">毛利 (Gross Profit)</p>
                  <p className="text-2xl font-bold text-blue-700 font-mono">{formatCurrency(summary.grossProfit)}</p>
                  <p className="text-xs text-blue-400 mt-1 font-bold">毛利率: {formatPercent(summary.grossMargin)}</p>
              </div>
              <div className="bg-slate-800 p-5 rounded-xl shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setIsSensitiveVisible(!isSensitiveVisible)}>
                  <div className="absolute top-3 right-3 text-slate-500 group-hover:text-white transition-colors">
                      {isSensitiveVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </div>
                  <p className="text-slate-400 text-sm font-bold mb-1 flex items-center">
                      <Lock size={12} className="mr-1"/> 營業利益 (Operating Income)
                  </p>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                      <SensitiveValue value={summary.operatingIncome} isVisible={isSensitiveVisible} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">扣除營業費用 {formatCurrency(summary.opex)}</p>
              </div>
          </div>
          
          <PaymentBreakdown methods={summary.incomeByMethod} />
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
       <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-2 items-center justify-between">
         <div className="flex gap-2">
            {['daily', 'weekly', 'monthly', 'yearly'].map(tab => {
                 let minRoleForTab = ROLES.HELPER;
                 if (tab === 'weekly') minRoleForTab = ROLES.STAFF;
                 if (tab === 'monthly') minRoleForTab = ROLES.MANAGER;
                 if (tab === 'yearly') minRoleForTab = ROLES.ADMIN;

                 if (!hasPermission(currentUser.role, minRoleForTab)) return null;

                 return (
                     <button
                        key={tab}
                        onClick={() => { setReportTab(tab); setAiAnalysis(''); }}
                        className={`px-4 py-2 rounded-lg font-bold text-sm capitalize whitespace-nowrap transition-all ${
                            reportTab === tab 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                        }`}
                     >
                        {tab === 'daily' && '日帳務 (結帳)'}
                        {tab === 'weekly' && '周帳務'}
                        {tab === 'monthly' && '月帳務'}
                        {tab === 'yearly' && '年度總帳'}
                     </button>
                 );
             })}
         </div>
         
         <div className="flex gap-2">
           <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="flex items-center bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap disabled:opacity-50"
           >
              {isAnalyzing ? (
                <span className="animate-pulse">分析中...</span>
              ) : (
                <>✨ Gemini 智能分析</>
              )}
           </button>
           <button 
              onClick={handleExportReport}
              className="flex items-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap"
           >
              <Download size={16} className="mr-2"/> 匯出明細
           </button>
         </div>
      </div>
      
      {unmatchedBankDeposits > 0 && (
          <div className="mb-4 bg-orange-50 border border-orange-200 p-3 rounded-lg flex justify-between items-center text-orange-800 text-sm animate-pulse">
             <div className="flex items-center">
                <AlertCircle size={18} className="mr-2" />
                <span className="font-bold">注意：</span> 有 {formatCurrency(unmatchedBankDeposits)} 的銀行入帳尚未勾稽歸戶
             </div>
             <button className="text-orange-600 underline text-xs font-bold">前往勾稽</button>
          </div>
      )}

      <div className="flex-1 overflow-y-auto">
         {aiAnalysis && (
           <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
               ✨ Gemini 財務洞察
             </h3>
             <div className="text-slate-700 text-sm leading-relaxed markdown-body">
               <Markdown>{aiAnalysis}</Markdown>
             </div>
           </div>
         )}

         {reportTab === 'daily' && (
             <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                     <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        {LOCATIONS.map(loc => (
                             <button
                                key={loc.id}
                                onClick={() => setDailyFilterLoc(loc.id)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center ${
                                    dailyFilterLoc === loc.id
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                }`}
                             >
                                <MapPin size={16} className="mr-1" />
                                {loc.name}
                             </button>
                        ))}
                     </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 flex-1">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"/>
                         <label className="flex items-center cursor-pointer ml-auto mr-4">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={viewByDisbursement} onChange={(e) => setViewByDisbursement(e.target.checked)}/>
                                <div className={`block w-10 h-6 rounded-full transition-colors ${viewByDisbursement ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${viewByDisbursement ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <div className="ml-2 text-xs font-bold text-slate-600">{viewByDisbursement ? '依撥款日 (現金流)' : '依申請/發生日期'}</div>
                        </label>
                    </div>
                </div>

                {renderSimpleDashboard(dailySummary, `${LOCATIONS.find(l=>l.id===dailyFilterLoc)?.name} `)}
                
                <PaymentBreakdown methods={dailySummary.incomeByMethod} />

                <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold mb-4 flex items-center border-b border-slate-600 pb-3">
                        <Calculator className="mr-2" /> {LOCATIONS.find(l=>l.id===dailyFilterLoc)?.name} 現金結帳核對
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">系統應收現金 (僅收入)</p>
                            <p className="text-3xl font-mono font-bold">{formatCurrency(dailySummary.systemCash)}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1">櫃台實點現金</p>
                            <input type="number" value={cashRegisterState[dailyFilterLoc]} onChange={(e) => setCashRegisterState({...cashRegisterState, [dailyFilterLoc]: e.target.value})} className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white text-2xl font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="輸入金額" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1">結帳損益</p>
                            {cashDiff !== null && (
                                <p className={`text-3xl font-mono font-bold ${cashDiff === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {cashDiff > 0 ? '+' : ''}{formatCurrency(cashDiff)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                        <span>{LOCATIONS.find(l=>l.id===dailyFilterLoc)?.name} 當日交易明細</span>
                        {viewByDisbursement && <span className="text-xs text-blue-600">(依撥款日期顯示)</span>}
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3">客戶/學員</th>
                                <th className="p-3">付款方式</th>
                                <th className="p-3">項目類別</th>
                                <th className="p-3">品項名稱</th>
                                <th className="p-3 text-right">金額</th>
                                <th className="p-3 text-right">手續費</th>
                                <th className="p-3 text-right">實收</th>
                                <th className="p-3">結帳人員</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dailyData.map((t: any) => {
                                if (t.details && t.details.length > 0) {
                                    return t.details.map((item: any, idx: number) => (
                                        <tr key={`${t.id}-${idx}`}>
                                            <td className="p-3 font-bold text-slate-700">{idx === 0 ? (t.customer || t.beneficiary || '-') : ''}</td>
                                            <td className="p-3">
                                                {idx === 0 && (
                                                    <span className={`px-2 py-1 rounded text-xs font-medium 
                                                        ${t.method === 'cash' ? 'bg-emerald-100 text-emerald-700' : 
                                                          t.method === 'transfer' ? 'bg-blue-100 text-blue-700' : 
                                                          'bg-green-100 text-green-700'}`}>
                                                        {PAYMENT_METHODS.find(m => m.id === t.method)?.name || t.method}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600">{item.category}</td>
                                            <td className="p-3 text-slate-600">{item.item}</td>
                                            <td className="p-3 text-right font-mono font-bold">{formatCurrency(item.price)}</td>
                                            <td className="p-3 text-right font-mono text-slate-400 text-xs">
                                                {t.fee && idx === 0 ? formatCurrency(t.fee) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-blue-600">
                                                 {idx === 0 && t.fee ? formatCurrency(t.amount - t.fee) : (idx === 0 ? formatCurrency(t.amount) : '-')}
                                            </td>
                                            <td className="p-3 text-xs text-slate-500">{idx === 0 ? t.createdBy : ''}</td>
                                        </tr>
                                    ));
                                } else {
                                    return (
                                        <tr key={t.id}>
                                            <td className="p-3 font-bold text-slate-700">{t.customer || t.beneficiary || '-'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium 
                                                    ${t.method === 'cash' ? 'bg-emerald-100 text-emerald-700' : 
                                                      t.method === 'transfer' ? 'bg-blue-100 text-blue-700' : 
                                                      'bg-green-100 text-green-700'}`}>
                                                    {PAYMENT_METHODS.find(m => m.id === t.method)?.name || t.method}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600">{t.category}</td>
                                            <td className="p-3 text-slate-600">{t.description || t.item}</td>
                                            <td className="p-3 text-right font-mono font-bold">{formatCurrency(t.amount)}</td>
                                            <td className="p-3 text-right font-mono text-slate-400 text-xs">
                                                {t.fee ? formatCurrency(t.fee) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-blue-600">
                                                {t.fee ? formatCurrency(t.amount - t.fee) : formatCurrency(t.amount)}
                                            </td>
                                            <td className="p-3 text-xs text-slate-500">{t.createdBy}</td>
                                        </tr>
                                    );
                                }
                            })}
                            {dailyData.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-400">本日無交易</td></tr>}
                        </tbody>
                    </table>
                </div>
             </div>
         )}

         {reportTab === 'weekly' && (
             <div className="flex flex-col gap-6">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-500">選擇週次</label>
                    <input type="date" value={selectedWeekStart} onChange={(e) => setSelectedWeekStart(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"/>
                 </div>
                 {renderSimpleDashboard(weeklySummary, '本週')}
                 <PaymentBreakdown methods={weeklySummary.incomeByMethod} />
             </div>
         )}

         {reportTab === 'monthly' && (
             <div className="flex flex-col gap-6">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-500">選擇月份</label>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"/>
                 </div>
                 {renderSimpleDashboard(monthlySummary, '本月')}
                 <PaymentBreakdown methods={monthlySummary.incomeByMethod} />
                 
                 <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center"><PieChart className="mr-2"/> 部門損益分析</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(monthlySummary.catBreakdown).map(([cat, amount]: any) => (
                            <div key={cat} className="p-4 border rounded-lg bg-slate-50 flex flex-col justify-between h-24">
                                <p className="text-xs text-slate-500 font-bold mb-1">{cat}</p>
                                <p className={`font-mono font-bold text-lg ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(amount)}
                                </p>
                                <div className={`h-1 w-full rounded-full mt-2 ${amount >=0 ? 'bg-green-200' : 'bg-red-200'}`}>
                                    <div className={`h-1 rounded-full ${amount >=0 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: '60%'}}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
         )}

         {reportTab === 'yearly' && (
             <div className="flex flex-col gap-6">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-500">選擇年份</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold">
                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
                 {renderFinancialDashboard(yearlySummary)}

                 <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center"><TrendingUp className="mr-2"/> 年度月份趨勢</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">月份</th><th className="p-2 text-right">收入</th><th className="p-2 text-right">支出</th><th className="p-2 text-right">淨利</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {yearlySummary.monthlyStats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 font-bold text-slate-600">{idx + 1} 月</td>
                                        <td className="p-2 text-right font-mono text-green-600">{formatCurrency(stat.income)}</td>
                                        <td className="p-2 text-right font-mono text-red-600">{formatCurrency(stat.expense)}</td>
                                        <td className="p-2 text-right font-mono text-blue-600 font-bold">{formatCurrency(stat.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center">
                        <FileText className="mr-2 text-emerald-400"/> 年度損益結算 (Income Statement)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <p className="text-slate-400 text-xs font-bold mb-2">營業利益 (Operating Income)</p>
                            <div className="flex justify-between items-end">
                                <p className="text-2xl font-mono font-bold text-white">
                                    {formatCurrency(yearlySummary.operatingIncome)}
                                </p>
                                <span className="text-[10px] text-slate-500">系統自動計算</span>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <label className="text-slate-400 text-xs font-bold mb-2 flex items-center">
                                減：預估稅金 (Tax)
                                <span className="ml-2 text-[10px] bg-slate-600 px-1.5 py-0.5 rounded text-emerald-300">請手動填寫</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                <input 
                                    type="number" 
                                    value={annualTax} 
                                    onChange={(e) => setAnnualTax(e.target.value)} 
                                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-500/50 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-20"><Banknote size={40} className="text-emerald-400"/></div>
                            <p className="text-emerald-400 text-xs font-bold mb-2">稅後淨利 (Net Income)</p>
                            <p className="text-3xl font-mono font-bold text-white">
                                {formatCurrency(yearlyNetIncome)}
                            </p>
                            <p className="text-[10px] text-emerald-400/80 mt-1">
                               稅後純益率: {yearlySummary.income > 0 ? formatPercent(yearlyNetIncome / yearlySummary.income) : '0.0%'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
         )}

      </div>
    </div>
  );
};
