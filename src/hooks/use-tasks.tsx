"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import type { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type FetchMode = 'project' | 'myTasks';

// Função para aninhar tarefas (sem alterações)
const nestTasks = (tasks: Task[]): (Task & { subtasks: any[] })[] => {
    if (!tasks || tasks.length === 0) return [];
    const taskMap: { [key: string]: Task & { subtasks: any[] } } = {};
    tasks.forEach(task => taskMap[task.id] = { ...task, subtasks: [] });
    const nestedTasks: (Task & { subtasks: any[] })[] = [];
    tasks.forEach(task => {
        if (task.parent_id && taskMap[task.parent_id]) {
            taskMap[task.parent_id].subtasks.push(taskMap[task.id]);
        } else {
            nestedTasks.push(taskMap[task.id]);
        }
    });
    return nestedTasks;
};

interface TasksContextType {
  tasks: (Task & { subtasks: any[] })[];
  rawTasks: Task[];
  loading: boolean;
  selectedProjectId: string | null;
  fetchMode: FetchMode;
  setSelectedProjectId: (projectId: string | null) => void;
  setFetchMode: (mode: FetchMode) => void;
  refetchTasks: () => void;
  addTask: (taskData: Partial<Task> & { tag_ids?: string[] }) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  setParentTask: (taskIds: string[], parentId: string | null) => Promise<boolean>;
  updateTaskStatus: (taskId: string, newStatusId: string) => Promise<void>;
  updateTask: (taskId: string, updatedData: Partial<Task> & { tag_ids?: string[] }) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [fetchMode, setFetchMode] = useState<FetchMode>('project');
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let rpcToCall: string | null = null;
    let params: object = {};

    if (fetchMode === 'myTasks') {
        rpcToCall = 'get_my_incomplete_tasks';
        params = {};
    } else if (fetchMode === 'project' && selectedProjectId) {
        rpcToCall = selectedProjectId === 'consolidated' ? 'get_all_user_tasks' : 'get_tasks_for_project';
        params = selectedProjectId === 'consolidated' ? {} : { p_project_id: selectedProjectId };
    } else {
        setRawTasks([]);
        setLoading(false);
        return;
    }
    
    const { data, error } = await supabase.rpc(rpcToCall, params);

    if (error) {
      toast({ title: "Erro ao carregar tarefas", description: error.message, variant: "destructive" });
      setRawTasks([]);
    } else {
      const tasksWithDeps = (data || []).map((task: Task) => ({ ...task, dependencies: task.dependencies || [] }));
      setRawTasks(tasksWithDeps);
    }
    setLoading(false);
  }, [selectedProjectId, fetchMode, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  const tasks = useMemo(() => nestTasks(rawTasks), [rawTasks]);

  const commonTaskUpdate = async () => {
    await fetchTasks();
  };

  const addTask = async (taskData: Partial<Task> & { tag_ids?: string[] }): Promise<boolean> => {
    const { tag_ids, ...rest } = taskData;
    const { error } = await supabase.rpc('insert_task_with_tags', {
      p_project_id: rest.project_id, p_name: rest.name, p_description: rest.description,
      p_assignee_id: rest.assignee_id, p_status_id: rest.status_id, p_priority: rest.priority,
      p_progress: rest.progress, p_start_date: rest.start_date, p_end_date: rest.end_date,
      p_parent_id: rest.parent_id, p_dependencies: rest.dependencies || [], p_tag_ids: tag_ids || [], 
      p_custom_fields: rest.custom_fields || {}
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Tarefa adicionada!" });
    await commonTaskUpdate();
    return true;
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Tarefa excluída!" });
    await commonTaskUpdate();
    return true;
  };

  const setParentTask = async (taskIds: string[], parentId: string | null): Promise<boolean> => {
    const { error } = await supabase.from('tasks').update({ parent_id: parentId }).in('id', taskIds);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Hierarquia atualizada!" });
    await commonTaskUpdate();
    return true;
  };

  const updateTaskStatus = async (taskId: string, newStatusId: string): Promise<void> => {
    const { error } = await supabase.from('tasks').update({ status_id: newStatusId }).eq('id', taskId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    // No toast de sucesso para não poluir a UI no drag-and-drop
    await commonTaskUpdate();
  };
  
  const updateTask = async (taskId: string, updatedData: Partial<Task> & { tag_ids?: string[] }): Promise<void> => {
    const { tag_ids, ...taskFields } = updatedData;
    const { error } = await supabase.rpc('update_task_with_tags', {
        p_task_id: taskId, p_name: taskFields.name, p_description: taskFields.description,
        p_assignee_id: taskFields.assignee_id, p_status_id: taskFields.status_id, p_priority: taskFields.priority,
        p_progress: taskFields.progress, p_start_date: taskFields.start_date, p_end_date: taskFields.end_date,
        p_parent_id: taskFields.parent_id, p_dependencies: taskFields.dependencies || [],
        p_custom_fields: taskFields.custom_fields || {}, p_tag_ids: tag_ids || []
    });
    if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Tarefa atualizada!" }); }
    await commonTaskUpdate();
  };

  const contextValue = {
    tasks, rawTasks, loading, selectedProjectId, fetchMode, setSelectedProjectId, setFetchMode,
    refetchTasks: fetchTasks, addTask, deleteTask, setParentTask, updateTaskStatus, updateTask
  };

  return <TasksContext.Provider value={contextValue}>{children}</TasksContext.Provider>;
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) throw new Error("useTasks must be used within a TasksProvider");
  return context;
};
