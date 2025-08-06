export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Gerente' | 'Membro';
  avatar_url?: string;
  created_at: string;
}

// CORREÇÃO: A interface do Projeto agora reflete a estrutura real do banco de dados
export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  // owner_id não parece ser usado, mas mantendo por consistência se necessário
  owner_id?: string; 
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  formatted_id?: string;
  name: string;
  description?: string;
  project_id: string;
  project_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  status_id: string;
  status_name?: string;
  status_color?: string;
  parent_id?: string | null;
  start_date?: string;
  end_date?: string;
  progress?: number;
  priority?: 'Baixa' | 'Média' | 'Alta';
  created_at: string;
  wbs_code?: string;
  tags: Tag[];
  dependencies: string[];
  custom_fields?: { [key: string]: any };
  subtasks?: Task[];
  observation?: string;
}

export interface Tag {
    id: string;
    name: string;
    color?: string;
}

export interface TaskStatus {
    id: string;
    name: string;
    color: string;
    display_order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string; // <-- Essencial
  end_date?: string;   // <-- Essencial
  budget?: number;     // <-- Essencial
  owner_id?: string; 
  created_at: string;
  updated_at?: string;
}
