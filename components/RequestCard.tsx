
import React, { useState } from 'react';
import { MaterialRequest, RequestStatus, AppRole, RequestItem, Expense } from '../types';
import { ClockIcon, ExternalLinkIcon, TrashIcon, CameraIcon, EditIcon, BuildingIcon, WalletIcon, UserIcon } from './Icons';
import { api } from '../services/apiService';
import { analyzeReceipt } from '../services/geminiService';

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
  onCancel,
  onMarkComplete
}) => {
  const isPurchaser = role === 'PURCHASER';
  const canEdit = !isPurchaser && (request.status === RequestStatus.PENDING || request.status === RequestStatus.PARTIAL);
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [pendingReceiptUrl, setPendingReceiptUrl] = useState<string | undefined>(undefined);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleItem = (itemId: string) => {
    if (!isPurchaser) return;
    const newItems = request.items.map(item => 
      item.id === itemId ? { ...item, isBought: !item.isBought } : item
    );
    onUpdateItems(request.id, newItems);
  };

  const handleExpenseSubmit = () => {
    const amount = parseFloat(expenseAmount) || 0;
    
    if (editingExpenseId && onUpdateExpense) {
      const original = request.expenses.find(e => e.id === editingExpenseId);
      if (original) {
        onUpdateExpense({
          ...original,
          amount,
          receiptImage: pendingReceiptUrl || original.receiptImage
        });
      }
    } else {
      onAddExpense(request.id, { 
        amount, 
        receiptImage: pendingReceiptUrl 
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setExpenseAmount('');
    setPendingReceiptUrl(undefined);
    setEditingExpenseId(null);
    setShowExpenseForm(false);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseAmount(exp.amount.toString());
    setPendingReceiptUrl(exp.receiptImage);
    setShowExpenseForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const [cloudUrl, base64Data] = await Promise.all([
          api.uploadPhoto(file),
          base64Promise
        ]);
        
        setPendingReceiptUrl(cloudUrl);
        
        setIsAnalyzing(true);
        try {
          const result = await analyzeReceipt(base64Data);
          if (result.total) {
            setExpenseAmount(result.total.toString());
          }
        } catch (aiErr) {
          console.error("AI analysis failed", aiErr);
        } finally {
          setIsAnalyzing(false);
        }
      } catch (err) {
        alert("Ошибка загрузки фото. Проверьте бакет в Supabase.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const totalSum = request.expenses.reduce((acc, exp) => acc + exp.amount, 0);

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
        {request.items.map(item => (
          <div 
            key={item.id} 
            onClick={() => isPurchaser && toggleItem(item.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              item.isBought ? 'bg-emerald-50 border-emerald-100 opacity-70' : 'bg-white border-slate-100 shadow-sm'
            } ${isPurchaser ? 'cursor-pointer hover:border-indigo-300' : ''}`}
          >
            {isPurchaser && (
              <div className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                item.isBought ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'
              }`}>
                {item.isBought && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
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
      {request.expenses.length > 0 && (
        <div className="mb-4 pt-4 border-t border-slate-100">
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
               <WalletIcon /> Чеки и затраты
             </div>
             <span className="text-sm font-black text-slate-900">{totalSum.toLocaleString('de-DE')} €</span>
           </div>
           <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {request.expenses.map((exp) => (
                <div key={exp.id} className="flex-shrink-0 flex flex-col items-center">
                  <div className="relative group w-16 h-16">
                    {exp.receiptImage ? (
                      <img src={exp.receiptImage} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold">НЕТ ФОТО</div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded-lg transition-opacity">
                      {isPurchaser && (
                        <>
                          <button onClick={() => handleStartEditExpense(exp)} className="p-1.5 bg-white/20 rounded-md text-white hover:bg-white/40">
                             <EditIcon />
                          </button>
                          <button onClick={() => onDeleteExpense?.(exp.id)} className="p-1.5 bg-red-500/80 rounded-md text-white hover:bg-red-600">
                             <TrashIcon />
                          </button>
                        </>
                      )}
                      {!isPurchaser && exp.receiptImage && (
                        <button onClick={() => window.open(exp.receiptImage)} className="text-[8px] text-white font-black uppercase">Открыть</button>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-600 mt-1.5">{exp.amount} €</span>
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
        </div>
        
        <div className="flex justify-end gap-2">
            {isPurchaser && request.status !== RequestStatus.CANCELLED && (
              <>
                <button 
                  onClick={() => {
                    if (showExpenseForm) resetForm();
                    else setShowExpenseForm(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100 active:scale-95"
                >
                  {showExpenseForm ? 'Отмена' : '+ Чек'}
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
                 {editingExpenseId ? 'Редактировать расход' : 'Новый чек'}
               </p>
               {isAnalyzing && (
                 <span className="text-[8px] font-black text-indigo-600 animate-pulse uppercase">Анализ чека...</span>
               )}
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Сумма €" 
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-black outline-none transition-colors ${isAnalyzing ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-indigo-200'}`}
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                disabled={isUploading || isAnalyzing}
              />
              <label className={`flex items-center justify-center p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all ${(isUploading || isAnalyzing) ? 'opacity-50' : ''}`}>
                {pendingReceiptUrl ? <div className="w-4 h-4 bg-emerald-500 rounded-full" title="Фото прикреплено" /> : <CameraIcon />}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={isUploading || isAnalyzing} />
              </label>
              <button 
                onClick={handleExpenseSubmit}
                disabled={isUploading || isAnalyzing || !expenseAmount}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
              >
                ОК
              </button>
            </div>
            {pendingReceiptUrl && (
              <div className="mt-2 text-[8px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                Фото готово к сохранению
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCard;
