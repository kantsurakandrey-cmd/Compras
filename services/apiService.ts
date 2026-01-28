
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { MaterialRequest, User, Project, Expense } from '../types';

// Accessing environment variables directly as they are injected by the build system (Vercel/Vite)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

class ApiService {
  private isConnected = !!supabase;
  private channel: RealtimeChannel | null = null;

  async init() {
    console.log(this.isConnected ? 'Connected to Supabase Cloud' : 'Running in Simulation Mode');
    if (!this.isConnected) {
      console.warn('Supabase keys are missing. Check your environment variables.');
    }
  }

  // Подписка на живые обновления
  subscribeToRequests(callback: () => void) {
    if (!supabase) return null;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          console.log('Realtime update received');
          callback();
        }
      )
      .subscribe();
    
    this.channel = channel;
    return channel;
  }

  unsubscribe() {
    if (this.channel) {
      supabase?.removeChannel(this.channel);
    }
  }

  // --- ПОЛЬЗОВАТЕЛИ ---
  async getUsers(): Promise<User[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as User[];
  }

  async saveUser(user: User): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('users').insert([{
      name: user.name,
      password: user.password,
      role: user.role
    }]);
    if (error) throw error;
  }

  async deleteUser(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  }

  // --- ОБЪЕКТЫ ---
  async getProjects(): Promise<Project[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
    return data.map(p => ({
      id: p.id,
      name: p.name,
      isActive: p.is_active
    })) as Project[];
  }

  async saveProject(project: Project): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('projects').insert([{
      name: project.name,
      is_active: project.isActive
    }]);
    if (error) throw error;
  }

  async updateProject(project: Project): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('projects').update({ 
      is_active: project.isActive,
      name: project.name
    }).eq('id', project.id);
    if (error) throw error;
  }

  async deleteProject(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  // --- ЗАЯВКИ ---
  async getRequests(): Promise<MaterialRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }
    
    return data.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      projectName: r.project_name,
      items: r.items,
      expenses: r.expenses || [],
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
      completedAt: r.completed_at ? new Date(r.completed_at).getTime() : undefined
    })) as MaterialRequest[];
  }

  async saveRequest(req: MaterialRequest): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('requests').insert([{
      user_id: req.userId,
      user_name: req.userName,
      project_name: req.projectName,
      items: req.items,
      status: req.status
    }]);
    if (error) throw error;
  }

  async updateRequest(req: MaterialRequest): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('requests').update({
      items: req.items,
      status: req.status,
      expenses: req.expenses,
      completed_at: req.completedAt ? new Date(req.completedAt).toISOString() : null
    }).eq('id', req.id);
    if (error) throw error;
  }

  async deleteRequest(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) throw error;
  }

  // --- ХРАНИЛИЩЕ ФОТО (BUCKET) ---
  async uploadPhoto(file: File): Promise<string> {
    if (!supabase) return '';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);
      
    return publicUrl;
  }

  getSyncStatus() {
    return {
      connected: this.isConnected,
      mode: this.isConnected ? 'SQL_LIVE' : 'SIMULATION',
      storageUsed: this.isConnected ? 'Unlimited' : '5MB Limit'
    };
  }
}

export const api = new ApiService();
