import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
} from "firebase/firestore";
import { MaterialRequest, User, Project } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
});

// Initialize Firestore with specific database ID if present, otherwise default
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

const DEFAULT_USERS: User[] = [
  { id: 'master-admin', name: 'admin', password: 'qwerty123', role: 'PURCHASER' },
  { id: 'user-1', name: 'Руслан', password: '123', role: 'REQUESTOR' },
  { id: 'user-2', name: 'Иван', password: '123', role: 'PURCHASER' }
];

const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'ЖК Новая Высота', isActive: true },
  { id: 'proj-2', name: 'Офис на Ленина', isActive: true }
];

const DEFAULT_REQUESTS: MaterialRequest[] = [
  {
    id: 'req-1',
    userId: 'user-1',
    userName: 'Руслан',
    projectName: 'ЖК Новая Высота',
    items: [
      { id: 'item-1', name: 'Арматура 12мм', quantity: '500 кг', isBought: false },
      { id: 'item-2', name: 'Цемент М500', quantity: '20 мешков', isBought: true }
    ],
    status: 'PARTIAL' as any,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    expenses: [
      { id: 'exp-1', amount: 450, createdAt: Date.now() - 12 * 60 * 60 * 1000 }
    ]
  },
  {
    id: 'req-2',
    userId: 'user-1',
    userName: 'Руслан',
    projectName: 'Офис на Ленина',
    items: [
      { id: 'item-3', name: 'Кабель ВВГнг 3х2.5', quantity: '100 м', isBought: true }
    ],
    status: 'COMPLETED' as any,
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
    completedAt: Date.now() - 46 * 60 * 60 * 1000,
    expenses: [
      { id: 'exp-2', amount: 120, createdAt: Date.now() - 47 * 60 * 60 * 1000 }
    ]
  }
];

function getLocalUsers(): User[] {
  const data = localStorage.getItem('stroy_users_v4');
  if (!data) {
    localStorage.setItem('stroy_users_v4', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(data);
}

function saveLocalUsers(users: User[]) {
  localStorage.setItem('stroy_users_v4', JSON.stringify(users));
}

function getLocalProjects(): Project[] {
  const data = localStorage.getItem('stroy_projects_v4');
  if (!data) {
    localStorage.setItem('stroy_projects_v4', JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  }
  return JSON.parse(data);
}

function saveLocalProjects(projects: Project[]) {
  localStorage.setItem('stroy_projects_v4', JSON.stringify(projects));
}

function getLocalRequests(): MaterialRequest[] {
  const data = localStorage.getItem('stroy_requests_v4');
  if (!data) {
    localStorage.setItem('stroy_requests_v4', JSON.stringify(DEFAULT_REQUESTS));
    return DEFAULT_REQUESTS;
  }
  return JSON.parse(data);
}

function saveLocalRequests(requests: MaterialRequest[]) {
  localStorage.setItem('stroy_requests_v4', JSON.stringify(requests));
}

class ApiService {
  private localListeners: (() => void)[] = [];

  async init() {
    console.log('✅ Инициализация Firebase Firestore');
    try {
      const usersCol = collection(db, "users");
      const usersSnap = await getDocs(usersCol);
      if (usersSnap.empty) {
        console.log("Seeding default data into Firestore...");
        for (const u of DEFAULT_USERS) {
          await setDoc(doc(db, "users", u.id), u);
        }
        for (const p of DEFAULT_PROJECTS) {
          await setDoc(doc(db, "projects", p.id), p);
        }
        for (const r of DEFAULT_REQUESTS) {
          await setDoc(doc(db, "requests", r.id), r);
        }
        console.log("Database seeded successfully!");
      }
    } catch (err) {
      console.warn("Предупреждение при сидинге Firestore (возможно, нет доступа к сети, используется локальный кэш):", err);
      getLocalUsers();
      getLocalProjects();
      getLocalRequests();
    }
  }

  subscribeToRequests(callback: () => void) {
    try {
      const unsub = onSnapshot(collection(db, "requests"), () => {
        callback();
      }, (err) => {
        console.error("Firestore onSnapshot error, falling back to local simulation:", err);
      });
      return { unsubscribe: unsub };
    } catch (e) {
      this.localListeners.push(callback);
      return { 
        unsubscribe: () => { 
          this.localListeners = this.localListeners.filter(cb => cb !== callback); 
        } 
      };
    }
  }

  unsubscribe() {
    this.localListeners = [];
  }

  private triggerLocalListeners() {
    this.localListeners.forEach(cb => cb());
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, "users"));
      if (snap.empty) {
        return getLocalUsers();
      }
      const list: User[] = [];
      snap.forEach(doc => {
        list.push(doc.data() as User);
      });
      return list;
    } catch (err) {
      console.error("Ошибка получения пользователей из Firestore, загружаем локально:", err);
      return getLocalUsers();
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      const id = user.id || 'user-' + Math.random().toString(36).substr(2, 9);
      const newUser = { ...user, id };
      await setDoc(doc(db, "users", id), newUser);
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка сохранения пользователя в Firestore, сохраняем локально:", e);
      const users = getLocalUsers();
      users.push({ ...user, id: 'user-' + Math.random().toString(36).substr(2, 9) });
      saveLocalUsers(users);
      this.triggerLocalListeners();
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "users", id));
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка удаления пользователя в Firestore, удаляем локально:", e);
      const users = getLocalUsers().filter(u => u.id !== id);
      saveLocalUsers(users);
      this.triggerLocalListeners();
    }
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    try {
      const snap = await getDocs(collection(db, "projects"));
      if (snap.empty) {
        return getLocalProjects();
      }
      const list: Project[] = [];
      snap.forEach(doc => {
        list.push(doc.data() as Project);
      });
      return list;
    } catch (err) {
      console.error("Ошибка получения объектов из Firestore, загружаем локально:", err);
      return getLocalProjects();
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const id = project.id || 'proj-' + Math.random().toString(36).substr(2, 9);
      const newProj = { ...project, id };
      await setDoc(doc(db, "projects", id), newProj);
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка сохранения объекта в Firestore, сохраняем локально:", e);
      const projects = getLocalProjects();
      projects.push({ ...project, id: 'proj-' + Math.random().toString(36).substr(2, 9) });
      saveLocalProjects(projects);
      this.triggerLocalListeners();
    }
  }

  async updateProject(project: Project): Promise<void> {
    try {
      await setDoc(doc(db, "projects", project.id), project);
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка обновления объекта в Firestore, обновляем локально:", e);
      const projects = getLocalProjects().map(p => p.id === project.id ? project : p);
      saveLocalProjects(projects);
      this.triggerLocalListeners();
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "projects", id));
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка удаления объекта в Firestore, удаляем локально:", e);
      const projects = getLocalProjects().filter(p => p.id !== id);
      saveLocalProjects(projects);
      this.triggerLocalListeners();
    }
  }

  // --- REQUESTS ---
  async getRequests(): Promise<MaterialRequest[]> {
    try {
      const snap = await getDocs(collection(db, "requests"));
      if (snap.empty) {
        return getLocalRequests().sort((a, b) => b.createdAt - a.createdAt);
      }
      const list: MaterialRequest[] = [];
      snap.forEach(doc => {
        list.push(doc.data() as MaterialRequest);
      });
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error("Ошибка получения заявок из Firestore, загружаем локально:", err);
      return getLocalRequests().sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  async saveRequest(req: MaterialRequest): Promise<void> {
    try {
      const id = req.id || 'req-' + Math.random().toString(36).substr(2, 9);
      const newReq = { ...req, id, createdAt: req.createdAt || Date.now() };
      await setDoc(doc(db, "requests", id), newReq);
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка сохранения заявки в Firestore, сохраняем локально:", e);
      const requests = getLocalRequests();
      requests.push({ ...req, id: 'req-' + Math.random().toString(36).substr(2, 9), createdAt: req.createdAt || Date.now() });
      saveLocalRequests(requests);
      this.triggerLocalListeners();
    }
  }

  async updateRequest(req: MaterialRequest): Promise<void> {
    try {
      await setDoc(doc(db, "requests", req.id), req);
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка обновления заявки в Firestore, обновляем локально:", e);
      const requests = getLocalRequests().map(r => r.id === req.id ? req : r);
      saveLocalRequests(requests);
      this.triggerLocalListeners();
    }
  }

  async deleteRequest(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "requests", id));
      this.triggerLocalListeners();
    } catch (e) {
      console.error("Ошибка удаления заявки в Firestore, удаляем локально:", e);
      const requests = getLocalRequests().filter(r => r.id !== id);
      saveLocalRequests(requests);
      this.triggerLocalListeners();
    }
  }

  async uploadPhoto(file: File): Promise<string> {
    // Return base64 URL directly for files to avoid storage quota limits and permissions complications
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  // --- SCANS ---
  async getScans(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, "scans"));
      const list: any[] = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      return list;
    } catch (err) {
      console.error("Error getting scans:", err);
      const local = localStorage.getItem('stroy_scans_v4');
      return local ? JSON.parse(local) : [];
    }
  }

  async saveScan(scan: any): Promise<void> {
    try {
      await setDoc(doc(db, "scans", scan.id), scan);
    } catch (e) {
      console.error("Error saving scan:", e);
      const local = localStorage.getItem('stroy_scans_v4');
      const list = local ? JSON.parse(local) : [];
      const existingIdx = list.findIndex((s: any) => s.id === scan.id);
      if (existingIdx !== -1) {
        list[existingIdx] = scan;
      } else {
        list.push(scan);
      }
      localStorage.setItem('stroy_scans_v4', JSON.stringify(list));
    }
  }

  async deleteScan(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "scans", id));
    } catch (e) {
      console.error("Error deleting scan:", e);
      const local = localStorage.getItem('stroy_scans_v4');
      if (local) {
        const list = JSON.parse(local).filter((s: any) => s.id !== id);
        localStorage.setItem('stroy_scans_v4', JSON.stringify(list));
      }
    }
  }

  getSyncStatus() {
    return { connected: true };
  }
}

export const api = new ApiService();
