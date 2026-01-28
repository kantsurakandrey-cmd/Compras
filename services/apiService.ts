
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { MaterialRequest, User, Project, Expense } from '../types';

// Используем переменные, проброшенные через Vite
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== 'undefined' && SUPABASE_URL !== '');
const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

class ApiService {
  private isConnected = !!supabase;
  private channel: RealtimeChannel | null = null;

  async init() {
    if (this.isConnected) {
      console.log('✅ Supabase клиент инициализирован');
    } else {
      console.error('❌ Supabase не настроен. Проверьте переменные окружения.');
    }
  }

  subscribeToRequests(callback: () => void) {
    if (!supabase) return null;
    try {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => callback())
        .subscribe();
      this.channel = channel;
      return channel;
    } catch (e) {
      return null;
    }
  }

  unsubscribe() {
    if (this.channel && supabase) {
      supabase.removeChannel(this.channel);
    }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []) as User[];
    } catch (err) {
      console.error("Ошибка получения пользователей:", err);
      return [];
    }
  }

  async saveUser(user: User): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('users').insert([{ 
        name: user.name, 
        password: user.password, 
        role: user.role 
      }]);
      if (error) throw error;
    } catch (e) {
      console.error("Ошибка сохранения пользователя:", e);
      alert("Ошибка БД: Возможно, таблица 'users' не создана.");
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.name, isActive: p.is_active })) as Project[];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async saveProject(project: Project): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('projects').insert([{ 
        name: project.name, 
        is_active: project.isActive 
      }]);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Ошибка БД: Возможно, таблица 'projects' не создана.");
    }
  }

  async updateProject(project: Project): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('projects').update({ 
        is_active: project.isActive, 
        name: project.name 
      }).eq('id', project.id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  }

  // --- REQUESTS ---
  async getRequests(): Promise<MaterialRequest[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id.toString(),
        userId: r.user_id,
        userName: r.user_name,
        projectName: r.project_name || 'Не указан',
        items: r.items,
        expenses: r.expenses || [],
        status: r.status,
        createdAt: new Date(r.created_at).getTime(),
        completedAt: r.completed_at ? new Date(r.completed_at).getTime() : undefined
      })) as MaterialRequest[];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async saveRequest(req: MaterialRequest): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('requests').insert([{
        user_id: req.userId,
        user_name: req.userName,
        project_name: req.projectName,
        items: req.items,
        status: req.status
      }]);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Ошибка БД: Возможно, таблица 'requests' не создана.");
    }
  }

  async updateRequest(req: MaterialRequest): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('requests').update({
        items: req.items,
        status: req.status,
        expenses: req.expenses,
        completed_at: req.completedAt ? new Date(req.completedAt).toISOString() : null
      }).eq('id', req.id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  }

  async deleteRequest(id: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  }

  async uploadPhoto(file: File): Promise<string> {
    if (!supabase) return '';
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error } = await supabase.storage.from('receipts').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      console.error(e);
      return '';
    }
  }

  getSyncStatus() {
    return { connected: !!supabase };
  }
}

export const api = new ApiService();
