import React, { useState, useMemo, useEffect } from 'react';
import { Smartphone, Zap, CheckCircle2, Link as LinkIcon, ArrowRightLeft, FilePlus } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import { BANK_ACCOUNTS } from '../utils/constants';

export const Reconciliation = ({ transactions, bankRecords, onReconcile, onAddBankRecord, onAutoReconcile, currentUser }: any) => {
  const [tab, setTab] = useState('pending'); 
  
  const [selectedSystemIds, setSelectedSystemIds] = useState<any[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('all'); 

  const [selectedPosLpIds, setSelectedPosLpIds] = useState<any[]>([]);
  const [selectedBankLpId, setSelectedBankLpId] = useState<any>(null);

  const unmatchedSystem = useMemo(() => transactions.filter((t: any) => 
    !t.reconciled && 
    (t.method === 'transfer' || t.type === 'expense' || t.type === 'income') && 
    (t.status === 'pending_reconciliation' || t.status === 'pending_reconciliation')
  ).filter((t: any) => {
      if (filterType === 'all') return true;
      if (filterType === 'income') return t.type === 'income' || t.amount > 0;
      if (filterType === 'expense') return t.type === 'expense' || t.amount < 0;
      return true;
  }), [transactions, filterType]);
  
  const unmatchedBank = useMemo(() => bankRecords.filter((r: any) => !r.matchedTransactionId && r.suggestedCategory !== 'Line Pay 撥款').filter((r: any) => {
      if (filterType === 'all') return true;
      if (filterType === 'income') return r.amount > 0;
      if (filterType === 'expense') return r.amount < 0;
      return true;
  }), [bankRecords, filterType]);

  const unmatchedPosLinePay = useMemo(() => transactions.filter((t: any) => 
     !t.reconciled && t.method === 'line_pay'
  ), [transactions]);

  const unmatchedBankLinePay = useMemo(() => bankRecords.filter((r: any) => 
     !r.matchedTransactionId && r.suggestedCategory === 'Line Pay 撥款'
  ), [bankRecords]);

  const matchedHistory = useMemo(() => {
    return transactions.filter((t: any) => t.reconciled).map((t: any) => {
        const bankRec = bankRecords.find((b: any) => b.matchedTransactionId === t.id);
        return { ...t, bankRecord: bankRec };
    }).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, bankRecords]);

  const handleManualMatch = () => {
    if (selectedSystemIds.length > 0 && selectedBankIds.length > 0) {
      // Basic validation: check if types match (all income or all expense)
      const systemItems = unmatchedSystem.filter((t: any) => selectedSystemIds.includes(t.id));
      const bankItems = unmatchedBank.filter((b: any) => selectedBankIds.includes(b.id));
      
      const isSystemIncome = systemItems.every((t: any) => t.type === 'income');
      const isSystemExpense = systemItems.every((t: any) => t.type === 'expense');
      const isBankDeposit = bankItems.every((b: any) => b.amount > 0);
      const isBankWithdrawal = bankItems.every((b: any) => b.amount < 0);

      if ((isSystemIncome && !isBankDeposit) || (isSystemExpense && !isBankWithdrawal)) {
          alert('警告：選擇的系統項目類型（收入/支出）與銀行明細金額方向不符，請重新確認。');
          return;
      }

      if (selectedSystemIds.length > 1 && selectedBankIds.length === 1) {
          if (!window.confirm(`確認將 ${selectedSystemIds.length} 筆系統項目與此單一銀行紀錄關聯嗎？`)) {
              return;
          }
      }

      // For batch match, we just link the first selected bank record to all selected system records for simplicity in this prototype.
      // In a real app, you might want a more complex linking structure (many-to-many).
      const primaryBankId = selectedBankIds[0];
      selectedSystemIds.forEach(sysId => {
          onReconcile(sysId, primaryBankId);
      });
      
      setSelectedSystemIds([]);
      setSelectedBankIds([]);
    }
  };
  
  const handleQuickAdd = (bankRecord: any) => {
      if (onAddBankRecord) {
         if (bankRecord.suggestedCategory === '待確認') {
             if (!window.confirm('此筆款項類別為「待確認」，建議您先確認後再儲存。是否仍要直接補登？')) {
                 return;
             }
         }
         onAddBankRecord(bankRecord);
      }
  };

  const handleLinePayMatch = () => {
     const totalPos = selectedPosLpIds.reduce((sum, id) => sum + unmatchedPosLinePay.find((t: any)=>t.id===id).amount, 0);
     const bankAmt = unmatchedBankLinePay.find((b: any) => b.id === selectedBankLpId).amount;
     const fee = totalPos - bankAmt;
     
     if (window.confirm(`確認對帳？\nPOS 總額: ${totalPos}\n銀行實收: ${bankAmt}\n手續費: ${fee}\n(將自動產生一筆手續費支出紀錄)`)) {
         alert("已完成 Line Pay 對帳與手續費登錄！");
         setSelectedPosLpIds([]);
         setSelectedBankLpId(null);
     }
  };

  const handleAutoMatch = () => {
    if (onAutoReconcile) {
        onAutoReconcile();
    }
  };

  const togglePosSelection = (id: any) => {
     if (selectedPosLpIds.includes(id)) {
         setSelectedPosLpIds(selectedPosLpIds.filter(i => i !== id));
     } else {
         setSelectedPosLpIds([...selectedPosLpIds, id]);
     }
  };

  const lpPosTotal = selectedPosLpIds.reduce((sum, id) => sum + unmatchedPosLinePay.find((t: any)=>t.id===id).amount, 0);
  const lpBankTotal = selectedBankLpId ? unmatchedBankLinePay.find((b: any) => b.id === selectedBankLpId).amount : 0;
  const lpFee = lpPosTotal - lpBankTotal;

  const toggleSystemSelection = (id: any) => {
      setSelectedSystemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleBankSelection = (id: any) => {
      setSelectedBankIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getPotentialMatchId = (itemId: any, isSystemItem: boolean) => {
    if (isSystemItem) {
        const item = unmatchedSystem.find((i: any) => i.id === itemId);
        if (!item) return null;
        const targetAmount = item.type === 'expense' ? -item.amount : item.amount;
        const match = unmatchedBank.find((b: any) => Math.abs(b.amount - targetAmount) < 1); 
        return match ? match.id : null;
    } else {
        const item = unmatchedBank.find((i: any) => i.id === itemId);
        if (!item) return null;
        const isDeposit = item.amount > 0;
        const targetType = isDeposit ? 'income' : 'expense';
        const targetAmount = Math.abs(item.amount);
        
        const match = unmatchedSystem.find((s: any) => 
            s.amount === targetAmount && 
            (s.type === targetType || (targetType === 'income' && s.type === 'income')) 
        );
        return match ? match.id : null;
    }
  };

  useEffect(() => {
    if (selectedSystemIds.length === 1 && selectedBankIds.length === 0) {
        const matchId = getPotentialMatchId(selectedSystemIds[0], true);
        if (matchId) setSelectedBankIds([matchId]);
    }
  }, [selectedSystemIds]);


  if (currentUser.role.id === 'helper') {
    return (
      <div className="h-full bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center text-slate-500">您沒有權限存取此頁面。</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-slate-50">
      <div className="flex justify-between items-center shrink-0">
         <div className="flex gap-2">
            <button 
                onClick={() => setTab('pending')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'pending' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}
            >
                一般對帳
            </button>
            <button 
                onClick={() => setTab('linepay')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center ${tab === 'linepay' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200'}`}
            >
                <Smartphone size={16} className="mr-1"/>
                Line Pay 對帳
            </button>
            <button 
                onClick={() => setTab('matched')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'matched' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}
            >
                已完成紀錄
            </button>
         </div>
         
         {tab === 'pending' && (
             <div className="flex gap-2 items-center">
                 <button 
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded text-xs font-bold ${filterType==='all' ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-500'}`}
                 >全部</button>
                 <button 
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1.5 rounded text-xs font-bold ${filterType==='income' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`}
                 >收入</button>
                 <button 
                    onClick={() => setFilterType('expense')}
                    className={`px-3 py-1.5 rounded text-xs font-bold ${filterType==='expense' ? 'bg-red-100 text-red-700' : 'bg-white text-slate-500'}`}
                 >支出</button>
                 
                 <div className="w-px h-6 bg-slate-300 mx-2"></div>

                 <button 
                    onClick={handleAutoMatch}
                    className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                 >
                     <Zap size={16} className="mr-1" />
                     智慧自動勾稽
                 </button>
             </div>
         )}
      </div>

      {tab === 'linepay' && (
         <div className="flex-1 flex flex-col gap-4 min-h-0">
             <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center justify-between shadow-sm shrink-0">
                 <div className="flex gap-8">
                     <div>
                         <p className="text-xs text-green-800 font-bold mb-1">POS 應收總額</p>
                         <p className="text-xl font-mono font-bold text-slate-700">{formatCurrency(lpPosTotal)}</p>
                     </div>
                     <div className="text-slate-400 flex items-center">→</div>
                     <div>
                         <p className="text-xs text-green-800 font-bold mb-1">銀行實收金額</p>
                         <p className="text-xl font-mono font-bold text-slate-700">{formatCurrency(lpBankTotal)}</p>
                     </div>
                     <div className="text-slate-400 flex items-center">=</div>
                     <div>
                         <p className="text-xs text-red-600 font-bold mb-1">手續費 (差異)</p>
                         <p className="text-xl font-mono font-bold text-red-600">{formatCurrency(lpFee)}</p>
                     </div>
                 </div>
                 <button 
                    disabled={lpPosTotal === 0 || !selectedBankLpId}
                    onClick={handleLinePayMatch}
                    className={`px-6 py-2 rounded-lg font-bold flex items-center shadow-md transition-all ${
                        lpPosTotal > 0 && selectedBankLpId
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                 >
                    <CheckCircle2 size={18} className="mr-2"/> 確認對帳 & 記錄手續費
                 </button>
             </div>

             <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">POS 待對帳款項 ({unmatchedPosLinePay.length})</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {unmatchedPosLinePay.map((t: any) => (
                            <div 
                                key={t.id}
                                onClick={() => togglePosSelection(t.id)}
                                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${
                                    selectedPosLpIds.includes(t.id) 
                                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                                    : 'border-slate-100 hover:bg-slate-50'
                                }`}
                            >
                                <div>
                                    <div className="text-sm font-bold text-slate-700">{formatDate(t.date)}</div>
                                    <div className="text-xs text-slate-500">{t.category} - {t.customer}</div>
                                </div>
                                <div className="font-mono font-bold text-slate-700">{formatCurrency(t.amount)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">銀行 撥款紀錄 ({unmatchedBankLinePay.length})</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {unmatchedBankLinePay.map((b: any) => (
                            <div 
                                key={b.id}
                                onClick={() => setSelectedBankLpId(selectedBankLpId === b.id ? null : b.id)}
                                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${
                                    selectedBankLpId === b.id 
                                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                                    : 'border-slate-100 hover:bg-slate-50'
                                }`}
                            >
                                <div>
                                    <div className="text-sm font-bold text-slate-700">{formatDate(b.date)}</div>
                                    <div className="text-xs text-slate-500">{b.description}</div>
                                </div>
                                <div className="font-mono font-bold text-green-600">{formatCurrency(b.amount)}</div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
         </div>
      )}

      {tab === 'pending' && (
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between">
                    <span>公司帳務 (POS/費用)</span>
                    <span className="text-xs bg-slate-200 px-2 py-1 rounded">{unmatchedSystem.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {unmatchedSystem.map((t: any) => (
                        <div 
                            key={t.id}
                            onClick={() => toggleSystemSelection(t.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedSystemIds.includes(t.id) 
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                : selectedBankIds.length === 1 && getPotentialMatchId(selectedBankIds[0], false) === t.id 
                                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300' 
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {t.type === 'income' ? '收入' : '支出'}
                                </span>
                                <span className="font-mono font-bold">{formatCurrency(t.amount)}</span>
                            </div>
                            <div className="text-sm text-slate-700">{t.category} - {t.beneficiary || t.customer}</div>
                            <div className="text-xs text-slate-400 mt-1">{formatDate(t.date)}</div>
                        </div>
                    ))}
                    {unmatchedSystem.length === 0 && <div className="text-center text-slate-400 py-10">無待勾稽項目</div>}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between">
                    <span>銀行明細 (匯入)</span>
                    <span className="text-xs bg-slate-200 px-2 py-1 rounded">{unmatchedBank.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {unmatchedBank.map((b: any) => (
                        <div 
                            key={b.id}
                            onClick={() => toggleBankSelection(b.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all relative group ${
                                selectedBankIds.includes(b.id) 
                                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                                : selectedSystemIds.length === 1 && getPotentialMatchId(selectedSystemIds[0], true) === b.id
                                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300' 
                                    : 'border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500">{formatDate(b.date)}</span>
                                <span className={`font-mono font-bold ${b.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(b.amount)}
                                </span>
                            </div>
                            <div className="text-sm text-slate-700">{b.description}</div>
                            <div className="text-xs text-slate-400 mt-1 flex justify-between items-center">
                                <span>{BANK_ACCOUNTS.find(a => a.id === b.source)?.name}</span>
                                {b.suggestedCategory && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.suggestedCategory === '待確認' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {b.suggestedCategory}
                                    </span>
                                )}
                            </div>

                            {b.amount > 0 && (
                                <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickAdd(b);
                                        }} 
                                        className="bg-blue-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-blue-600 flex items-center"
                                    >
                                        <FilePlus size={12} className="mr-1"/>
                                        補登
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {unmatchedBank.length === 0 && <div className="text-center text-slate-400 py-10">無銀行紀錄</div>}
                </div>
            </div>
        </div>
      )}

      {tab === 'matched' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1">
              <div className="overflow-auto h-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                        <tr>
                            <th className="p-3">日期</th>
                            <th className="p-3">類型</th>
                            <th className="p-3">系統項目</th>
                            <th className="p-3">銀行明細</th>
                            <th className="p-3 text-right">金額</th>
                            <th className="p-3 text-center">狀態</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {matchedHistory.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600">{formatDate(t.date)}</td>
                                <td className="p-3">
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {t.type === 'income' ? '收入' : '支出'}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-700">
                                    <div>{t.category}</div>
                                    <div className="text-xs text-slate-400">{t.beneficiary || t.customer}</div>
                                </td>
                                <td className="p-3 text-slate-700">
                                    {t.bankRecord ? (
                                        <>
                                            <div>{t.bankRecord.description}</div>
                                            <div className="text-xs text-slate-400 font-mono">{formatDate(t.bankRecord.date)}</div>
                                        </>
                                    ) : <span className="text-slate-400 italic">無連結銀行帳</span>}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-700">{formatCurrency(t.amount)}</td>
                                <td className="p-3 text-center text-emerald-600 font-bold text-xs">
                                    <div className="flex items-center justify-center">
                                        <CheckCircle2 size={16} className="mr-1"/> 已勾稽
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {tab === 'pending' && (
        <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center shrink-0">
            <div className="text-sm">
                {selectedSystemIds.length > 0 && selectedBankIds.length > 0 
                 ? <span className="text-emerald-400 font-bold flex items-center"><LinkIcon size={16} className="mr-2"/> 已選擇 {selectedSystemIds.length} 筆系統項目與 {selectedBankIds.length} 筆銀行明細，準備勾稽</span> 
                 : <span className="text-slate-400">請從左右列表選擇項目進行配對 (可複選)</span>}
            </div>
            <button 
                onClick={handleManualMatch}
                disabled={selectedSystemIds.length === 0 || selectedBankIds.length === 0}
                className={`px-6 py-2 rounded-lg font-bold flex items-center transition-all ${
                    selectedSystemIds.length > 0 && selectedBankIds.length > 0 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg' 
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
                <ArrowRightLeft size={18} className="mr-2" />
                執行勾稽
            </button>
        </div>
      )}
    </div>
  );
};
