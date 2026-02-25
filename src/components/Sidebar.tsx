import React from 'react';
import { LayoutDashboard, Store, Receipt, Landmark, FileText, Settings, UserCircle, Shield, Upload, LogOut, Users } from 'lucide-react';
import { TABS, ROLES } from '../utils/constants';
import { hasPermission } from '../utils/helpers';

export const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout }: any) => {
  const menuItems = [
    { id: TABS.DASHBOARD, icon: LayoutDashboard, label: '總覽儀表板', minRole: ROLES.HELPER },
    { id: TABS.POS, icon: Store, label: '櫃台結帳', minRole: ROLES.HELPER },
    { id: TABS.EXPENSES, icon: Receipt, label: '費用管理中心', minRole: ROLES.STAFF },
    { id: TABS.BANK_IMPORT, icon: Upload, label: '銀行匯入', minRole: ROLES.STAFF },
    { id: TABS.BANK, icon: Landmark, label: '銀行與勾稽', minRole: ROLES.STAFF },
    { id: TABS.REPORTS, icon: FileText, label: '財務報表', minRole: ROLES.HELPER },
    { id: TABS.PAYROLL, icon: Users, label: '員工薪資', minRole: ROLES.STAFF },
  ];

  return (
    <div className="w-16 lg:w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 shadow-xl">
      <div className="p-3 flex items-center justify-center lg:justify-start lg:space-x-3 border-b border-slate-700 h-14">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shrink-0">iD</div>
        <span className="hidden lg:block font-bold text-lg tracking-wider truncate">iDiving</span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.filter(item => hasPermission(currentUser.role, item.minRole)).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full p-3 flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 hover:bg-slate-800 transition-colors ${
              activeTab === item.id ? 'bg-blue-600 border-r-4 border-blue-300' : 'text-slate-400'
            }`}
          >
            <item.icon size={20} className="shrink-0" />
            <span className="hidden lg:block font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {hasPermission(currentUser.role, ROLES.ADMIN) && (
         <button
            onClick={() => setActiveTab(TABS.ADMIN_PAGE)}
            className={`w-full p-3 flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 hover:bg-slate-800 transition-colors border-t border-slate-700 ${
              activeTab === TABS.ADMIN_PAGE ? 'bg-slate-800 text-white border-r-4 border-slate-500' : 'text-slate-400'
            }`}
          >
            <Settings size={20} className="shrink-0" />
            <span className="hidden lg:block font-medium text-sm">系統權限管理</span>
         </button>
      )}

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 text-slate-200">
              <UserCircle size={20} />
            </div>
            <div className="overflow-hidden hidden lg:block">
              <p className="text-xs font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate flex items-center">
                <Shield size={10} className="mr-1"/>
                {currentUser.role.label}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 p-1 rounded-md transition-colors hidden lg:block"
            title="登出"
          >
            <LogOut size={16} />
          </button>
        </div>
        <button 
          onClick={onLogout}
          className="w-full mt-2 text-slate-400 hover:text-red-400 p-2 rounded-md transition-colors flex justify-center lg:hidden"
          title="登出"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
