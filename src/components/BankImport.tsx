import React, { useState } from 'react';
import { Upload, Building2, FileSpreadsheet, CheckCircle2, Check, Trash2, AlertTriangle } from 'lucide-react';
import { generateId, formatCurrency, smartCategorize } from '../utils/helpers';
import { BANK_ACCOUNTS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../utils/constants';

export const BankImport = ({ onImport, currentUser }: any) => {
  const [rawText, setRawText] = useState('');
  const [selectedBank, setSelectedBank] = useState(BANK_ACCOUNTS[0].id);
  const [importTargetBank, setImportTargetBank] = useState(BANK_ACCOUNTS[0].id);
  const [parsedData, setParsedData] = useState<any[]>([]);

  const handleParse = () => {
    if (!rawText.trim()) return;

    const rows = rawText.split('\n').filter(row => row.trim() !== '');
    const newRecords: any[] = [];

    rows.forEach(row => {
      const parts = row.trim().split(/\s+/);

      if (parts.length >= 3) {
        const dateStr = parts[0];
        if (!/^\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(dateStr)) return; 

        const amountStr = parts[1];
        const amount = parseFloat(amountStr.replace(/,/g, ''));

        const accountInfo = parts[2];

        const descText = parts.slice(3).join(' ');

        let finalDesc = descText;
        if (accountInfo && accountInfo !== '-') {
            finalDesc = `[${accountInfo}] ${descText}`; 
        } else if (!descText) {
            finalDesc = accountInfo;
        }
        
        const potentialCat = parts.length >= 5 ? parts[4] : descText;
        const suggestedCategory = smartCategorize(potentialCat);
        
        let isLinePay = false;
        if (selectedBank === 'ctbc' && accountInfo.includes('國泰世華商業銀') && !descText.trim()) {
             isLinePay = true;
             finalDesc = '[Line Pay 撥款] 國泰世華商業銀';
        }

        newRecords.push({
          id: generateId(),
          date: dateStr,
          amount: isNaN(amount) ? 0 : amount,
          description: finalDesc.trim(),
          source: selectedBank,
          matchedTransactionId: null,
          importedAt: new Date().toISOString(),
          suggestedCategory: isLinePay ? 'Line Pay 撥款' : suggestedCategory 
        });
      }
    });

    setParsedData(newRecords);
  };

  const handleConfirmImport = () => {
    const dataToImport = parsedData.map(row => ({
      ...row,
      source: importTargetBank
    }));
    onImport(dataToImport);
    setParsedData([]);
    setRawText('');
    alert(`成功匯入 ${dataToImport.length} 筆資料至 ${BANK_ACCOUNTS.find(b => b.id === importTargetBank)?.name}`);
  };

  const handleDeletePreview = (idx: number) => {
    setParsedData(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCategoryChange = (idx: number, newCategory: string) => {
    setParsedData(prev => prev.map((row, i) => i === idx ? { ...row, suggestedCategory: newCategory } : row));
  };

  if (currentUser.role.id === 'helper') {
    return (
      <div className="h-full bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center text-slate-500">您沒有權限存取此頁面。</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-8 bg-slate-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <Upload className="mr-2 text-blue-600" /> 銀行明細匯入
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-500 mb-2">1. 選擇匯入帳戶</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BANK_ACCOUNTS.map(bank => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${
                    selectedBank === bank.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Building2 size={16} className="mr-2" />
                  {bank.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-bold text-slate-500 mb-2">
            2. 貼上明細資料 
            <span className="text-xs font-normal text-slate-400 ml-2">(日期 存入金額 轉入帳號 說明 費用類別)</span>
          </label>
          <textarea 
            className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
            placeholder={`範例格式：\n2026/02/03\t10,000\t12345\t摘要說明\t教學收入\n2026/02/04\t5,000\t備註\t零用金\t其他`}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button 
              onClick={handleParse}
              disabled={!rawText}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              解析資料
            </button>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
            <h3 className="font-bold text-slate-700 flex items-center">
              <CheckCircle2 className="mr-2 text-emerald-500" size={20}/>
              預覽匯入結果 ({parsedData.length} 筆)
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <label className="text-sm font-bold text-slate-600 mr-2">匯入至：</label>
                <select 
                  className="p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={importTargetBank}
                  onChange={(e) => setImportTargetBank(e.target.value)}
                >
                  {BANK_ACCOUNTS.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleConfirmImport}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center"
              >
                <Check size={18} className="mr-2" />
                確認匯入系統
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3 w-16">移除</th>
                  <th className="p-3">日期</th>
                  <th className="p-3">來源帳戶</th>
                  <th className="p-3">摘要/說明</th>
                  <th className="p-3">智慧分類</th>
                  <th className="p-3 text-right">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleDeletePreview(idx)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{row.date}</td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                        {BANK_ACCOUNTS.find(b => b.id === importTargetBank)?.name}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{row.description}</td>
                    <td className="p-3">
                       <select 
                         className={`p-1 border rounded text-xs font-bold outline-none ${row.suggestedCategory === '待確認' ? 'border-red-300 text-red-600 bg-red-50' : row.suggestedCategory === 'Line Pay 撥款' ? 'border-green-300 text-green-700 bg-green-50' : 'border-slate-300 text-slate-600 bg-slate-50'}`}
                         value={row.suggestedCategory}
                         onChange={(e) => handleCategoryChange(idx, e.target.value)}
                       >
                         <option value="待確認">待確認 (需人工對帳)</option>
                         <option value="Line Pay 撥款">Line Pay 撥款</option>
                         <optgroup label="收入類別">
                           {INCOME_CATEGORIES.filter(c => c !== '待確認').map(c => <option key={c} value={c}>{c}</option>)}
                         </optgroup>
                         <optgroup label="支出類別">
                           {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </optgroup>
                       </select>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${row.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
