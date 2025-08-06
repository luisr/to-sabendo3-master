"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface DashboardKpis {
  total_budget?: number;
  total_projects?: number;
  total_tasks?: number;
  completed_tasks?: number;
  tasks_at_risk?: number;
  overall_progress?: number;
}

interface AdminDashboardContextType {
  kpis: DashboardKpis;
  loading: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  refetchKpis: () => void;
}

const AdminDashboardContext = createContext<AdminDashboardContextType | undefined>(undefined);

export const AdminDashboardProvider = ({ children }: { children: ReactNode }) => {
  const [kpis, setKpis] = useState<DashboardKpis>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('consolidated');
  const { toast } = useToast();

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    
    const params = selectedProjectId === 'consolidated' || selectedProjectId === null 
      ? {} 
      : { p_project_id: selectedProjectId };

    const { data, error } = await supabase.rpc('get_dashboard_kpis', params);

    if (error) {
      toast({ title: "Erro ao carregar KPIs", description: error.message, variant: "destructive" });
      setKpis({});
    } else {
      setKpis(data || {});
    }
    setLoading(false);
  }, [selectedProjectId, toast]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return (
    <AdminDashboardContext.Provider value={{ kpis, loading, selectedProjectId, setSelectedProjectId, refetchKpis: fetchKpis }}>
      {children}
    </AdminDashboardContext.Provider>
  );
};

export const useAdminDashboard = () => {
  const context = useContext(AdminDashboardContext);
  if (context === undefined) {
    throw new Error("useAdminDashboard must be used within a AdminDashboardProvider");
  }
  return context;
};
