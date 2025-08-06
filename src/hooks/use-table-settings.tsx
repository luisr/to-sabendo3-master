"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Tipos
export interface TaskStatus { id: string; name: string; color: string; display_order?: number; }
export interface Tag { id: string; name: string; }
export interface Column { id: string; name: string; type: 'text' | 'number' | 'date' | 'progress'; }
interface UiPreferences {
  columns: Column[];
  visibleColumns: string[];
}

interface TableSettingsContextType {
  statuses: TaskStatus[];
  tags: Tag[];
  loading: boolean;
  columns: Column[];
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  addColumn: (columnName: string, columnType: Column['type']) => Promise<Column | null>;
  updateColumn: (columnId: string, newName: string, newType: Column['type']) => void;
  deleteColumn: (columnId: string) => void;
  addStatus: (status: Omit<TaskStatus, 'id'>) => Promise<TaskStatus | null>;
  updateStatus: (id: string, updates: Partial<TaskStatus>) => Promise<boolean>;
  deleteStatus: (id: string) => Promise<boolean>;
  addTag: (tag: Omit<Tag, 'id'>) => Promise<Tag | null>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
}

const TableSettingsContext = createContext<TableSettingsContextType | undefined>(undefined);

const defaultColumns: Column[] = [
    { id: 'project_name', name: 'Projeto', type: 'text' },
    { id: 'assignee_name', name: 'Responsável', type: 'text' },
    { id: 'status_name', name: 'Status', type: 'text' },
    { id: 'priority', name: 'Prioridade', type: 'text' },
    { id: 'tags', name: 'Tags', type: 'text' },
    { id: 'progress', name: 'Progresso', type: 'progress' },
    { id: 'start_date', name: 'Início', type: 'date' },
    { id: 'end_date', name: 'Fim', type: 'date' },
    { id: 'duration', name: 'Duração', type: 'number' },
];

export const TableSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns.map(c => c.id));
  const { toast } = useToast();

  const persistPreferences = async (newPreferences: UiPreferences) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ ui_preferences: newPreferences }).eq('id', user.id);
    if (error) toast({ title: "Erro ao salvar preferências", description: "Não foi possível salvar as alterações de coluna.", variant: "destructive" });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [statusRes, tagsRes, profileRes] = await Promise.all([
        supabase.from('task_statuses').select('*').order('display_order'),
        supabase.from('tags').select('*'),
        user ? supabase.from('profiles').select('ui_preferences').eq('id', user.id).single() : Promise.resolve({ data: null, error: null })
      ]);

      if (statusRes.error) throw statusRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      
      setStatuses(statusRes.data || []);
      setTags(tagsRes.data || []);

      const userPreferences = profileRes.data?.ui_preferences as UiPreferences;
      if (userPreferences && userPreferences.columns) {
        setColumns(userPreferences.columns);
        setVisibleColumns(userPreferences.visibleColumns || userPreferences.columns.map(c => c.id));
      } else {
        setColumns(defaultColumns);
        setVisibleColumns(defaultColumns.map(c => c.id));
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ** LÓGICA RESTAURADA **
  const addStatus = async (status: Omit<TaskStatus, 'id'>) => {
    const { data, error } = await supabase.from('task_statuses').insert(status).select();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return null; }
    const newStatus = data[0];
    setStatuses(prev => [...prev, newStatus]);
    return newStatus;
  };
  const updateStatus = async (id: string, updates: Partial<TaskStatus>) => {
    const { error } = await supabase.from('task_statuses').update(updates).eq('id', id);
    if(error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    return true;
  };
  const deleteStatus = async (id: string) => {
    const { error } = await supabase.from('task_statuses').delete().eq('id', id);
    if(error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    setStatuses(prev => prev.filter(s => s.id !== id));
    return true;
  };
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    const { data, error } = await supabase.from('tags').insert(tag).select();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return null; }
    const newTag = data[0];
    setTags(prev => [...prev, newTag]);
    return newTag;
  };
  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const { error } = await supabase.from('tags').update(updates).eq('id', id);
    if(error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return true;
  };
  const deleteTag = async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if(error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    setTags(prev => prev.filter(t => t.id !== id));
    return true;
  };
  // ** FIM DA LÓGICA RESTAURADA **

  const handleSetVisibleColumns = async (newVisible: string[]) => {
    setVisibleColumns(newVisible);
    await persistPreferences({ columns, visibleColumns: newVisible });
  };
  
  const addColumn = async (columnName: string, columnType: Column['type']): Promise<Column | null> => {
    const newColumn = { id: `custom_${Date.now()}`, name: columnName, type: columnType };
    const newColumns = [...columns, newColumn];
    const newVisibleColumns = [...visibleColumns, newColumn.id];
    setColumns(newColumns);
    setVisibleColumns(newVisibleColumns);
    await persistPreferences({ columns: newColumns, visibleColumns: newVisibleColumns });
    return newColumn;
  };

  const updateColumn = async (columnId: string, newName: string, newType: Column['type']) => {
    const newColumns = columns.map(c => c.id === columnId ? { ...c, name: newName, type: newType } : c);
    setColumns(newColumns);
    await persistPreferences({ columns: newColumns, visibleColumns });
  };

  const deleteColumn = async (columnId: string) => {
    const newColumns = columns.filter(c => c.id !== columnId);
    const newVisibleColumns = visibleColumns.filter(id => id !== columnId);
    setColumns(newColumns);
    setVisibleColumns(newVisibleColumns);
    await persistPreferences({ columns: newColumns, visibleColumns: newVisibleColumns });
  };
  
  return (
    <TableSettingsContext.Provider value={{ 
      statuses, tags, loading,
      addStatus, updateStatus, deleteStatus,
      addTag, updateTag, deleteTag,
      columns, visibleColumns, 
      setVisibleColumns: handleSetVisibleColumns,
      addColumn, updateColumn, deleteColumn
    }}>
      {children}
    </TableSettingsContext.Provider>
  );
};

export const useTableSettings = () => {
  const context = useContext(TableSettingsContext);
  if (context === undefined) throw new Error('useTableSettings must be used within a TableSettingsProvider');
  return context;
};
