import React, { useState } from 'react';
import { MaterialRequest, RequestStatus, AppRole, RequestItem, Expense } from '../types';
import { ClockIcon, ExternalLinkIcon, TrashIcon, EditIcon, BuildingIcon, WalletIcon, UserIcon, CameraIcon } from './Icons';
import { api } from '../services/apiService';

interface RequestCardProps {
  request: MaterialRequest;
  role: AppRole;
  onUpdateItems: (requestId: string, items: RequestItem[]) => void;
  onAddExpense: (requestId: string, expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (request: MaterialRequest) => void;
  onCancel?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
  isScanning: boolean;
  scanningRequestId: string | null;
  onScanReceipt: (requestId: string, file: File) => void;
}

const statusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'Ожидает',
  [RequestStatus.PARTIAL]: 'В процессе',
  [RequestStatus.COMPLETED]: 'Завершено',
  [RequestStatus.CANCELLED]: 'Отменено'
};

const formatDateTime = (ts: number) => {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  role, 
  onUpdateItems, 
  onAddExpense, 
  onUpdateExpense,
  onDeleteExpense,
  onDelete, 
  onEdit,
  onMarkComplete,
  isScanning,
  scanningRequestId,
  onScanReceipt
}) => {
  const isPurchaser = role === 'PURCHASER';
  const canEdit = !isPurchaser && (request.status === RequestStatus.PENDING || request.status === RequestStatus.PARTIAL);
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleItem = (itemId: string) => {
    if (!isPurchaser) return;
    const newItems = (request.items || []).map(item => {
      if (item.id === itemId) {
        const isBought = !item.isBought;
        return { 
          ...item, 
          isBought, 
          boughtAt: isBought ? Date.now() : undefined 
        };
      }
      return item;
    });
    onUpdateItems(request.id, newItems);
  };

  const handleExpenseSubmit = () => {
    const amount = parseFloat(expenseAmount) || 0;
    
    if (editingExpenseId && onUpdateExpense) {
      const original = (request.expenses || []).find(e => e.id === editingExpenseId);
      if (original) {
        onUpdateExpense({
          ...original,
          amount
        });
      }
    } else {
      onAddExpense(request.id, { 
        amount 
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setExpenseAmount('');
    setEditingExpenseId(null);
    setShowExpenseForm(false);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseAmount(exp.amount.toString());
    setShowExpenseForm(true);
  };

  const totalSum = (request.expenses || []).reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 mb-4 transition-all ${
      request.status === RequestStatus.COMPLETED ? 'border-emerald-100 bg-emerald-50/20' : 
      request.status === RequestStatus.CANCELLED ? 'border-red-100 bg-red-50/10' : 'border-slate-200'
    }`}>
      {/* Top Info Bar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">#{request.id.slice(-4)}</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
            request.status === RequestStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
            request.status === RequestStatus.CANCELLED ? 'bg-red-100 text-red-700' :
            request.status === RequestStatus.PARTIAL ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {statusLabels[request.status]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 rounded-full shadow-sm">
          <UserIcon />
          <span className="text-[10px] font-black text-white uppercase tracking-tight">{request.userName}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <BuildingIcon />
            <span className="font-black text-slate-900 text-sm leading-tight">{request.projectName}</span>
          </div>
        </div>
        <div className="flex gap-1">
           {canEdit && onEdit && (
            <button onClick={() => onEdit(request)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
              <EditIcon />
            </button>
           )}
           {onDelete && (
            <button onClick={() => onDelete(request.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              <TrashIcon />
            </button>
           )}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2 mb-4">
        {(request.items || []).map(item => (
          <div 
            key={item.id} 
            onClick={() => isPurchaser && toggleItem(item.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              item.isBought ? 'bg-emerald-50 border-emerald-100 opacity-70' : 'bg-white border-slate-100 shadow-sm'
            } ${isPurchaser ? 'cursor-pointer hover:border-indigo-300' : ''}`}
          >
            {isPurchaser && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
                className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                  item.isBought ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'
                }`}
              >
                {item.isBought && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            )}
            
            <div className="flex-1 flex justify-between items-center gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`font-bold text-sm leading-tight truncate ${item.isBought ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {item.name}
                  </div>
                  {item.link && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className="p-1 text-indigo-500 hover:bg-indigo-100 rounded transition-colors flex-shrink-0"
                    >
                      <ExternalLinkIcon />
                    </a>
                  )}
                </div>
                {item.isBought && item.boughtAt && (
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 animate-in fade-in duration-300">
                    Куплено: {formatDateTime(item.boughtAt)}
                  </span>
                )}
              </div>
              
              <div className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-tight shadow-sm border transition-all ${
                item.isBought 
                  ? 'bg-slate-100 text-slate-400 border-slate-200' 
                  : 'bg-white text-indigo-700 border-indigo-100'
              }`}>
                {item.quantity}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expenses Display */}
      {(request.expenses || []).length > 0 && (
        <div className="mb-4 pt-4 border-t border-slate-100">
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
               <WalletIcon /> Затраты
             </div>
             <span className="text-sm font-black text-slate-900">{totalSum.toLocaleString('de-DE')} €</span>
           </div>
           <div className="space-y-2">
              {(request.expenses || []).map((exp) => (
                <div key={exp.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1.5 text-xs shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 font-black text-slate-800">
                      {exp.shopName ? (
                        <>
                          <span className="p-1 bg-amber-500 text-white rounded-lg text-[9px] uppercase tracking-wider font-extrabold px-1.5">Чек</span>
                          <span className="text-slate-900 font-extrabold uppercase tracking-tight">{exp.shopName}</span>
                        </>
                      ) : (
                        <>
                          <span className="p-1 bg-slate-300 text-slate-700 rounded-lg text-[9px] uppercase tracking-wider font-extrabold px-1.5">Расход</span>
                          <span className="text-slate-600 font-extrabold">Ручной ввод</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-900 bg-white border px-3 py-1 rounded-xl text-xs shadow-sm">{exp.amount} €</span>
                      {isPurchaser && (
                        <div className="flex gap-1 border-l pl-2 border-slate-200">
                          <button onClick={() => handleStartEditExpense(exp)} className="text-indigo-500 p-1 hover:bg-indigo-100 rounded-lg transition-colors">
                             <EditIcon />
                          </button>
                          <button onClick={() => onDeleteExpense?.(exp.id)} className="text-red-500 p-1 hover:bg-red-100 rounded-lg transition-colors">
                             <TrashIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {exp.items && exp.items.length > 0 && (
                    <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
                      <details className="group">
                        <summary className="text-[10px] text-indigo-600 font-black hover:text-indigo-800 cursor-pointer flex justify-between items-center select-none uppercase tracking-wider">
                          <span>Показать товары из чека ({exp.items.length})</span>
                          <span className="transition-transform group-open:rotate-180 text-[8px]">▼</span>
                        </summary>
                        <div className="mt-2 space-y-1.5 pl-1 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto">
                          {exp.items.map((it: any, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-4 border-b border-slate-100/50 pb-1 last:border-0 last:pb-0 text-xs">
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-bold text-slate-700 block">{it.name}</span>
                                {it.price !== undefined && it.price !== null && (
                                  <span className="text-[9px] text-indigo-500 font-bold block">{it.price} €</span>
                                )}
                              </div>
                              <span className="font-black shrink-0 text-slate-500 text-[10px] bg-slate-50 border px-1.5 py-0.5 rounded-lg">{it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  <div className="text-[8px] text-slate-400 font-bold mt-1.5">
                    Добавлен: {formatDateTime(exp.createdAt)}
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-black uppercase tracking-widest">
            <ClockIcon /> Создано: {formatDateTime(request.createdAt)}
          </div>
          {request.status === RequestStatus.COMPLETED && request.completedAt && (
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-black uppercase tracking-widest animate-in fade-in">
              <ClockIcon /> Завершено: {formatDateTime(request.completedAt)}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 items-center">
            {isPurchaser && request.status !== RequestStatus.CANCELLED && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onScanReceipt(request.id, file);
                    }
                    if (e.target) e.target.value = '';
                  }} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-amber-100 active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CameraIcon />
                  {(isScanning && scanningRequestId === request.id) ? 'Сканирование...' : 'Сканировать Чек'}
                </button>
                <button 
                  onClick={() => {
                    if (showExpenseForm) resetForm();
                    else setShowExpenseForm(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100 active:scale-95"
                >
                  {showExpenseForm ? 'Отмена' : '+ Расход'}
                </button>
                {request.status !== RequestStatus.COMPLETED && (
                   <button 
                    onClick={() => onMarkComplete?.(request.id)}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                  >
                    Завершить
                  </button>
                )}
              </>
            )}
        </div>

        {showExpenseForm && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 mt-2">
            <div className="flex justify-between items-center mb-3">
               <p className="text-[9px] font-black text-indigo-900/40 uppercase tracking-[0.2em]">
                 {editingExpenseId ? 'Редактировать расход' : 'Добавить сумму'}
               </p>
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Сумма €" 
                className="flex-1 px-4 py-2 rounded-lg border text-sm font-black outline-none transition-colors bg-white border-indigo-200"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
              />
              <button 
                onClick={handleExpenseSubmit}
                disabled={!expenseAmount}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default RequestCard;
