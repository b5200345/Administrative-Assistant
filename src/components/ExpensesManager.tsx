import React, { useState, useMemo } from 'react';
import { Plus, Download, Clock, CheckSquare, Filter, Banknote, CreditCard, Trash2, Check, CheckCircle2, ArrowRight, Wallet, Building2, MapPin, FileText } from 'lucide-react';
import { generateId, formatDate, formatDateTime, formatCurrency, hasPermission } from '../utils/helpers';
import { EXPENSE_CATEGORIES, STAFF_MEMBERS, ROLES, LOCATIONS } from '../utils/constants';
import { ConfirmModal, DisburseModal } from './Shared';

export const ExpensesManager = ({ transactions, onAddTransaction, onBatchDisburse, onDelete, currentUser }: any) => {
  const [subTab, setSubTab] = useState('list');
  const [type, setType] = useState('reimbursement');
  const [form, setForm] = useState({
    beneficiary: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0],
    bankAccount: '',
    applicant: '',
    payoutMethod: 'transfer',
    location: 'qiangang' 
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [itemsToDisburse, setItemsToDisburse] = useState<any[]>([]);
  const [pendingFilters, setPendingFilters] = useState({ date: '', beneficiary: '', category: '', payoutMethod: '' });
  const [historyFilters, setHistoryFilters] = useState({ date: '', beneficiary: '', category: '', payoutMethod: '' });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onAddTransaction({
      id: generateId(),
      date: new Date(form.date).toISOString(),
      type: 'expense',
      subType: type,
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
      beneficiary: form.beneficiary, 
      applicant: type === 'reimbursement' ? form.beneficiary : form.applicant,
      bankAccount: form.bankAccount,
      payoutMethod: type === 'invoice' ? 'transfer' : 'cash',
      status: 'pending_approval',
      reconciled: false,
      createdBy: currentUser ? currentUser.name : '前港店員工',
      location: form.location
    });
    setForm({ ...form, amount: '', description: '', beneficiary: '', bankAccount: '', applicant: '', payoutMethod: 'transfer' });
    setSubTab('list');
  };

  const handleExportAnnualReport = () => {
    const currentYear = new Date().getFullYear();
    const annualData = transactions.filter((t: any) => 
      t.type === 'expense' && 
      (t.status === 'pending_reconciliation' || t.status === 'completed') &&
      new Date(t.date).getFullYear() === currentYear
    );

    if (annualData.length === 0) {
      alert('本年度尚無已撥款紀錄可匯出'); 
      return;
    }

    const headers = ['申請日期', '撥款日期', '申請人', '對象/廠商', '類別', '金額', '撥款方式', '匯出帳號(末5碼)', '狀態', '說明', '匯入帳號(廠商)'];
    
    const rows = annualData.map((t: any) => [
      formatDate(t.date),
      t.disbursementDate ? formatDateTime(t.disbursementDate) : '-',
      t.applicant || t.createdBy,
      t.beneficiary,
      t.category,
      t.amount,
      t.payoutMethod === 'cash' ? '現金' : '匯款',
      t.outgoingAccountLast5 ? `\t${t.outgoingAccountLast5}` : '-', 
      t.reconciled ? '已完成' : '已撥款(待勾稽)',
      `"${(t.description || '').replace(/"/g, '""')}"`, 
      t.bankAccount ? `\t${t.bankAccount}` : '' 
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `iDiving_費用明細_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredData = (items: any[], filters: any) => {
    return items.filter(item => {
      const matchDate = !filters.date || item.date.startsWith(filters.date);
      const matchBen = !filters.beneficiary || 
                       (item.beneficiary && item.beneficiary.includes(filters.beneficiary)) ||
                       (item.applicant && item.applicant.includes(filters.beneficiary));
      const matchCat = !filters.category || item.category === filters.category;
      const matchMethod = !filters.payoutMethod || item.payoutMethod === filters.payoutMethod;
      return matchDate && matchBen && matchCat && matchMethod;
    });
  };

  const rawPendingExpenses = transactions.filter((t: any) => t.type === 'expense' && t.status === 'pending_approval').sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const rawHistoryExpenses = transactions.filter((t: any) => t.type === 'expense' && t.status !== 'pending_approval').sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredPending = getFilteredData(rawPendingExpenses, pendingFilters);
  const filteredHistory = getFilteredData(rawHistoryExpenses, historyFilters);
  const totalPendingAmount = filteredPending.reduce((sum, item) => sum + item.amount, 0);

  const requestDelete = (id: any) => { setItemToDelete(id); setDeleteModalOpen(true); };
  const confirmDelete = () => { if (itemToDelete) { onDelete(itemToDelete); setDeleteModalOpen(false); setItemToDelete(null); } };
  
  const requestDisburse = (ids: any) => { 
      if (!ids || ids.length === 0) return;
      setItemsToDisburse(ids); 
      setDisburseModalOpen(true); 
  };
  
  const confirmDisburse = (last5: any) => { onBatchDisburse(itemsToDisburse, last5); setDisburseModalOpen(false); setItemsToDisburse([]); };
  
  const selectedDisburseItems = useMemo(() => 
    transactions.filter((t: any) => itemsToDisburse.includes(t.id)), 
  [transactions, itemsToDisburse]);

  const canDisburse = hasPermission(currentUser.role, ROLES.MANAGER);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} title="刪除申請單" message="確定要刪除這筆款項申請嗎？刪除後將無法復原。" />
      
      <DisburseModal 
        isOpen={disburseModalOpen} 
        onClose={() => setDisburseModalOpen(false)} 
        onConfirm={confirmDisburse} 
        selectedItems={selectedDisburseItems} 
      />
      
      <div className="flex flex-wrap gap-4 mb-4 shrink-0 items-center">
        <button onClick={() => setSubTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${subTab === 'list' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>撥款管理明細</button>
        <button onClick={() => setSubTab('form')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center ${subTab === 'form' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'}`}><Plus size={16} className="mr-1" />填寫申請單</button>
        <button onClick={handleExportAnnualReport} className="px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 ml-auto"><Download size={16} className="mr-1" />年度明細輸出</button>
      </div>

      <div className="flex-1 overflow-hidden">
        {subTab === 'list' && (
          <div className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
               <div className="bg-amber-50 p-3 border-b border-amber-100 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-amber-800 flex items-center shrink-0"><Clock size={18} className="mr-2" /> 待撥款項目</h3>
                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{filteredPending.length} 筆</span>
                        </div>
                        <div className="text-sm font-bold text-amber-900 bg-amber-200/50 px-3 py-1 rounded-lg">總計: <span className="font-mono text-base">{formatCurrency(totalPendingAmount)}</span></div>
                    </div>
                    
                    {canDisburse && (
                        <button 
                            disabled={filteredPending.length === 0} 
                            onClick={() => requestDisburse(filteredPending.map(t => t.id))} 
                            className={`flex items-center px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm whitespace-nowrap ml-auto ${
                                filteredPending.length > 0 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <CheckSquare size={14} className="mr-1" />整批撥款
                        </button>
                    )}
                  </div>
                   <div className="flex items-center gap-2 flex-wrap text-sm border-t border-amber-100 pt-2">
                      <div className="flex items-center bg-white rounded border border-amber-200 px-2 py-1">
                        <Filter size={14} className="text-amber-400 mr-2" />
                        <input type="date" className="outline-none text-slate-600 bg-transparent w-28 text-xs" value={pendingFilters.date} onChange={e => setPendingFilters({...pendingFilters, date: e.target.value})} />
                      </div>
                      <select className="bg-white border border-amber-200 rounded px-2 py-1 text-xs outline-none text-slate-600" value={pendingFilters.beneficiary} onChange={e => setPendingFilters({...pendingFilters, beneficiary: e.target.value})}>
                        <option value="">所有對象/申請人</option>
                        {STAFF_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select className="bg-white border border-amber-200 rounded px-2 py-1 text-xs outline-none text-slate-600" value={pendingFilters.category} onChange={e => setPendingFilters({...pendingFilters, category: e.target.value})}>
                        <option value="">所有類別</option>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="bg-white border border-amber-200 rounded px-2 py-1 text-xs outline-none text-slate-600" value={pendingFilters.payoutMethod} onChange={e => setPendingFilters({...pendingFilters, payoutMethod: e.target.value})}>
                        <option value="">所有撥款方式</option>
                        <option value="cash">現金</option>
                        <option value="transfer">匯款</option>
                      </select>
                   </div>
               </div>
               <div className="overflow-x-auto max-h-[300px]">
                   <table className="w-full text-left text-sm relative">
                       <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 shadow-sm z-10">
                           <tr>
                               <th className="p-3 whitespace-nowrap">申請日期</th>
                               <th className="p-3 whitespace-nowrap">撥款方式</th>
                               <th className="p-3 whitespace-nowrap">對象 / 申請人</th>
                               <th className="p-3 whitespace-nowrap">類別</th>
                               <th className="p-3 min-w-[150px]">說明</th>
                               <th className="p-3 whitespace-nowrap">金額</th>
                               <th className="p-3 whitespace-nowrap">帳號資訊</th>
                               <th className="p-3 text-right whitespace-nowrap">操作</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {filteredPending.length === 0 ? (
                               <tr><td colSpan={8} className="p-8 text-center text-slate-400">目前沒有符合的待撥款項目</td></tr>
                           ) : (
                               filteredPending.map(t => (
                                   <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                                       <td className="p-3 font-mono text-slate-600">{formatDate(t.date)}</td>
                                       <td className="p-3">
                                           {t.payoutMethod === 'cash' ? <span className="flex items-center text-emerald-600 font-bold text-xs"><Banknote size={14} className="mr-1"/>現金</span> : <span className="flex items-center text-blue-600 font-bold text-xs"><CreditCard size={14} className="mr-1"/>匯款</span>}
                                       </td>
                                       <td className="p-3 text-slate-700">
                                           <div className="font-bold">{t.beneficiary}</div>
                                           {t.applicant && t.applicant !== t.beneficiary && <div className="text-xs text-slate-400 mt-0.5">申請: {t.applicant}</div>}
                                       </td>
                                       <td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs whitespace-nowrap">{t.category}</span></td>
                                       <td className="p-3 text-slate-600 text-xs">{t.description}</td>
                                       <td className="p-3 font-bold text-slate-800 font-mono">{formatCurrency(t.amount)}</td>
                                       <td className="p-3 text-xs text-slate-500 font-mono">{t.bankAccount || '-'}</td>
                                       <td className="p-3 text-right whitespace-nowrap">
                                           <div className="flex justify-end gap-2">
                                               <button type="button" onClick={(e) => { e.stopPropagation(); requestDelete(t.id); }} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors" title="刪除申請"><Trash2 size={16} /></button>
                                               {canDisburse && (
                                                   <button onClick={() => requestDisburse([t.id])} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-all flex items-center"><Check size={14} className="mr-1" /> 確認撥款</button>
                                               )}
                                           </div>
                                       </td>
                                   </tr>
                               ))
                           )}
                       </tbody>
                   </table>
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-[300px] flex flex-col">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <h3 className="font-bold text-slate-700 flex items-center">已撥款 / 歷史紀錄</h3>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <div className="flex items-center bg-white rounded border border-slate-300 px-2 py-1">
                        <Filter size={14} className="text-slate-400 mr-2" />
                        <input type="date" className="outline-none text-slate-600 bg-transparent w-28 text-xs" value={historyFilters.date} onChange={e => setHistoryFilters({...historyFilters, date: e.target.value})} />
                      </div>
                      <select className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-slate-600" value={historyFilters.beneficiary} onChange={e => setHistoryFilters({...historyFilters, beneficiary: e.target.value})}>
                        <option value="">所有對象</option>
                        {STAFF_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-slate-600" value={historyFilters.category} onChange={e => setHistoryFilters({...historyFilters, category: e.target.value})}>
                        <option value="">所有類別</option>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-slate-600" value={historyFilters.payoutMethod} onChange={e => setHistoryFilters({...historyFilters, payoutMethod: e.target.value})}>
                        <option value="">所有撥款方式</option>
                        <option value="cash">現金</option>
                        <option value="transfer">匯款</option>
                      </select>
                    </div>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm relative">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 whitespace-nowrap">申請日期</th>
                                <th className="p-3 whitespace-nowrap">撥款日期</th>
                                <th className="p-3 whitespace-nowrap">撥款方式</th>
                                <th className="p-3 whitespace-nowrap">匯出帳號(末5碼)</th>
                                <th className="p-3 whitespace-nowrap">對象</th>
                                <th className="p-3 whitespace-nowrap">類別</th>
                                <th className="p-3 whitespace-nowrap">金額</th>
                                <th className="p-3 whitespace-nowrap">狀態</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400">沒有符合的紀錄</td></tr>
                            ) : (
                                filteredHistory.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-3 text-slate-500 text-xs font-mono">{formatDate(t.date)}</td>
                                        <td className="p-3 text-slate-800 font-mono text-xs font-bold bg-slate-50/50">{formatDateTime(t.disbursementDate)}</td>
                                        <td className="p-3">
                                            {t.payoutMethod === 'cash' ? <span className="flex items-center text-slate-500 text-xs"><Banknote size={14} className="mr-1"/>現金</span> : <span className="flex items-center text-slate-500 text-xs"><CreditCard size={14} className="mr-1"/>匯款</span>}
                                        </td>
                                        <td className="p-3 text-xs font-mono text-blue-600 font-bold">{t.outgoingAccountLast5 || '-'}</td>
                                        <td className="p-3 text-slate-700">
                                            {t.beneficiary}
                                            {t.applicant && t.applicant !== t.beneficiary && <span className="text-xs text-slate-400 ml-1">({t.applicant})</span>}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs">{t.category}</td>
                                        <td className="p-3 font-medium text-slate-600 font-mono">{formatCurrency(t.amount)}</td>
                                        <td className="p-3">
                                            {t.reconciled ? <span className="text-emerald-600 flex items-center text-xs"><CheckCircle2 size={14} className="mr-1"/> 已完成</span> : <span className="text-blue-600 flex items-center text-xs"><ArrowRight size={14} className="mr-1"/> 已撥款(待勾稽)</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {subTab === 'form' && (
          <div className="max-w-4xl mx-auto h-full overflow-y-auto pb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="flex border-b border-slate-100">
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${type === 'reimbursement' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setType('reimbursement')}
                >
                  <Wallet className="inline-block mr-2 mb-1" size={18} />
                  <span className="hidden sm:inline">員工</span>代墊請款
                </button>
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${type === 'invoice' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setType('invoice')}
                >
                  <Building2 className="inline-block mr-2 mb-1" size={18} />
                  <span className="hidden sm:inline">廠商</span>匯款申請
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-slate-700 mb-2">所屬分店</label>
                     <div className="flex gap-4 p-3 border border-slate-300 rounded-lg bg-white">
                        {LOCATIONS.map(loc => (
                            <label key={loc.id} className="flex items-center cursor-pointer">
                              <input 
                                type="radio" 
                                name="location" 
                                value={loc.id}
                                checked={form.location === loc.id}
                                onChange={e => setForm({...form, location: e.target.value})}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-slate-700 flex items-center"><MapPin size={16} className="mr-1"/> {loc.name}</span>
                            </label>
                        ))}
                     </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {type === 'reimbursement' ? '申請人/代墊人' : '廠商名稱'}
                    </label>
                    {type === 'reimbursement' ? (
                      <select
                        required
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={form.beneficiary}
                        onChange={e => setForm({...form, beneficiary: e.target.value})}
                      >
                        <option value="" disabled>請選擇員工</option>
                        {STAFF_MEMBERS.map(member => (
                          <option key={member} value={member}>{member}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        required
                        type="text" 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder='例如：Apeks 台灣總代'
                        value={form.beneficiary}
                        onChange={e => setForm({...form, beneficiary: e.target.value})}
                      />
                    )}
                  </div>

                   {type === 'invoice' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">申請人 (員工)</label>
                      <select required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={form.applicant} onChange={e => setForm({...form, applicant: e.target.value})}>
                        <option value="" disabled>請選擇申請員工</option>
                        {STAFF_MEMBERS.map(member => (<option key={member} value={member}>{member}</option>))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">費用類別</label>
                    <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">金額</label>
                    <input required type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{type === 'invoice' ? '申請日期' : '發生日期'}</label>
                    <input type="date" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  {type === 'invoice' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">廠商匯款帳號</label>
                      <input type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="銀行代碼+帳號 (選填)" value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">詳細說明/用途</label>
                    <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" placeholder="例如：龍洞店 2/1 船潛費用 (5人)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>

                </div>
                <div className="flex justify-end">
                  <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center">
                    <FileText className="mr-2" size={18} /> 送出申請
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
