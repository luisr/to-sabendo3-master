-- Esta função centraliza todos os cálculos de KPIs do dashboard,
-- tornando o carregamento da página ordens de magnitude mais rápido.
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(p_project_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    -- Variáveis para os resultados
    kpis jsonb;
    project_ids uuid[];
BEGIN
    -- Determina em quais projetos devemos calcular os KPIs
    IF p_project_id IS NOT NULL THEN
        -- Se um projeto específico é solicitado, usa apenas o ID dele
        project_ids := ARRAY[p_project_id];
    ELSE
        -- Se for a visão consolidada, pega todos os projetos do usuário
        SELECT array_agg(project_id) INTO project_ids FROM public.collaborators WHERE user_id = auth.uid();
    END IF;

    -- Se o usuário não tem projetos, retorna um objeto vazio
    IF project_ids IS NULL OR array_length(project_ids, 1) = 0 THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Calcula todos os KPIs em uma única consulta
    SELECT jsonb_build_object(
        'total_budget', SUM(p.budget),
        'total_projects', COUNT(DISTINCT t.project_id),
        'total_tasks', COUNT(t.id),
        'completed_tasks', COUNT(t.id) FILTER (WHERE ts.name = 'Concluído'),
        'tasks_at_risk', COUNT(t.id) FILTER (WHERE ts.name <> 'Concluído' AND t.end_date < CURRENT_DATE),
        'overall_progress', AVG(t.progress)
    )
    INTO kpis
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = ANY(project_ids);

    RETURN kpis;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
