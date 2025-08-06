"use client";
import { Suspense, useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { AdminDashboardProvider, useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';
import { useProjects } from '@/hooks/use-projects';
import { useUsers } from '@/hooks/use-users';
import KpiCard from "@/components/dashboard/kpi-card";
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { Button } from "@/components/ui/button";
import DashboardManagerModal from "@/components/dashboard/dashboard-manager-modal";
import { CheckCircle, DollarSign, ListTodo, Settings, Loader2, Zap } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import OverviewChart from '@/components/dashboard/overview-chart';
import RecentTasksCard from '@/components/dashboard/recent-tasks-card';
import type { Task } from '@/lib/types';

// Tipos
interface DashboardWidgetsData {
  recentTasks: Partial<Task>[];
  chartData: any[];
}
interface AdminDashboardWidgetsContextType {
  widgetsData: DashboardWidgetsData;
  loading: boolean;
}
const AdminDashboardWidgetsContext = createContext<AdminDashboardWidgetsContextType | undefined>(undefined);

// Novo Provider para os dados dos widgets
export const AdminDashboardWidgetsProvider = ({ children, projectId }: { children: ReactNode, projectId: string | null }) => {
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsData>({ recentTasks: [], chartData: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = { p_project_id: projectId === 'consolidated' ? null : projectId };
    try {
      const [tasksRes, chartRes] = await Promise.all([
        supabase.rpc('get_recent_tasks', params),
        supabase.rpc('get_overview_chart_data', params)
      ]);
      if (tasksRes.error) throw tasksRes.error;
      if (chartRes.error) throw chartRes.error;
      setWidgetsData({ recentTasks: tasksRes.data || [], chartData: chartRes.data || [] });
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados dos widgets", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  return <AdminDashboardWidgetsContext.Provider value={{ widgetsData, loading }}>{children}</AdminDashboardWidgetsContext.Provider>;
};
export const useAdminDashboardWidgets = () => useContext(AdminDashboardWidgetsContext)!;


// Conteúdo Principal do Dashboard
const DashboardContent = () => {
    const { user } = useUsers();
    const { projects } = useProjects();
    const { kpis, loading: kpisLoading, selectedProjectId, setSelectedProjectId } = useAdminDashboard();
    const { preferences, setPreference, savePreferences, loading: preferencesLoading } = useDashboardPreferences();
    const { widgetsData, loading: widgetsLoading } = useAdminDashboardWidgets();
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    if (kpisLoading || preferencesLoading || widgetsLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }
    
    const isManager = user?.role === 'Gerente' || user?.role === 'Admin';
    const isConsolidated = selectedProjectId === 'consolidated' || selectedProjectId === null;
    const currentProject = isConsolidated ? null : projects.find(p => p.id === selectedProjectId);

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            <PageHeader
                title={isManager ? "BI Dashboard" : "Painel de Controle"}
                description={isConsolidated ? "Visão consolidada de todos os projetos." : `Resumo do projeto: ${currentProject?.name}`}
                actions={
                     isManager ? (
                        <div className="flex items-center gap-4">
                            <ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} showConsolidatedView={true} />
                            <Button variant="outline" size="icon" onClick={() => setIsManagerOpen(true)}><Settings className="h-5 w-5" /></Button>
                        </div>
                    ) : null
                }
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {preferences.kpiBudget && <KpiCard title="Orçamento" value={`R$ ${(kpis.total_budget || 0).toLocaleString('pt-BR')}`} icon={<DollarSign />} />}
                {preferences.kpiCompletedTasks && <KpiCard title="Tarefas Concluídas" value={`${kpis.completed_tasks || 0} / ${kpis.total_tasks || 0}`} icon={<ListTodo />} />}
                {preferences.kpiCompletion && <KpiCard title="Progresso Geral" value={`${Math.round(kpis.overall_progress || 0)}%`} icon={<CheckCircle />} />}
                {preferences.kpiRisk && <KpiCard title="Tarefas em Risco" value={`${kpis.tasks_at_risk || 0}`} icon={<Zap />} valueClassName={(kpis.tasks_at_risk || 0) > 0 ? "text-destructive" : ""} />}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {preferences.chartOverview && <OverviewChart tasks={widgetsData.chartData} />}
                {preferences.cardRecentTasks && <RecentTasksCard tasks={widgetsData.recentTasks} />}
            </div>
            {isManager && <DashboardManagerModal isOpen={isManagerOpen} onOpenChange={setIsManagerOpen} preferences={preferences} setPreference={setPreference} onSave={() => { savePreferences(); setIsManagerOpen(false); }} />}
        </div>
    );
}

// Wrapper Principal da Página
const DashboardWithProviders = () => {
    const { selectedProjectId } = useAdminDashboard();
    return (
        <AdminDashboardWidgetsProvider projectId={selectedProjectId}>
            <DashboardContent />
        </AdminDashboardWidgetsProvider>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <AdminDashboardProvider>
                <DashboardWithProviders />
            </AdminDashboardProvider>
        </Suspense>
    );
}
