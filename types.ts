
export enum RequestStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface RequestItem {
  id: string;
  name: string;
  quantity: string;
  link?: string;
  isBought: boolean;
}

export interface User {
  id: string;
  name: string;
  password?: string;
  role: AppRole;
}

export interface Project {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  receiptImage?: string;
  createdAt: number;
}

export interface MaterialRequest {
  id: string;
  userId: string;
  userName: string;
  projectName: string; // Объект
  items: RequestItem[];
  status: RequestStatus;
  createdAt: number;
  completedAt?: number; // Время завершения
  expenses: Expense[];
}

export type AppRole = 'REQUESTOR' | 'PURCHASER';
