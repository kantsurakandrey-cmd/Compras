import React, { useState, useEffect, useMemo } from 'react';
import { MaterialRequest, RequestStatus, User, RequestItem, Expense, Project } from './types';
import RequestCard from './components/RequestCard';
import { PlusIcon, UserIcon, TrashIcon, LogOutIcon, BuildingIcon, DatabaseIcon, ClockIcon, WalletIcon, CameraIcon } from './components/Icons';
import { api } from './services/apiService';

type SortType = 'date' | 'project';
type TabType = 'active' | 'archive' | 'settings';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<'users' | 'projects'>('users');
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);

  // Form State
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [formItems, setFormItems] = useState<RequestItem[]>([{ id: '1', name: '', quantity: '', isBought: false }]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const refreshData = async () => {
    try {
      const [u, p, r] = await Promise.all([
        api.getUsers(),
        api.getProjects(),
        api.getRequests()
      ]);
      setUsers(u);
      setProjects(p);
      setRequests(r);
      return u;
    } catch (err) {
      console.error("Data refresh failed", err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await api.init();
      const u = await refreshData();

      const savedSession = localStorage.getItem('stroy_session_v4');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        const found = u.find(user => user.name === session.name);
        if (found) setCurrentUser(found);
      }
      setIsLoading(false);

      const subscription = api.subscribeToRequests(() => {
        refreshData();
      });

      return () => {
        api.unsubscribe();
      };
    };
    init();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.name === loginName && u.password === loginPass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('stroy_session_v4', JSON.stringify(user));
      setLoginError('');
    } else {
      setLoginError('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('stroy_session_v4');
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserPass.trim()) return;
    const newUser: User = { 
      id: '', 
      name: newUserName.trim(), 
      password: newUserPass.trim(),
      role: 'REQUESTOR' 
    };
    await api.saveUser(newUser);
    setNewUserName('');
    setNewUserPass('');
    await refreshData();
  };

  const handleDeleteUser = async (id: string) => {
    if (users.find(u => u.id === id)?.name === 'admin') return alert("Нельзя удалить админа");
    if (window.confirm("Удалить сотрудника?")) {
      await api.deleteUser(id);
      await refreshData();
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = { id: '', name: newProjectName.trim(), isActive: true };
    await api.saveProject(newProject);
    setNewProjectName('');
    await refreshData();
  };

  const handleToggleProject = async (p: Project) => {
    await api.updateProject({ ...p, isActive: !p.isActive });
    await refreshData();
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Удалить объект?")) {
      await api.deleteProject(id);
      await refreshData();
    }
  };

  const handleOpenForm = (req?: MaterialRequest) => {
    if (req) {
      setEditingRequest(req);
      setSelectedProjectId(req.projectName);
      setFormItems(req.items);
    } else {
      setEditingRequest(null);
      const active = projects.filter(p => p.isActive);
      setSelectedProjectId(active[0]?.name || '');
      setFormItems([{ id: Math.random().toString(36).substr(2, 5), name: '', quantity: '', isBought: false }]);
    }
    setIsFormOpen(true);
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedProjectId) return;

    if (editingRequest) {
      await api.updateRequest({ ...editingRequest, projectName: selectedProjectId, items: formItems });
    } else {
      const newReq: MaterialRequest = {
        id: '', 
        userId: currentUser.id,
        userName: currentUser.name,
        projectName: selectedProjectId,
        items: formItems,
        status: RequestStatus.PENDING,
        createdAt: Date.now(),
        expenses: []
      };
      await api.saveRequest(newReq);
    }
    setIsFormOpen(false);
    await refreshData();
  };

  const handleUpdateItems = async (requestId: string, items: RequestItem[]) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const allBought = items.every(i => i.isBought);
    const someBought = items.some(i => i.isBought);
    let status = RequestStatus.PENDING;
    if (allBought) status = RequestStatus.COMPLETED;
    else if (someBought) status = RequestStatus.PARTIAL;

    await api.updateRequest({ ...req, items, status, completedAt: allBought ? Date.now() : req.completedAt });
    await refreshData();
  };

  const handleAddExpense = async (requestId: string, exp: Omit<Expense, 'id' | 'createdAt'>) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const newExpense: Expense = { ...exp, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() };
    await api.updateRequest({ ...req, expenses: [...req.expenses, newExpense] });
    await refreshData();
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm("Удалить заявку?")) {
      await api.deleteRequest(id);
      await refreshData();
    }
  };

  const handleMarkComplete = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    await api.updateRequest({ ...req, status: RequestStatus.COMPLETED, completedAt: Date.now() });
    await refreshData();
  };

  const filteredRequests = useMemo(() => {
    if (!currentUser) return { active: [], archive: [] };
    const base = currentUser.role === 'PURCHASER' ? requests : requests.filter(r => r.userId === currentUser.id);
    const active = base.filter(r => r.status !== RequestStatus.COMPLETED && r.status !== RequestStatus.CANCELLED);
    const archive = base.filter(r => r.status === RequestStatus.COMPLETED || r.status === RequestStatus.CANCELLED);
    
    const sortFn = (a: MaterialRequest, b: MaterialRequest) => {
      if (sortBy === 'date') return (b.completedAt || b.createdAt) - (a.createdAt);
      return a.projectName.localeCompare(b.projectName);
    };

    return { active: active.sort(sortFn), archive: archive.sort(sortFn) };
  }, [requests, currentUser, sortBy]);

  // Безопасная проверка переменных окружения
  const getEnvValid = (key: string) => {
    try {
      // Ищем в process.env (в Vite прокидывается через define)
      const val = (process.env as any)[key];
      return !!val && val !== 'undefined' && val !== '';
    } catch {
      return false;
    }
  };

  const envDiagnostics = {
    supabaseUrl: getEnvValid('VITE_SUPABASE_URL'),
    supabaseKey: getEnvValid('VITE_SUPABASE_ANON_KEY'),
    geminiKey: getEnvValid('API_KEY')
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-900 animate-pulse uppercase tracking-widest text-center px-4">Система загружается...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
          <h1 className="text-4xl font-black text-indigo-900 mb-2 text-center">СтройЗакуп</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-10">Система снабжения</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Логин" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold bg-slate-50 focus:border-indigo-300 transition-colors" value={loginName} onChange={e => setLoginName(e.target.value)} required />
            <input type="password" placeholder="Пароль" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold bg-slate-50 focus:border-indigo-300 transition-colors" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
            {loginError && <p className="text-xs text-red-500 font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest active:scale-[0.98]">Войти</button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
             <p className="text-[10px] font-bold text-slate-300 uppercase">Production v4.6 • Cloud Native</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white lg:rounded-3xl lg:my-8 lg:h-[calc(100vh-64px)] overflow-hidden shadow-2xl relative">
      <header className="px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black text-indigo-900 tracking-tight">СтройЗакуп</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${api.getSyncStatus().connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {api.getSyncStatus().connected ? 'Система в сети' : 'Демо-режим'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-indigo-950 mb-1">{currentUser.name}</p>
            <button onClick={handleLogout} className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 ml-auto hover:underline"><LogOutIcon /> Выход</button>
          </div>
        </div>

        <nav className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>Заявки</button>
          <button onClick={() => setActiveTab('archive')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>Архив</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>Сервер</button>
        </nav>
      </header>

      {activeTab !== 'settings' && (
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setSortBy('date')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500'}`}>Дата</button>
            <button onClick={() => setSortBy('project')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sortBy === 'project' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500'}`}>Объект</button>
          </div>
          {currentUser.role === 'PURCHASER' && (
            <button onClick={() => setIsManagementModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-slate-600 text-[9px] font-black uppercase shadow-sm active:bg-slate-50">
              <DatabaseIcon /> База
            </button>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide bg-slate-50/20">
        {activeTab === 'active' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">В работе</h2>
              {currentUser.role === 'REQUESTOR' && (
                <button onClick={() => handleOpenForm()} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">+ Создать</button>
              )}
            </div>
            {filteredRequests.active.length === 0 ? (
              <div className="text-center py-20 opacity-20 font-black uppercase text-sm tracking-[0.3em]">Список пуст</div>
            ) : (
              filteredRequests.active.map(req => (
                <RequestCard 
                  key={req.id} 
                  request={req} 
                  role={currentUser.role} 
                  onUpdateItems={handleUpdateItems} 
                  onAddExpense={handleAddExpense} 
                  onDelete={handleDeleteRequest} 
                  onEdit={handleOpenForm} 
                  onMarkComplete={handleMarkComplete}
                />
              ))
            )}
          </section>
        )}

        {activeTab === 'archive' && (
          <section>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">История</h2>
            {filteredRequests.archive.map(req => (
              <RequestCard key={req.id} request={req} role={currentUser.role} onUpdateItems={handleUpdateItems} onAddExpense={handleAddExpense} onDelete={handleDeleteRequest} />
            ))}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="space-y-6 pb-10">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                 <DatabaseIcon /> Статус облака
               </h3>
               
               <div className="grid grid-cols-1 gap-4">
                 <div className={`p-4 rounded-3xl border flex items-center justify-between ${envDiagnostics.supabaseUrl ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${envDiagnostics.supabaseUrl ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                        <DatabaseIcon />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">База данных SQL</p>
                        <p className={`text-xs font-bold ${envDiagnostics.supabaseUrl ? 'text-emerald-700' : 'text-red-700'}`}>
                          {envDiagnostics.supabaseUrl ? 'Подключено' : 'VITE_SUPABASE_URL не найден'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${envDiagnostics.supabaseUrl ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                 </div>

                 <div className={`p-4 rounded-3xl border flex items-center justify-between ${envDiagnostics.supabaseKey ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${envDiagnostics.supabaseKey ? 'bg-indigo-500' : 'bg-red-500'} text-white`}>
                        <WalletIcon />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Хранилище чеков</p>
                        <p className={`text-xs font-bold ${envDiagnostics.supabaseKey ? 'text-emerald-700' : 'text-red-700'}`}>
                          {envDiagnostics.supabaseKey ? 'Активно' : 'VITE_SUPABASE_ANON_KEY не найден'}
                        </p>
                      </div>
                    </div>
                 </div>

                 <div className={`p-4 rounded-3xl border flex items-center justify-between ${envDiagnostics.geminiKey ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${envDiagnostics.geminiKey ? 'bg-purple-500 shadow-lg shadow-purple-100' : 'bg-amber-500'} text-white`}>
                        <CameraIcon />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Искусственный интеллект</p>
                        <p className={`text-xs font-bold ${envDiagnostics.geminiKey ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {envDiagnostics.geminiKey ? 'Gemini AI Активен' : 'Ключ API_KEY не найден'}
                        </p>
                      </div>
                    </div>
                 </div>
               </div>

               {!envDiagnostics.supabaseUrl && (
                 <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Инструкция по исправлению</p>
                    <p className="text-xs leading-relaxed opacity-80">
                      Белый экран часто вызван ошибками в переменных. Зайдите в Vercel -> Settings -> Environment Variables. 
                      Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. После этого нажмите "Redeploy".
                    </p>
                 </div>
               )}
            </div>
            
            <div className="text-center opacity-30">
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">СтройЗакуп 4.6 • Final Release</p>
            </div>
          </section>
        )}
      </main>

      {/* Modal Management */}
      {isManagementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex gap-4">
                  <button onClick={() => setManagementTab('users')} className={`text-sm font-black uppercase tracking-widest transition-all ${managementTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Сотрудники</button>
                  <button onClick={() => setManagementTab('projects')} className={`text-sm font-black uppercase tracking-widest transition-all ${managementTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Объекты</button>
                </div>
                <button onClick={() => setIsManagementModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {managementTab === 'users' ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {users.map(u => (
                        <div key={u.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div><span className="font-black text-sm text-slate-900">{u.name}</span><p className="text-[9px] text-indigo-500 font-bold uppercase">Роль: {u.role === 'PURCHASER' ? 'Снабженец' : 'Заказчик'}</p></div>
                          {u.name !== 'admin' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors"><TrashIcon /></button>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-900 uppercase mb-4 tracking-widest">Регистрация</h4>
                      <input type="text" placeholder="Имя / Логин" className="w-full px-4 py-3 rounded-xl border border-indigo-200 text-sm font-bold mb-3 outline-none focus:border-indigo-400" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                      <input type="text" placeholder="Пароль" className="w-full px-4 py-3 rounded-xl border border-indigo-200 text-sm font-bold mb-4 outline-none focus:border-indigo-400" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                      <button onClick={handleAddUser} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Добавить в базу</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {projects.map(p => (
                        <div key={p.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${p.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                          <span className="font-black text-sm text-slate-900">{p.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => handleToggleProject(p)} className="text-[9px] font-black uppercase p-2 text-indigo-600 hover:underline">{p.isActive ? 'Архивировать' : 'Восстановить'}</button>
                            <button onClick={() => handleDeleteProject(p.id)} className="text-red-400 p-2 hover:text-red-600 transition-colors"><TrashIcon /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                      <h4 className="text-[10px] font-black text-emerald-900 uppercase mb-4 tracking-widest">Новый объект</h4>
                      <input type="text" placeholder="Название объекта" className="w-full px-4 py-3 rounded-xl border border-emerald-200 text-sm font-bold mb-4 outline-none focus:border-emerald-400" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                      <button onClick={handleAddProject} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">Открыть объект</button>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Form Request */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-indigo-900">{editingRequest ? 'Редактировать' : 'Новая заявка'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveRequest} className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Где работаем?</label>
                <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black text-indigo-950 bg-slate-50 shadow-sm outline-none focus:border-indigo-400 transition-colors" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} required>
                  <option value="" disabled>Выберите объект</option>
                  {projects.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Что нужно купить?</label>
                {formItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-200 relative group">
                    <div className="flex gap-2 mb-2">
                      <input type="text" placeholder="Материал" className="flex-1 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none focus:border-indigo-200" value={item.name} onChange={e => { const n = [...formItems]; n[index].name = e.target.value; setFormItems(n); }} required />
                      <input type="text" placeholder="К-во" className="w-24 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none focus:border-indigo-200" value={item.quantity} onChange={e => { const n = [...formItems]; n[index].quantity = e.target.value; setFormItems(n); }} required />
                    </div>
                    {formItems.length > 1 && (
                      <button type="button" onClick={() => setFormItems(formItems.filter(i => i.id !== item.id))} className="absolute -right-2 -top-2 bg-white text-red-400 p-2 rounded-full border shadow-md hover:text-red-600 transition-colors">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormItems([...formItems, { id: Math.random().toString(36).substr(2, 5), name: '', quantity: '', isBought: false }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:border-indigo-200 hover:text-indigo-400 transition-all active:scale-[0.99]">+ Еще позиция</button>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-2xl uppercase tracking-widest text-[11px] hover:bg-indigo-700 active:scale-95 transition-all">Сохранить в облако</button>
            </form>
          </div>
        </div>
      )}
      
      <footer className="px-6 py-5 bg-slate-50 border-t border-slate-100 text-center flex-shrink-0">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PRODUCTION v4.6 • READY FOR WORK</p>
      </footer>
    </div>
  );
};

export default App;