import React, { useState, useMemo } from 'react';
import { Users, Save, Edit2, Check, X } from 'lucide-react';
import { formatCurrency, formatPercent, hasPermission, generateId } from '../utils/helpers';
import { ROLES } from '../utils/constants';

export const Payroll = ({ users, payrolls, onUpdatePayroll, currentUser }: any) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const canEdit = hasPermission(currentUser.role, ROLES.ADMIN);

  // Filter users based on permission
  const visibleUsers = useMemo(() => {
    if (canEdit) {
      return users.filter((u: any) => u.role.id !== 'helper' && u.role.id !== 'creator');
    }
    return users.filter((u: any) => u.id === currentUser.id);
  }, [users, currentUser, canEdit]);

  const getPayrollForUser = (userId: string) => {
    return payrolls.find((p: any) => p.userId === userId && p.month === selectedMonth) || {
      userId,
      month: selectedMonth,
      baseSalary: 0,
      positionAllowance: 0,
      specialTask: 0,
      seniorityBonus: 0,
      teachingBonus: 0,
      leadingBonus: 0,
      insuredSalary: 0,
      pensionVoluntaryPercent: 0,
      healthInsuranceDependents: 0,
      laborInsuranceSelfPaid: 0,
      healthInsuranceSelfPaid: 0,
    };
  };

  const calculatePayroll = (p: any) => {
    const payableSalary = (p.baseSalary || 0) + (p.positionAllowance || 0) + (p.specialTask || 0) + (p.seniorityBonus || 0) + (p.teachingBonus || 0) + (p.leadingBonus || 0);
    const pensionVoluntary = Math.round((p.insuredSalary || 0) * ((p.pensionVoluntaryPercent || 0) / 100));
    const actualSalary = payableSalary - (p.laborInsuranceSelfPaid || 0) - (p.healthInsuranceSelfPaid || 0) - pensionVoluntary;
    return { payableSalary, pensionVoluntary, actualSalary };
  };

  const handleEdit = (userId: string) => {
    setEditingUserId(userId);
    setEditForm(getPayrollForUser(userId));
  };

  const handleSave = () => {
    if (!editForm.id) {
      editForm.id = generateId();
    }
    onUpdatePayroll(editForm);
    setEditingUserId(null);
  };

  const handleCancel = () => {
    setEditingUserId(null);
  };

  const handleChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const newForm = { ...editForm, [field]: numValue };
    
    if (field === 'insuredSalary' || field === 'healthInsuranceDependents') {
      const insured = field === 'insuredSalary' ? numValue : (newForm.insuredSalary || 0);
      const deps = field === 'healthInsuranceDependents' ? numValue : (newForm.healthInsuranceDependents || 0);
      
      newForm.laborInsuranceSelfPaid = Math.round(insured * 0.024);
      newForm.healthInsuranceSelfPaid = Math.round(insured * 0.0517 * 0.3 * (1 + Math.min(deps, 3)));
    }
    
    setEditForm(newForm);
  };

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-8 bg-slate-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-700 flex items-center">
            <Users className="mr-2 text-blue-600" /> 員工薪資管理
          </h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-500">選擇月份</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3">員工姓名</th>
                <th className="p-3 text-right">本薪設定</th>
                <th className="p-3 text-right">職務加給</th>
                <th className="p-3 text-right">特殊任務</th>
                <th className="p-3 text-right">年資獎金</th>
                <th className="p-3 text-right">教學紅利</th>
                <th className="p-3 text-right">帶團/領導獎金</th>
                <th className="p-3 text-right text-blue-600 font-bold">應發薪資</th>
                <th className="p-3 text-right">投保薪資</th>
                <th className="p-3 text-right">勞退自提(%)</th>
                <th className="p-3 text-right">健保眷屬(人)</th>
                <th className="p-3 text-right">勞保自付</th>
                <th className="p-3 text-right">健保自付(含眷屬)</th>
                <th className="p-3 text-right text-emerald-600 font-bold">實領薪資</th>
                {canEdit && <th className="p-3 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map((user: any) => {
                const isEditing = editingUserId === user.id;
                const p = isEditing ? editForm : getPayrollForUser(user.id);
                const { payableSalary, pensionVoluntary, actualSalary } = calculatePayroll(p);

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-700">{user.name}</td>
                    
                    {isEditing ? (
                      <>
                        <td className="p-2"><input type="number" value={p.baseSalary || ''} onChange={(e) => handleChange('baseSalary', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.positionAllowance || ''} onChange={(e) => handleChange('positionAllowance', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.specialTask || ''} onChange={(e) => handleChange('specialTask', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.seniorityBonus || ''} onChange={(e) => handleChange('seniorityBonus', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.teachingBonus || ''} onChange={(e) => handleChange('teachingBonus', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.leadingBonus || ''} onChange={(e) => handleChange('leadingBonus', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-3 text-right font-mono font-bold text-blue-600">{formatCurrency(payableSalary)}</td>
                        <td className="p-2"><input type="number" value={p.insuredSalary || ''} onChange={(e) => handleChange('insuredSalary', e.target.value)} className="w-20 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.pensionVoluntaryPercent || ''} onChange={(e) => handleChange('pensionVoluntaryPercent', e.target.value)} className="w-16 p-1 border rounded text-right" /></td>
                        <td className="p-2"><input type="number" value={p.healthInsuranceDependents || ''} onChange={(e) => handleChange('healthInsuranceDependents', e.target.value)} className="w-16 p-1 border rounded text-right" /></td>
                        <td className="p-3 text-right font-mono text-slate-500 bg-slate-50 rounded">{formatCurrency(p.laborInsuranceSelfPaid || 0)}</td>
                        <td className="p-3 text-right font-mono text-slate-500 bg-slate-50 rounded">{formatCurrency(p.healthInsuranceSelfPaid || 0)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(actualSalary)}</td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          <button onClick={handleSave} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check size={18} /></button>
                          <button onClick={handleCancel} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={18} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.baseSalary)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.positionAllowance)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.specialTask)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.seniorityBonus)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.teachingBonus)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.leadingBonus)}</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-600">{formatCurrency(payableSalary)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.insuredSalary)}</td>
                        <td className="p-3 text-right font-mono">{formatPercent((p.pensionVoluntaryPercent || 0) / 100)}</td>
                        <td className="p-3 text-right font-mono">{p.healthInsuranceDependents || 0}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.laborInsuranceSelfPaid)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.healthInsuranceSelfPaid)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(actualSalary)}</td>
                        {canEdit && (
                          <td className="p-3 text-center">
                            <button onClick={() => handleEdit(user.id)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-slate-400">無員工資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
