
import React, { useState, useEffect, useMemo } from 'react';
import { MaterialRequest, RequestStatus, User, RequestItem, Expense, Project } from './types';
import RequestCard from './components/RequestCard';
import { PlusIcon, UserIcon, TrashIcon, LogOutIcon, BuildingIcon, DatabaseIcon, ClockIcon, WalletIcon, CameraIcon, EditIcon, FileSpreadsheetIcon } from './components/Icons';
import { api } from './services/apiService';
import { ObramatCatalogModal } from './components/ObramatCatalogModal';
import { OBRAMAT_PRODUCTS, ObramatProduct } from './obramat-catalog';

type SortType = 'date' | 'project';
type TabType = 'active' | 'archive' | 'settings';

const compressImage = (file: File, maxW = 1600, maxH = 1600, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportProject, setSelectedExportProject] = useState('all');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanningRequestId, setScanningRequestId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedData, setScannedData] = useState<{
    id: string;
    shopName: string;
    totalAmount: number;
    date: number;
    items: Array<{ name: string; quantity: string; price?: number }>;
    isDemo?: boolean;
    targetRequestId?: string;
  } | null>(null);
  const [selectedScanItems, setSelectedScanItems] = useState<Record<string, boolean>>({});
  const [pendingScans, setPendingScans] = useState<any[]>([]);

  // Form State
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [formItems, setFormItems] = useState<RequestItem[]>([{ id: '1', name: '', quantity: '', link: '', isBought: false }]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  // Obramat Catalog & Autocomplete State
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeCatalogIndex, setActiveCatalogIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleOpenCatalogForIndex = (index: number) => {
    setActiveCatalogIndex(index);
    setIsCatalogOpen(true);
  };

  const handleSelectCatalogProduct = (product: ObramatProduct) => {
    if (activeCatalogIndex === null) return;
    const n = [...formItems];
    n[activeCatalogIndex] = {
      ...n[activeCatalogIndex],
      name: `${product.nameRu} (${product.nameEs})`,
      quantity: product.defaultUnit,
      link: `https://www.obramat.es/catalogsearch/result/?q=${encodeURIComponent(product.nameEs)}`
    };
    setFormItems(n);
    setIsCatalogOpen(false);
    setActiveCatalogIndex(null);
  };

  const handleSelectAutocomplete = (index: number, product: ObramatProduct) => {
    const n = [...formItems];
    n[index] = {
      ...n[index],
      name: `${product.nameRu} (${product.nameEs})`,
      quantity: product.defaultUnit,
      link: `https://www.obramat.es/catalogsearch/result/?q=${encodeURIComponent(product.nameEs)}`
    };
    setFormItems(n);
    setFocusedIndex(null);
  };

  const refreshData = async () => {
    try {
      const [u, p, r, s] = await Promise.all([
        api.getUsers(),
        api.getProjects(),
        api.getRequests(),
        api.getScans()
      ]);
      setUsers(u);
      setProjects(p);
      setRequests(r);
      setPendingScans(s || []);
      return u;
    } catch (err) {
      console.error("Data refresh failed", err);
      return [];
    }
  };

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      setIsLoading(true);
      await api.init();
      if (!active) return;
      const u = await refreshData();
      if (!active) return;

      const savedSession = localStorage.getItem('stroy_session_v4');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.name === 'admin' && !u.find(user => user.name === 'admin')) {
           setCurrentUser(session);
        } else {
           const found = u.find(user => user.name === session.name);
           if (found) setCurrentUser(found);
           else setCurrentUser(null);
        }
      }
      setIsLoading(false);

      const sub = api.subscribeToRequests(() => {
        refreshData();
      });
      if (sub) {
        subscription = sub;
      }
    };
    init();

    return () => {
      active = false;
      if (subscription) {
        subscription.unsubscribe();
      } else {
        api.unsubscribe();
      }
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let user = users.find(u => u.name.toLowerCase() === loginName.toLowerCase() && u.password === loginPass);
    if (!user && loginName.toLowerCase() === 'admin' && loginPass === 'qwerty123') {
      user = { id: 'master-admin', name: 'admin', role: 'PURCHASER' };
    }

    if (user) {
      setCurrentUser(user);
      localStorage.setItem('stroy_session_v4', JSON.stringify(user));
      setLoginError('');
    } else {
      setLoginError('Ошибка авторизации. Неверный логин или пароль.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('stroy_session_v4');
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserPass.trim()) return;
    await api.saveUser({ id: '', name: newUserName.trim(), password: newUserPass.trim(), role: 'REQUESTOR' });
    setNewUserName(''); setNewUserPass('');
    await refreshData();
  };

  const handleDeleteUser = async (id: string) => {
    const isSelf = currentUser && (id === currentUser.id || (currentUser.name === 'admin' && id === 'master-admin'));
    if (id === 'master-admin' || isSelf) {
      return alert("Вы не можете удалить системного администратора или себя.");
    }
    if (window.confirm("Удалить сотрудника?")) { 
      await api.deleteUser(id); 
      await refreshData(); 
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    await api.saveProject({ id: '', name: newProjectName.trim(), isActive: true });
    setNewProjectName('');
    await refreshData();
  };

  const handleToggleProject = async (p: Project) => {
    await api.updateProject({ ...p, isActive: !p.isActive });
    await refreshData();
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Удалить объект полностью?")) { await api.deleteProject(id); await refreshData(); }
  };

  const handleOpenForm = (req?: MaterialRequest) => {
    if (req) {
      setEditingRequest(req); 
      setSelectedProjectId(req.projectName); 
      setFormItems(req.items.map(item => ({ ...item, link: item.link || '' })));
    } else {
      setEditingRequest(null); 
      setSelectedProjectId(projects.filter(p => p.isActive)[0]?.name || '');
      setFormItems([{ id: Math.random().toString(36).substr(2, 5), name: '', quantity: '', link: '', isBought: false }]);
    }
    setIsFormOpen(true);
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedProjectId) return;
    if (editingRequest) {
      await api.updateRequest({ ...editingRequest, projectName: selectedProjectId, items: formItems });
    } else {
      await api.saveRequest({ id: '', userId: currentUser.id, userName: currentUser.name, projectName: selectedProjectId, items: formItems, status: RequestStatus.PENDING, createdAt: Date.now(), expenses: [] });
    }
    setIsFormOpen(false); await refreshData();
  };

  const handleUpdateItems = async (requestId: string, items: RequestItem[]) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const allBought = items.every(i => i.isBought);
    const someBought = items.some(i => i.isBought);
    let status = RequestStatus.PENDING;
    if (allBought) status = RequestStatus.COMPLETED;
    else if (someBought) status = RequestStatus.PARTIAL;
    await api.updateRequest({ 
      ...req, 
      items, 
      status, 
      completedAt: allBought ? (req.completedAt || Date.now()) : undefined 
    });
    await refreshData();
  };

  const handleAddExpense = async (requestId: string, exp: Omit<Expense, 'id' | 'createdAt'>) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    await api.updateRequest({ ...req, expenses: [...req.expenses, { ...exp, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] });
    await refreshData();
  };

  const handleDeleteExpense = async (requestId: string, expenseId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    if (window.confirm("Удалить этот чек?")) {
      const newExpenses = req.expenses.filter(e => e.id !== expenseId);
      await api.updateRequest({ ...req, expenses: newExpenses });
      await refreshData();
    }
  };

  const handleScanReceipt = async (requestId: string, file: File) => {
    setIsScanning(true);
    setScanningRequestId(requestId);
    setScanError(null);

    try {
      // Compress the image before uploading to speed up mobile connection transfers significantly
      const isImg = file.type.startsWith('image/');
      const base64String = await compressImage(file, 1600, 1600, 0.75);
      const mimeType = isImg ? 'image/jpeg' : file.type;
      
      try {
        const res = await fetch("/api/scan-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64String,
            mimeType
          })
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.error === "GEMINI_API_KEY_MISSING") {
              console.log("Using demo mock fallback due to missing key...");
              const demoData = {
                id: 'scan-' + Math.random().toString(36).substr(2, 9),
                shopName: "OBRAMAT MADRID",
                totalAmount: 33.45,
                date: Date.now(),
                items: [
                  { name: "Cemento gris Portland CEM II saco 25 kg", quantity: "3 шт", price: 4.85 },
                  { name: "Mortero seco de cemento saco 25 kg", quantity: "5 шт", price: 3.20 },
                  { name: "Adhesivo de montage No Mas Clavos", quantity: "1 шт", price: 2.95 }
                ],
                isDemo: true,
                targetRequestId: requestId,
                createdAt: Date.now()
              };
              await api.saveScan(demoData);
              setScannedData(demoData);
              
              const initialMatches: Record<string, boolean> = {};
              const targetRequest = requests.find(r => r.id === requestId);
              if (targetRequest) {
                (targetRequest.items || []).forEach(reqItem => {
                  if (!reqItem.isBought) {
                    const words = reqItem.name.toLowerCase().split(/[\s,()]+/).filter(w => w.length > 3);
                    const hasMatch = words.length > 0 && demoData.items.some(scanned => {
                      return words.some(w => scanned.name.toLowerCase().includes(w));
                    });
                    initialMatches[reqItem.id] = hasMatch;
                  }
                });
              }
              setSelectedScanItems(initialMatches);
              setShowScanModal(true);
              await refreshData();
            } else {
              throw new Error(data.message || data.error || "Ошибка распознавания чека");
            }
          } else {
            const text = await res.text();
            console.error("Non-JSON error from server:", text);
            throw new Error(`Сервер временно недоступен. Код: ${res.status}`);
          }
        } else {
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            const scanData = {
              id: 'scan-' + Math.random().toString(36).substr(2, 9),
              shopName: data.shopName,
              totalAmount: data.totalAmount,
              date: data.date,
              items: data.items || [],
              isDemo: false,
              targetRequestId: requestId,
              createdAt: Date.now()
            };
            await api.saveScan(scanData);
            setScannedData(scanData);

            const initialMatches: Record<string, boolean> = {};
            const targetRequest = requests.find(r => r.id === requestId);
            if (targetRequest) {
              (targetRequest.items || []).forEach(reqItem => {
                if (!reqItem.isBought) {
                  const words = reqItem.name.toLowerCase().split(/[\s,()]+/).filter(w => w.length > 3);
                  const hasMatch = words.length > 0 && scanData.items.some(scanned => {
                    return words.some(w => scanned.name.toLowerCase().includes(w));
                  });
                  initialMatches[reqItem.id] = hasMatch;
                }
              });
            }
            setSelectedScanItems(initialMatches);
            setShowScanModal(true);
            await refreshData();
          } else {
            throw new Error("Сервер вернул некорректный формат ответа");
          }
        }
      } catch (err: any) {
        console.error("Scanning failed", err);
        setScanError(err.message || "Не удалось распознать чек");
        alert(err.message || "Не удалось распознать чек");
      } finally {
        setIsScanning(false);
      }
    } catch (err) {
      setScanError("Не удалось прочитать или сжать файл");
      setIsScanning(false);
    }
  };

  const handleConfirmScan = async () => {
    if (!scannedData || !scannedData.targetRequestId) return;
    const targetRequestId = scannedData.targetRequestId;

    try {
      const req = requests.find(r => r.id === targetRequestId);
      if (!req) {
        throw new Error("Заявка не найдена");
      }

      // 1. Prepare new expense
      const amount = parseFloat(scannedData.totalAmount.toString()) || 0;
      const newExpense: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        shopName: scannedData.shopName,
        items: scannedData.items || [],
        createdAt: Date.now()
      };

      const updatedExpenses = [...(req.expenses || []), newExpense];

      // 2. Mark selected items as bought
      const updatedItems = (req.items || []).map(item => {
        if (selectedScanItems[item.id]) {
          return {
            ...item,
            isBought: true,
            boughtAt: item.boughtAt || Date.now()
          };
        }
        return item;
      });

      // 3. Determine status transition
      let status = req.status;
      if (req.status !== RequestStatus.COMPLETED && req.status !== RequestStatus.CANCELLED) {
        const allBought = updatedItems.every(i => i.isBought);
        const someBought = updatedItems.some(i => i.isBought);
        if (allBought) {
          status = RequestStatus.COMPLETED;
        } else if (someBought) {
          status = RequestStatus.PARTIAL;
        } else {
          status = RequestStatus.PENDING;
        }
      }

      // 4. Update the request with BOTH new expenses and items in a single call to prevent race conditions
      await api.updateRequest({
        ...req,
        expenses: updatedExpenses,
        items: updatedItems,
        status,
        completedAt: status === RequestStatus.COMPLETED ? (req.completedAt || Date.now()) : undefined
      });

      // 5. Delete temporary scan doc
      await api.deleteScan(scannedData.id);

      // 6. Reset states
      setShowScanModal(false);
      setScannedData(null);
      setScanningRequestId(null);
      await refreshData();
    } catch (err: any) {
      console.error("Confirm scan failed", err);
      alert(`Не удалось сохранить подтвержденный чек: ${err.message || "Неизвестная ошибка"}`);
    }
  };

  const handleCancelScan = async () => {
    if (scannedData) {
      await api.deleteScan(scannedData.id);
    }
    setShowScanModal(false);
    setScannedData(null);
    setScanningRequestId(null);
    await refreshData();
  };

  const handleExportArchiveToExcel = (targetProjectName: string = 'all') => {
    let archiveRequests = requests.filter(r => r && (r.status === RequestStatus.COMPLETED || r.status === RequestStatus.CANCELLED));

    if (targetProjectName !== 'all') {
      archiveRequests = archiveRequests.filter(r => r.projectName === targetProjectName);
    }

    if (archiveRequests.length === 0) {
      alert("Нет архивных заявок для выгрузки по выбранному критерию.");
      return;
    }

    const headers = [
      "Объект",
      "Магазин",
      "Сумма закупки (€)",
      "Купленные товары",
      "Создал заявку",
      "Дата закупки",
      "Дата создания заявки",
      "Статус"
    ];

    const rows: string[][] = [];

    // Group by project name
    const groupedByProject: Record<string, { total: number; rows: string[][] }> = {};

    archiveRequests.forEach(req => {
      const projName = req.projectName || 'Не указан';
      if (!groupedByProject[projName]) {
        groupedByProject[projName] = { total: 0, rows: [] };
      }

      const dateCreated = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ru-RU') : '—';
      const statusText = req.status === RequestStatus.COMPLETED ? 'Выполнено' : 'Отменено';

      if (req.expenses && req.expenses.length > 0) {
        req.expenses.forEach(exp => {
          const dateExp = exp.createdAt ? new Date(exp.createdAt).toLocaleDateString('ru-RU') : '—';
          const itemsList = exp.items && exp.items.length > 0
            ? exp.items.map(it => `${it.name} (${it.quantity})`).join(', ')
            : '—';
          
          groupedByProject[projName].rows.push([
            projName,
            exp.shopName || '—',
            exp.amount.toFixed(2).replace('.', ','),
            itemsList,
            req.userName || '—',
            dateExp,
            dateCreated,
            statusText
          ]);
          groupedByProject[projName].total += exp.amount;
        });
      } else {
        // If no expenses, list the items
        const boughtItems = (req.items || []).filter(i => i.isBought);
        const itemsList = boughtItems.length > 0
          ? boughtItems.map(it => `${it.name} (${it.quantity})`).join(', ')
          : '—';

        groupedByProject[projName].rows.push([
          projName,
          '—',
          '0,00',
          itemsList,
          req.userName || '—',
          dateCreated, // use request date as purchase date placeholder
          dateCreated,
          statusText + ' (Без чеков)'
        ]);
      }
    });

    let overallTotal = 0;
    
    Object.keys(groupedByProject).sort().forEach(projName => {
      const group = groupedByProject[projName];
      
      // Add a header/separator for the project
      rows.push([`=== ОБЪЕКТ: ${projName.toUpperCase()} ===`, "", "", "", "", "", "", ""]);
      
      // Add all rows for this project
      group.rows.forEach(r => rows.push(r));
      
      // Add a subtotal row for this project
      rows.push([
        `Итого по объекту "${projName}"`, 
        "", 
        group.total.toFixed(2).replace('.', ','), 
        "", 
        "", 
        "", 
        "", 
        ""
      ]);
      
      // Add an empty separator row
      rows.push(["", "", "", "", "", "", "", ""]);
      
      overallTotal += group.total;
    });

    // Add Grand Total row at the very end
    if (targetProjectName === 'all') {
      rows.push([
        "ОБЩИЙ ИТОГ ПО ВСЕМ ОБЪЕКТАМ",
        "",
        overallTotal.toFixed(2).replace('.', ','),
        "",
        "",
        "",
        "",
        ""
      ]);
    } else {
      rows.push([
        `ОБЩИЙ ИТОГ ПО ОБЪЕКТУ ${targetProjectName.toUpperCase()}`,
        "",
        overallTotal.toFixed(2).replace('.', ','),
        "",
        "",
        "",
        "",
        ""
      ]);
    }

    const escapeCSV = (val: string) => {
      const text = (val || '').replace(/"/g, '""');
      if (text.includes(';') || text.includes('\n') || text.includes('"')) {
        return `"${text}"`;
      }
      return text;
    };

    const csvContent = [
      headers.map(escapeCSV).join(';'),
      ...rows.map(row => row.map(escapeCSV).join(';'))
    ].join('\r\n');

    // Excel-compatible BOM (UTF-8)
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileSlug = targetProjectName === 'all' ? 'всех_объектов' : `объекта_${targetProjectName}`;
    link.setAttribute("download", `Выгрузка_закупок_${fileSlug}_${new Date().toLocaleDateString('ru-RU')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateExpense = async (requestId: string, updatedExp: Expense) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    await api.updateRequest({ 
      ...req, 
      expenses: req.expenses.map(e => e.id === updatedExp.id ? updatedExp : e) 
    });
    await refreshData();
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm("Удалить заявку?")) { await api.deleteRequest(id); await refreshData(); }
  };

  const handleMarkComplete = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const updatedItems = req.items.map(item => 
      item.isBought 
        ? item 
        : { ...item, isBought: true, boughtAt: item.boughtAt || Date.now() }
    );
    await api.updateRequest({ 
      ...req, 
      items: updatedItems, 
      status: RequestStatus.COMPLETED, 
      completedAt: req.completedAt || Date.now() 
    });
    await refreshData();
  };

  const filteredRequests = useMemo(() => {
    if (!currentUser) return { active: [], archive: [] };
    const isPurchaser = currentUser.role === 'PURCHASER' || (currentUser.name && currentUser.name.toLowerCase() === 'admin');
    const base = (isPurchaser ? requests : requests.filter(r => r && r.userId === currentUser.id)).filter(Boolean);
    const active = base.filter(r => r && r.status !== RequestStatus.COMPLETED && r.status !== RequestStatus.CANCELLED);
    const archive = base.filter(r => r && (r.status === RequestStatus.COMPLETED || r.status === RequestStatus.CANCELLED));
    const sortFn = (a: MaterialRequest, b: MaterialRequest) => sortBy === 'date' ? ((b.completedAt || b.createdAt || 0) - (a.createdAt || 0)) : (a.projectName || '').localeCompare(b.projectName || '');
    return { active: active.sort(sortFn), archive: archive.sort(sortFn) };
  }, [requests, currentUser, sortBy]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-900 animate-pulse uppercase text-center px-4">Подключение...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center">
          <h1 className="text-4xl font-black text-indigo-900 mb-2">СтройЗакуп</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-10 tracking-[0.2em]">Supply Control System</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Логин" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold bg-slate-50" value={loginName} onChange={e => setLoginName(e.target.value)} required />
            <input type="password" placeholder="Пароль" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold bg-slate-50" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
            {loginError && <p className="text-xs text-red-500 font-bold">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest active:scale-[0.98]">Войти</button>
          </form>
        </div>
      </div>
    );
  }

  const renderRequestList = (reqs: MaterialRequest[]) => {
    return reqs.map(req => {
      if (!req) return null;
      const isArchived = req.status === RequestStatus.COMPLETED || req.status === RequestStatus.CANCELLED;
      const isPurchaser = currentUser.role === 'PURCHASER' || (currentUser.name && currentUser.name.toLowerCase() === 'admin');
      const canDelete = isPurchaser || !isArchived;

      return (
        <RequestCard 
          key={req.id} 
          request={req} 
          role={(currentUser.name && currentUser.name.toLowerCase() === 'admin') ? 'PURCHASER' : currentUser.role} 
          onUpdateItems={handleUpdateItems} 
          onAddExpense={handleAddExpense} 
          onDeleteExpense={(expId) => handleDeleteExpense(req.id, expId)}
          onUpdateExpense={(exp) => handleUpdateExpense(req.id, exp)}
          onDelete={canDelete ? handleDeleteRequest : undefined} 
          onEdit={handleOpenForm} 
          onMarkComplete={handleMarkComplete} 
          isScanning={isScanning}
          scanningRequestId={scanningRequestId}
          onScanReceipt={handleScanReceipt}
        />
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white lg:rounded-3xl lg:my-8 lg:h-[calc(100vh-64px)] overflow-hidden shadow-2xl relative">
      <header className="px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black text-indigo-900 tracking-tight">СтройЗакуп</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${api.getSyncStatus().connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {api.getSyncStatus().connected ? 'Облако активно' : 'Ошибка конфига'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-indigo-950 mb-1">{currentUser.name}</p>
            <button onClick={handleLogout} className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 ml-auto hover:underline"><LogOutIcon /> Выход</button>
          </div>
        </div>

        <nav className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Заявки</button>
          <button onClick={() => setActiveTab('archive')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Архив</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Сервер</button>
        </nav>
      </header>

      {activeTab !== 'settings' && (
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setSortBy('date')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500'}`}>Дата</button>
            <button onClick={() => setSortBy('project')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sortBy === 'project' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500'}`}>Объект</button>
          </div>
          {(currentUser.role === 'PURCHASER' || (currentUser.name && currentUser.name.toLowerCase() === 'admin')) && (
            <button onClick={() => setIsManagementModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-[9px] font-black uppercase shadow-sm active:bg-slate-50 active:scale-95 transition-all">
              <DatabaseIcon /> База
            </button>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide bg-slate-50/20">
        {activeTab === 'active' && (
          <section>
            {/* Unassigned pending scans for PURCHASER/ADMIN role */}
            {(currentUser.role === 'PURCHASER' || (currentUser.name && currentUser.name.toLowerCase() === 'admin')) && pendingScans.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Неподтвержденные чеки ({pendingScans.length})</span>
                </div>
                {pendingScans.map(scan => {
                  const targetReq = requests.find(r => r.id === scan.targetRequestId);
                  const targetProj = targetReq ? targetReq.projectName : 'Неизвестный объект';
                  return (
                    <div key={scan.id} className="bg-amber-50 border border-amber-200/60 p-4 rounded-3xl flex justify-between items-center shadow-sm">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs font-black text-indigo-950 truncate">
                          {scan.shopName} — {scan.totalAmount} €
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          На объект: <span className="text-indigo-600">{targetProj}</span>
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          onClick={() => {
                            setScannedData(scan);
                            setScanningRequestId(scan.targetRequestId || null);
                            
                            // Initialize item matching for the modal
                            const initialMatches: Record<string, boolean> = {};
                            if (targetReq) {
                              (targetReq.items || []).forEach(reqItem => {
                                if (!reqItem.isBought) {
                                  const words = reqItem.name.toLowerCase().split(/[\s,()]+/).filter(w => w.length > 3);
                                  const hasMatch = words.length > 0 && scan.items.some((scanned: any) => {
                                    return words.some((w: string) => scanned.name.toLowerCase().includes(w));
                                  });
                                  initialMatches[reqItem.id] = hasMatch;
                                }
                              });
                            }
                            setSelectedScanItems(initialMatches);
                            setShowScanModal(true);
                          }}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm shadow-amber-100"
                        >
                          Разобрать
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm("Удалить этот сохраненный чек?")) {
                              await api.deleteScan(scan.id);
                              await refreshData();
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white border border-amber-200 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">В работе</h2>
              {(currentUser.role === 'REQUESTOR' && (!currentUser.name || currentUser.name.toLowerCase() !== 'admin')) && (
                <button onClick={() => handleOpenForm()} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">+ Создать</button>
              )}
            </div>
            {filteredRequests.active.length === 0 ? <div className="text-center py-20 opacity-20 font-black uppercase text-sm tracking-[0.3em]">Пусто</div> : 
              renderRequestList(filteredRequests.active)
            }
          </section>
        )}

        {activeTab === 'archive' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">История</h2>
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-100 active:scale-95"
              >
                <FileSpreadsheetIcon /> Экспорт в Excel
              </button>
            </div>
            {filteredRequests.archive.length === 0 ? (
              <div className="text-center py-20 opacity-20 font-black uppercase text-sm tracking-[0.3em]">Пусто</div>
            ) : (
              renderRequestList(filteredRequests.archive)
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="space-y-6 pb-10">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2"><DatabaseIcon /> Конфигурация</h3>
               <div className="grid grid-cols-1 gap-4 mb-8">
                 <div className={`p-4 rounded-3xl border flex items-center justify-between ${api.getSyncStatus().connected ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span className="text-[10px] font-black uppercase text-slate-400">Database Status</span>
                    <span className="text-xs font-bold">{api.getSyncStatus().connected ? 'OK' : 'ERROR'}</span>
                 </div>
               </div>
               <p className="text-[11px] text-slate-500 leading-relaxed">Если приложение не сохраняет данные, убедитесь что в Supabase созданы таблицы users, projects и requests через SQL Editor.</p>
            </div>
          </section>
        )}
      </main>

      {isManagementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex gap-4">
                  <button onClick={() => setManagementTab('users')} className={`text-sm font-black uppercase transition-all ${managementTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Сотрудники</button>
                  <button onClick={() => setManagementTab('projects')} className={`text-sm font-black uppercase transition-all ${managementTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Объекты</button>
                </div>
                <button onClick={() => setIsManagementModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {managementTab === 'users' ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {users.map(u => {
                        const isSelf = currentUser && (u.id === currentUser.id || u.name === 'admin');
                        return (
                          <div key={u.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div><span className="font-black text-sm text-slate-900">{u.name}</span><p className="text-[9px] text-indigo-500 font-bold uppercase">{u.role}</p></div>
                            {(!isSelf && u.id !== 'master-admin' && u.name !== 'admin') && (
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-900 uppercase mb-3 tracking-widest">Добавить сотрудника</h4>
                      <input type="text" placeholder="Логин" className="w-full px-4 py-3 rounded-xl border mb-3 outline-none text-sm font-bold bg-white" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                      <input type="text" placeholder="Пароль" className="w-full px-4 py-3 rounded-xl border mb-4 outline-none text-sm font-bold bg-white" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                      <button onClick={handleAddUser} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Добавить</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {projects.map(p => (
                        <div key={p.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${p.isActive ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                          <span className={`font-black text-sm ${!p.isActive ? 'line-through text-slate-400' : 'text-slate-900'}`}>{p.name}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleToggleProject(p)} 
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${p.isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                            >
                              {p.isActive ? 'Скрыть' : 'Показать'}
                            </button>
                            <button onClick={() => handleDeleteProject(p.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                      <h4 className="text-[10px] font-black text-emerald-900 uppercase mb-3 tracking-widest">Новый объект</h4>
                      <input type="text" placeholder="Название объекта" className="w-full px-4 py-3 rounded-xl border mb-4 outline-none text-sm font-bold bg-white" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                      <button onClick={handleAddProject} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Открыть объект</button>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-indigo-900">Новая заявка</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 p-2">✕</button>
            </div>
            <form onSubmit={handleSaveRequest} className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
              <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black text-indigo-950 bg-slate-50 outline-none" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} required>
                <option value="" disabled>Выберите объект</option>
                {projects.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div className="space-y-4">
                {formItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-200 relative space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="Материал" 
                          className="w-full px-4 py-3 rounded-xl border text-sm font-bold" 
                          value={item.name} 
                          onFocus={() => setFocusedIndex(index)}
                          onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
                          onChange={e => { 
                            const n = [...formItems]; 
                            n[index].name = e.target.value; 
                            setFormItems(n); 
                          }} 
                          required 
                        />
                        {/* Autocomplete suggestions */}
                        {focusedIndex === index && item.name.length >= 1 && (
                          <div className="absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1 p-1 space-y-1">
                            {OBRAMAT_PRODUCTS.filter(p => 
                              p.nameRu.toLowerCase().includes(item.name.toLowerCase()) || 
                              p.nameEs.toLowerCase().includes(item.name.toLowerCase())
                            ).slice(0, 5).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => handleSelectAutocomplete(index, p)}
                                className="w-full text-left px-3 py-2 text-[11px] hover:bg-indigo-50 rounded-lg flex justify-between gap-2 border-b last:border-0 border-slate-50"
                              >
                                <span className="font-bold text-slate-800 truncate">{p.nameRu}</span>
                                <span className="text-amber-600 font-black shrink-0">{p.approxPrice} €</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input type="text" placeholder="К-во" className="w-24 px-4 py-3 rounded-xl border text-sm font-bold" value={item.quantity} onChange={e => { const n = [...formItems]; n[index].quantity = e.target.value; setFormItems(n); }} required />
                    </div>
                    
                    <div className="flex justify-between items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCatalogForIndex(index)}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-1 shrink-0"
                      >
                        📖 Справочник
                      </button>
                      <input type="url" placeholder="Ссылка на товар (необязательно)" className="flex-1 px-4 py-2 rounded-xl border text-[11px] font-medium text-indigo-600" value={item.link || ''} onChange={e => { const n = [...formItems]; n[index].link = e.target.value; setFormItems(n); }} />
                    </div>
                    {formItems.length > 1 && <button type="button" onClick={() => setFormItems(formItems.filter(i => i.id !== item.id))} className="absolute -right-2 -top-2 bg-white text-red-400 p-2 rounded-full border shadow-sm z-10">✕</button>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormItems([...formItems, { id: Math.random().toString(36).substr(2, 5), name: '', quantity: '', link: '', isBought: false }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 transition-all">+ Еще позиция</button>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase shadow-2xl active:scale-95 transition-all text-[11px] tracking-widest">Отправить в снабжение</button>
            </form>
          </div>
        </div>
      )}

       {showScanModal && scannedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black uppercase">ИИ</span> 
                  Распознанный чек
                </h3>
                {scannedData.isDemo && (
                  <p className="text-[9px] text-amber-600 font-bold mt-0.5">
                    ⚠️ Демо-режим (нет GEMINI_API_KEY)
                  </p>
                )}
              </div>
              <button 
                type="button" 
                onClick={handleCancelScan} 
                className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide text-left">
              {/* Target request info */}
              {(() => {
                const tr = requests.find(r => r.id === scannedData.targetRequestId);
                if (tr) {
                  return (
                    <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                      <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Привязка к заявке</span>
                      <p className="font-bold text-indigo-950 mt-1">{tr.projectName}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">Создатель: {tr.userName}</p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Store & Total */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Магазин</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold mt-1 outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    value={scannedData.shopName} 
                    onChange={e => setScannedData({ ...scannedData, shopName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Сумма (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black mt-1 outline-none focus:border-indigo-500 focus:bg-white transition-all text-indigo-900" 
                    value={scannedData.totalAmount} 
                    onChange={e => setScannedData({ ...scannedData, totalAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Extracted Items */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Позиции из чека ({scannedData.items.length})</label>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-1.5 space-y-2 max-h-36 overflow-y-auto">
                  {scannedData.items.map((it, i) => (
                    <div key={i} className="flex justify-between items-center gap-2 border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-700 font-bold block truncate">{it.name}</span>
                        {it.price !== undefined && it.price !== null && (
                          <span className="text-[10px] text-indigo-600 font-black block">{it.price} €</span>
                        )}
                      </div>
                      <span className="text-slate-500 font-black shrink-0 text-[11px] bg-white border px-2 py-0.5 rounded-lg">{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matching */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Сопоставить с заявкой</label>
                <p className="text-[9px] text-slate-400 mt-0.5">Выберите, какие из запрашиваемых позиций куплены в этом чеке:</p>
                
                <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                  {(() => {
                    const tr = requests.find(r => r.id === scannedData.targetRequestId);
                    if (!tr) return null;
                    const availableItems = (tr.items || []).filter(item => !item.isBought);
                    if (availableItems.length === 0) {
                      return <p className="text-xs text-slate-400 italic py-2 text-center">Все позиции из заявки уже куплены.</p>;
                    }
                    return availableItems.map(item => {
                      const isChecked = !!selectedScanItems[item.id];
                      return (
                        <label 
                          key={item.id} 
                          className={`flex items-start gap-3 p-3 border rounded-2xl cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' 
                              : 'bg-white border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            className="mt-0.5 accent-indigo-600 rounded" 
                            checked={isChecked}
                            onChange={() => setSelectedScanItems({
                              ...selectedScanItems,
                              [item.id]: !isChecked
                            })}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate leading-tight">{item.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Требуется: {item.quantity}</p>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                type="button" 
                onClick={handleCancelScan}
                className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all bg-white"
              >
                Удалить
              </button>
              <button 
                type="button" 
                onClick={handleConfirmScan}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

       {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheetIcon /> Экспорт в Excel
              </h3>
              <button 
                type="button" 
                onClick={() => setShowExportModal(false)} 
                className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-4 text-left">
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                Выберите конкретный объект для выгрузки отчета по закупкам или выгрузите данные по всем объектам сразу.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Объект для экспорта</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-indigo-950 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  value={selectedExportProject}
                  onChange={e => setSelectedExportProject(e.target.value)}
                >
                  <option value="all">Все объекты (общий отчет)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3.5 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all bg-white"
              >
                Отмена
              </button>
              <button 
                type="button" 
                onClick={() => {
                  handleExportArchiveToExcel(selectedExportProject);
                  setShowExportModal(false);
                }}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100"
              >
                Скачать
              </button>
            </div>
          </div>
        </div>
      )}

      <ObramatCatalogModal 
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectProduct={handleSelectCatalogProduct}
      />
    </div>
  );
};

export default App;
