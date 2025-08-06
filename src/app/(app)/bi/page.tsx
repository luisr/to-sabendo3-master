"use client";
import { useState, useEffect, useMemo } from 'react';
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from '@/components/shared/project-selector';
import { useProjects } from '@/hooks/use-projects';
import { supabase } from '@/lib/supabase';
import { Loader2, LineChart, BarChart, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';

// Tipos para os dados do BI
interface BiDataRow {
  task_id: string;
  task_created_at: string;
  status_changed_at: string;
  old_status_name: string | null;
  new_status_name: string | null;
}

interface ChartDataPoint {
  date: string;
  total: number;
  completed: number;
}

// Componente do Gráfico de Burn-up
const BurnUpChart = ({ data }: { data: ChartDataPoint[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" name="Escopo Total" />
      <Area type="monotone" dataKey="completed" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Tarefas Concluídas" />
    </AreaChart>
  </ResponsiveContainer>
);

export default function BIPage() {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [biData, setBiData] = useState<BiDataRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    // Seleciona o primeiro projeto da lista por padrão
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const fetchBiData = async () => {
      if (!selectedProjectId) return;
      setLoadingData(true);
      const { data, error } = await supabase.rpc('get_bi_data', { p_project_id: selectedProjectId });
      if (error) {
        console.error("Erro ao buscar dados de BI:", error);
        setBiData([]);
      } else {
        setBiData(data || []);
      }
      setLoadingData(false);
    };
    fetchBiData();
  }, [selectedProjectId]);

  const chartData = useMemo(() => {
    if (biData.length === 0) return [];
    
    // Define o intervalo de datas (últimos 90 dias)
    const endDate = new Date();
    const startDate = subDays(endDate, 90);
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

    // Processa os dados para o formato do gráfico
    const dataPoints = dateInterval.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        const tasksCreatedByThisDate = new Set(
            biData.filter(d => parseISO(d.task_created_at) <= date).map(d => d.task_id)
        );

        const tasksCompletedByThisDate = new Set(
             biData.filter(d => d.new_status_name === 'Concluído' && parseISO(d.status_changed_at) <= date).map(d => d.task_id)
        );

        return {
            date: format(date, 'dd/MM'),
            total: tasksCreatedByThisDate.size,
            completed: tasksCompletedByThisDate.size,
        };
    });

    return dataPoints;
  }, [biData]);

  const renderContent = () => {
    if (loadingProjects) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (projects.length === 0) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Nenhum projeto encontrado.</div>;
    }
    return (
        <>
            <div className="flex items-center">
                <ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} />
            </div>
            {loadingData ? (
                 <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : biData.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Gráfico de Burn-up</CardTitle></CardHeader>
                        <CardContent><BurnUpChart data={chartData} /></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Outro Gráfico (WIP)</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">Em breve...</CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <div className="text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Sem Dados de Histórico</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Não encontramos dados de histórico de status para este projeto.</p>
                    </div>
                </div>
            )}
        </>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <PageHeader
        title="Business Intelligence"
        description="Análise avançada de tendências, gargalos e previsões do projeto."
      />
      {renderContent()}
    </div>
  );
}
