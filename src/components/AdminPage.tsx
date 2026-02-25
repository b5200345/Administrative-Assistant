import React, { useState } from 'react';
import { Shield, Plus, UserPlus } from 'lucide-react';
import { ROLES } from '../utils/constants';
import { hasPermission } from '../utils/helpers';

export const AdminPage = ({ users, onUpdateRole, onAddUser, currentUser }: any) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: ROLES.STAFF.id });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      const role = Object.values(ROLES).find(r => r.id === newUser.role) || ROLES.STAFF;
      onAddUser({
        id: `u${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: role
      });
      setNewUser({ name: '', email: '', role: ROLES.STAFF.id });
      setShowAddForm(false);
    }
  };

  const canManageUsers = hasPermission(currentUser.role, ROLES.ADMIN);

  if (!canManageUsers) {
    return (
      <div className="h-full bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center text-slate-500">您沒有權限存取此頁面。</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
       <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold text-slate-800 flex items-center">
                 <Shield className="mr-2 text-blue-600"/> 系統權限管理
               </h2>
               <p className="text-sm text-slate-500 mt-1">管理員可在此分配 Google 帳號的系統操作權限。</p>
             </div>
             <button 
               onClick={() => setShowAddForm(!showAddForm)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center text-sm"
             >
               {showAddForm ? '取消新增' : <><UserPlus size={16} className="mr-2" /> 新增使用者</>}
             </button>
          </div>

          {showAddForm && (
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">使用者名稱</label>
                  <input 
                    type="text" 
                    required
                    placeholder="例如：王小明"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">電子郵件 (登入帳號)</label>
                  <input 
                    type="email" 
                    required
                    placeholder="email@example.com"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">權限角色</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    {Object.values(ROLES).filter(r => r.id !== 'creator').map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center text-sm h-[38px]">
                    <Plus size={16} className="mr-1" /> 確認新增
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                      <th className="p-4">使用者名稱 / Google 帳號</th>
                      <th className="p-4">當前權限角色</th>
                      <th className="p-4 text-right">操作</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {users.filter((u: any) => u.role.id !== 'creator').map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                         <td className="p-4">
                            <div className="font-bold text-slate-700">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                         </td>
                         <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                               ${u.role.id === 'creator' ? 'bg-purple-100 text-purple-700' :
                                 u.role.id === 'admin' ? 'bg-red-100 text-red-700' :
                                 u.role.id === 'manager' ? 'bg-orange-100 text-orange-700' :
                                 u.role.id === 'store_manager' ? 'bg-blue-100 text-blue-700' :
                                 u.role.id === 'staff' ? 'bg-green-100 text-green-700' :
                                 'bg-slate-100 text-slate-600'
                               }`}>
                               {u.role.label}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <select 
                               className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none"
                               value={u.role.id}
                               onChange={(e) => {
                                  const newRole = Object.values(ROLES).find(r => r.id === e.target.value);
                                  onUpdateRole(u.id, newRole);
                               }}
                            >
                               {Object.values(ROLES).filter(r => r.id !== 'creator').map(r => (
                                  <option key={r.id} value={r.id}>{r.label}</option>
                               ))}
                            </select>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};
