import React, { useState } from 'react';
import { MapPin, Users, Zap, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { generateId, formatCurrency } from '../utils/helpers';
import { LOCATIONS, PAYMENT_METHODS, INCOME_CATEGORIES, POS_SHORTCUTS } from '../utils/constants';

export const POS = ({ onAddTransaction, currentUser }: any) => {
  const [cart, setCart] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    item: '',
    price: '',
    category: INCOME_CATEGORIES[0],
    note: '',
    customer: '',
    paymentMethod: 'cash',
    location: 'qiangang'
  });

  const handleAddToCart = () => {
    if (!formData.item || !formData.price) return;
    setCart([...cart, { ...formData, id: generateId(), price: Number(formData.price) }]);
    setFormData({ ...formData, item: '', price: '' });
  };

  const handleApplyShortcut = (shortcut: any) => {
    setFormData({
      ...formData,
      item: shortcut.name,
      price: shortcut.price
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const groupedItems = cart.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
    
    const timestamp = new Date().toISOString();
    
    const newTransactions = Object.entries(groupedItems).map(([category, items]: any) => {
       const subtotal = items.reduce((sum: number, i: any) => sum + i.price, 0);
       
       let fee = 0;
       if (formData.paymentMethod === 'line_pay') {
           fee = Math.round(subtotal * 0.022); 
       }

       return {
         id: generateId(),
         date: timestamp,
         type: 'income',
         category: category, 
         amount: subtotal,
         fee: fee, 
         method: formData.paymentMethod,
         customer: formData.customer || '散客',
         status: formData.paymentMethod === 'cash' ? 'completed' : 'pending_reconciliation',
         details: items, 
         reconciled: formData.paymentMethod === 'cash',
         createdBy: currentUser ? currentUser.name : '櫃台',
         location: formData.location
       };
    });

    onAddTransaction(newTransactions); 
    setCart([]);
    setFormData({ ...formData, item: '', price: '', customer: '', note: '' });
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const currentShortcuts = POS_SHORTCUTS[formData.category] || [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-full text-slate-800">
      <div className="w-full lg:flex-1 bg-white p-4 lg:p-5 rounded-xl shadow-sm border border-slate-100 lg:overflow-y-auto min-h-[500px] lg:min-h-0 flex flex-col">
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-2">銷售地點</label>
          <div className="flex gap-2">
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => setFormData({...formData, location: loc.id})}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${
                  formData.location === loc.id
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MapPin size={14} className="mr-1" />
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">客戶/學員</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                placeholder="輸入姓名"
                value={formData.customer}
                onChange={(e) => setFormData({...formData, customer: e.target.value})}
              />
              <Users size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2">付款方式</label>
             <div className="flex gap-2">
               {PAYMENT_METHODS.map(m => (
                 <button
                   key={m.id}
                   onClick={() => setFormData({...formData, paymentMethod: m.id})}
                   className={`flex-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                     formData.paymentMethod === m.id
                     ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                     : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   {m.name}
                 </button>
               ))}
             </div>
          </div>
        </div>

        <hr className="border-slate-100 my-2" />

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-2">項目類別</label>
          <div className="grid grid-cols-3 gap-2">
            {INCOME_CATEGORIES.filter(c => c !== '待確認').map(c => (
              <button
                key={c}
                onClick={() => setFormData({...formData, category: c})}
                className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all truncate ${
                  formData.category === c
                  ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {currentShortcuts.length > 0 && (
          <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in zoom-in duration-200">
            <label className="flex items-center text-[10px] font-bold text-blue-600 mb-2">
              <Zap size={12} className="mr-1 fill-blue-600" />
              快速帶入：{formData.category}
            </label>
            <div className="flex flex-wrap gap-2">
              {currentShortcuts.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyShortcut(sc)}
                  className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 text-xs rounded-md shadow-sm transition-all active:scale-95 flex items-center"
                >
                  <span className="font-medium">{sc.name}</span>
                  {sc.price !== '' && (
                    <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                      ${sc.price}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-auto">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">品項名稱</label>
              <input 
                type="text" 
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                placeholder="例如：OW 課程訂金"
                value={formData.item}
                onChange={(e) => setFormData({...formData, item: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
              />
            </div>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">金額</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-300 rounded-md text-sm font-mono font-bold text-slate-700"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
                />
              </div>
              <button 
                onClick={handleAddToCart}
                className="bg-blue-600 hover:bg-blue-700 text-white h-[38px] px-6 rounded-md font-medium transition-colors shadow-sm flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col shrink-0 h-auto lg:h-full shadow-inner min-h-[300px]">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex justify-between items-center">
          <span className="flex items-center"><ShoppingCart className="mr-2" size={16}/> 結帳清單</span>
          <span className="text-xs font-medium bg-white px-2 py-1 rounded border text-slate-500">
             {LOCATIONS.find(l => l.id === formData.location)?.name}
             <span className="mx-1">/</span>
             {PAYMENT_METHODS.find(m => m.id === formData.paymentMethod)?.name}
          </span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 max-h-[300px] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="text-center text-slate-400 py-8 flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-lg">
              <Store size={32} className="mb-2 opacity-20" />
              <span className="text-xs">尚未加入項目</span>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                <div className="overflow-hidden mr-2">
                  <div className="text-sm font-bold text-slate-800 truncate">{item.item}</div>
                  <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">{item.category}</div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-bold text-slate-700 font-mono text-sm">{formatCurrency(item.price)}</span>
                  <button 
                    onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 pt-3 mt-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-500 text-sm font-medium">總金額</span>
            <span className="text-xl font-bold text-blue-600 font-mono">{formatCurrency(total)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-2.5 rounded-lg font-bold text-base shadow-lg transition-all transform active:scale-95 ${
              cart.length > 0 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            確認結帳 ({currentUser ? currentUser.name : '櫃台'})
          </button>
        </div>
      </div>
    </div>
  );
};
