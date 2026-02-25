import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckSquare, Banknote, Check, CreditCard, Smartphone } from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/helpers';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 text-sm shadow-md transition-colors">確認刪除</button>
        </div>
      </div>
    </div>
  );
};

export const DisburseModal = ({ isOpen, onClose, onConfirm, selectedItems }: any) => {
  const [last5, setLast5] = useState('');
  useEffect(() => { if (isOpen) setLast5(''); }, [isOpen]);
  if (!isOpen) return null;
  
  const count = selectedItems.length;
  const methods = new Set(selectedItems.map((item: any) => item.payoutMethod));
  const hasTransfer = methods.has('transfer');
  const hasMixed = methods.size > 1;
  const handleSubmit = () => onConfirm(last5);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 relative overflow-hidden">
        {hasMixed && (
           <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-bold px-4 py-1 flex items-center justify-center animate-pulse">
              <AlertTriangle size={14} className="mr-1"/> 警告：包含混合撥款方式 (現金 + 匯款)
           </div>
        )}
        <div className={`flex justify-between items-center mb-4 ${hasMixed ? 'mt-4' : ''}`}>
          <h3 className="text-lg font-bold text-slate-800 flex items-center"><CheckSquare size={20} className="mr-2 text-emerald-500"/> 確認撥款 ({count} 筆)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        {hasMixed && <div className="mb-4 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">建議先使用篩選器選擇單一撥款方式，以避免帳務混亂。</div>}
        {hasTransfer ? (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center"><CreditCard size={16} className="mr-1"/> 匯出帳號末五碼</label>
            <input type="text" className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-mono tracking-widest text-center text-lg bg-white" placeholder="12345" value={last5} onChange={(e) => setLast5(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))} maxLength={5} autoFocus />
            <p className="text-xs text-blue-600 mt-2">* 此號碼將自動填入選取之「匯款」項目。</p>
          </div>
        ) : (
           <p className="text-slate-600 mb-6 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100"><Banknote size={16} className="inline mr-1 mb-0.5"/> 所選項目皆為現金支付，確認執行撥款？</p>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm transition-colors">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 text-sm shadow-md transition-colors flex items-center"><Check size={16} className="mr-1" /> 確認執行</button>
        </div>
      </div>
    </div>
  );
};

export const PaymentBreakdown = ({ methods }: any) => (
  <div className="grid grid-cols-3 gap-3 md:gap-4">
     <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col items-center justify-center">
        <div className="text-emerald-600 text-xs font-bold mb-1 flex items-center"><Banknote size={14} className="mr-1"/> 現金</div>
        <div className="text-slate-700 font-mono font-bold text-sm md:text-lg">{formatCurrency(methods.cash)}</div>
     </div>
     <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col items-center justify-center">
        <div className="text-blue-600 text-xs font-bold mb-1 flex items-center"><CreditCard size={14} className="mr-1"/> 匯款</div>
        <div className="text-slate-700 font-mono font-bold text-sm md:text-lg">{formatCurrency(methods.transfer)}</div>
     </div>
     <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex flex-col items-center justify-center">
        <div className="text-green-600 text-xs font-bold mb-1 flex items-center"><Smartphone size={14} className="mr-1"/> Line Pay</div>
        <div className="text-slate-700 font-mono font-bold text-sm md:text-lg">{formatCurrency(methods.line_pay)}</div>
     </div>
  </div>
);

export const SensitiveValue = ({ value, isVisible, type = 'currency' }: any) => {
  if (!isVisible) return <span className="text-slate-300 tracking-widest">••••••</span>;
  return type === 'percent' ? formatPercent(value) : formatCurrency(value);
};

export const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-medium mb-1">{title}</p>
      <h3 className="text-xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);
