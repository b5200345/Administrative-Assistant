import React, { useState, useMemo, useEffect } from 'react';
import { Store, AlertCircle, FileText } from 'lucide-react';
import { generateId, formatCurrency } from './utils/helpers';
import { TABS, ROLES } from './utils/constants';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from './utils/firebase';

import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/Shared';
import { POS } from './components/POS';
import { ExpensesManager } from './components/ExpensesManager';
import { BankImport } from './components/BankImport';
import { Reconciliation } from './components/Reconciliation';
import { Reports } from './components/Reports';
import { Payroll } from './components/Payroll';
import { AdminPage } from './components/AdminPage';
import { Login } from './components/Login';

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
    const [currentUser, setCurrentUser] = useState<any>({ name: '管理員', email: 'admin@idiving.tw', role: ROLES.ADMIN, roleLabel: '管理員' }); 
    
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bankRecords, setBankRecords] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    useEffect(() => {
        const initData = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            if (usersSnap.empty) {
                const batch = writeBatch(db);
                const defaultUsers = [
                    { id: 'u0', name: '系統製作者', email: 'b5200345@gmail.com', role: ROLES.CREATOR },
                    { id: 'u1', name: '管理員', email: 'admin@idiving.tw', role: ROLES.ADMIN },
                    { id: 'u2', name: '店長', email: 'manager@idiving.tw', role: ROLES.STORE_MANAGER },
                    { id: 'u3', name: '阿甘', email: 'agan@idiving.tw', role: ROLES.STAFF },
                    { id: 'u4', name: '小幫手', email: 'helper@idiving.tw', role: ROLES.HELPER },
                ];
                defaultUsers.forEach(u => batch.set(doc(db, 'users', u.id), u));
                await batch.commit();
            }
        };
        initData();

        const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => setTransactions(snap.docs.map(d => d.data() as any)));
        const unsubBank = onSnapshot(collection(db, 'bankRecords'), (snap) => setBankRecords(snap.docs.map(d => d.data() as any)));
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => d.data() as any)));
        const unsubPayroll = onSnapshot(collection(db, 'payrolls'), (snap) => setPayrolls(snap.docs.map(d => d.data() as any)));

        setIsDataLoaded(true);

        return () => { unsubTx(); unsubBank(); unsubUsers(); unsubPayroll(); };
    }, []);

    const handleLogin = (email: string) => {
      const user = users.find(u => u.email === email);
      if (user) {
        setCurrentUser({ ...user, roleLabel: user.role.label });
        setIsAuthenticated(true);
      } else {
        alert('登入失敗：您的帳號不在系統授權名單中，請聯絡管理員。');
      }
    };

    const handleLogout = () => {
      setIsAuthenticated(false);
      setActiveTab(TABS.DASHBOARD);
    };

    const handleAddTransaction = async (newTx: any) => {
        if (Array.isArray(newTx)) {
            const batch = writeBatch(db);
            newTx.forEach(tx => batch.set(doc(db, 'transactions', tx.id), tx));
            await batch.commit();
        } else {
            await setDoc(doc(db, 'transactions', newTx.id), newTx);
        }
    }; 
    const handleDeleteTransaction = async (id: any) => {
        await deleteDoc(doc(db, 'transactions', id));
    };
    
    const handleQuickCreateTransaction = async (bankRecord: any) => {
      let normalizedDate = bankRecord.date;
      try { const d = new Date(bankRecord.date); if (!isNaN(d.getTime())) normalizedDate = d.toISOString().split('T')[0]; } catch (e) {}
      const newTx = { id: generateId(), date: normalizedDate, type: 'income', category: bankRecord.suggestedCategory || '銷售', amount: bankRecord.amount, method: 'transfer', customer: '待確認', status: 'completed', reconciled: true, createdBy: '系統自動補登', location: 'qiangang', description: `[銀行] ${bankRecord.description}` };
      
      const batch = writeBatch(db);
      batch.set(doc(db, 'transactions', newTx.id), newTx);
      batch.update(doc(db, 'bankRecords', bankRecord.id), { matchedTransactionId: newTx.id });
      await batch.commit();
      alert('已補登並勾稽！');
    };
    const handleBatchDisburse = async (ids: any[], last5: string) => { 
        const now = new Date().toISOString(); 
        const batch = writeBatch(db);
        ids.forEach(id => {
            const t = transactions.find(tx => tx.id === id);
            if (t) {
                batch.update(doc(db, 'transactions', id), { 
                    status: 'pending_reconciliation', 
                    disbursementDate: now, 
                    outgoingAccountLast5: t.payoutMethod === 'transfer' ? last5 : undefined 
                });
            }
        });
        await batch.commit();
    };
    const handleReconcile = async (sId: string, bId: string) => { 
        const batch = writeBatch(db);
        batch.update(doc(db, 'transactions', sId), { reconciled: true, status: 'completed' });
        batch.update(doc(db, 'bankRecords', bId), { matchedTransactionId: sId });
        await batch.commit();
    };
    const handleAutoReconcile = () => { alert('自動勾稽功能已啟用 (模擬)'); };
    const handleImportBankRecords = async (recs: any[]) => { 
        const batch = writeBatch(db);
        recs.forEach(r => batch.set(doc(db, 'bankRecords', r.id), r));
        await batch.commit();
        setActiveTab(TABS.BANK); 
    };
    
    const handleUpdateRole = async (userId: string, newRole: any) => {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
        if (currentUser.email === users.find(u => u.id === userId)?.email) {
             setCurrentUser(prev => ({...prev, role: newRole, roleLabel: newRole.label}));
        }
    };

    const handleUpdatePayroll = async (payrollData: any) => {
        await setDoc(doc(db, 'payrolls', payrollData.id), payrollData);
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const income = transactions.filter(t => t.type === 'income' && t.date.startsWith(today)).reduce((a, b) => a + b.amount, 0);
        return { todaySales: income, pendingReconcile: transactions.filter(t => !t.reconciled).length, pendingExpense: transactions.filter(t => t.type === 'expense' && !t.reconciled).length };
    }, [transactions]);

    if (!isDataLoaded) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <div className="text-slate-500 font-bold tracking-widest">載入資料庫中...</div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
            <main className="flex-1 ml-16 lg:ml-64 p-3 lg:p-6 h-screen overflow-hidden flex flex-col">
                <header className="mb-4 flex justify-between items-center shrink-0">
                    <div className="overflow-hidden"><h1 className="text-lg md:text-xl font-bold text-slate-700 truncate">iDiving 財務管理系統</h1><p className="text-slate-400 text-[10px] md:text-xs">Financial Management System</p></div>
                    <div className="hidden md:flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100"><div className="text-right leading-tight"><p className="text-[10px] text-slate-400">系統時間</p><p className="font-mono font-bold text-sm text-slate-700">{new Date().toLocaleDateString()}</p></div></div>
                </header>
                <div className="flex-1 overflow-y-auto min-h-0">
                    {activeTab === TABS.DASHBOARD && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="今日營收" value={formatCurrency(stats.todaySales)} icon={Store} color="bg-blue-500" />
                                <StatCard title="待勾稽帳款" value={`${stats.pendingReconcile} 筆`} subtext="含匯款與支出" icon={AlertCircle} color="bg-amber-500" />
                                <StatCard title="待審核支出" value={`${stats.pendingExpense} 筆`} icon={FileText} color="bg-purple-500" />
                            </div>
                        </div>
                    )}
                    {activeTab === TABS.POS && <POS onAddTransaction={handleAddTransaction} currentUser={currentUser} />}
                    {activeTab === TABS.EXPENSES && <ExpensesManager transactions={transactions} onAddTransaction={handleAddTransaction} onBatchDisburse={handleBatchDisburse} onDelete={handleDeleteTransaction} currentUser={currentUser} />}
                    {activeTab === TABS.BANK_IMPORT && <BankImport onImport={handleImportBankRecords} currentUser={currentUser} />}
                    {activeTab === TABS.BANK && <Reconciliation transactions={transactions} bankRecords={bankRecords} onReconcile={handleReconcile} onAddBankRecord={handleQuickCreateTransaction} onAutoReconcile={handleAutoReconcile} currentUser={currentUser} />}
                    {activeTab === TABS.REPORTS && <Reports transactions={transactions} bankRecords={bankRecords} payrolls={payrolls} currentUser={currentUser} />}
                    {activeTab === TABS.PAYROLL && <Payroll users={users} payrolls={payrolls} onUpdatePayroll={handleUpdatePayroll} currentUser={currentUser} />}
                    {activeTab === TABS.ADMIN_PAGE && <AdminPage users={users} onUpdateRole={handleUpdateRole} onAddUser={async (newUser: any) => { await setDoc(doc(db, 'users', newUser.id), newUser); }} currentUser={currentUser} />}
                </div>
            </main>
        </div>
    );
};

export default App;
