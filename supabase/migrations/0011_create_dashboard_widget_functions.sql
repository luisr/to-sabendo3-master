-- Função #1: Obter as 5 tarefas mais recentes para o card "Atividade Recente"
-- Aceita um ID de projeto opcional para filtrar os resultados.
CREATE OR REPLACE FUNCTION public.get_recent_tasks(p_project_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    name text,
    project_name text,
    assignee_name text,
    status_name text,
    status_color text,
    created_at timestamptz
) AS $$
DECLARE
    project_ids uuid[];
BEGIN
    -- Determina os projetos a serem considerados
    IF p_project_id IS NOT NULL THEN
        project_ids := ARRAY[p_project_id];
    ELSE
        SELECT array_agg(project_id) INTO project_ids FROM public.collaborators WHERE user_id = auth.uid();
    END IF;

    -- Retorna as 5 tarefas mais recentes dos projetos selecionados
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        p.name as project_name,
        COALESCE(prof.name, u.email) as assignee_name,
        ts.name as status_name,
        ts.color as status_color,
        t.created_at
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles prof ON t.assignee_id = prof.id
    LEFT JOIN auth.users u ON prof.id = u.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = ANY(project_ids)
    ORDER BY t.created_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- Função #2: Obter dados agregados para o gráfico de Overview (Burnup)
-- Agrupa as tarefas por dia de conclusão.
CREATE OR REPLACE FUNCTION public.get_overview_chart_data(p_project_id uuid DEFAULT NULL)
RETURNS TABLE (
    date date,
    completed_count bigint
) AS $$
DECLARE
    project_ids uuid[];
BEGIN
    -- Determina os projetos a serem considerados
    IF p_project_id IS NOT NULL THEN
        project_ids := ARRAY[p_project_id];
    ELSE
        SELECT array_agg(project_id) INTO project_ids FROM public.collaborators WHERE user_id = auth.uid();
    END IF;

    -- Retorna a contagem de tarefas concluídas por dia
    RETURN QUERY
    SELECT
        -- A data em que o status foi alterado para 'Concluído'
        (th.new_value::date) as date,
        COUNT(th.task_id) as completed_count
    FROM public.task_history th
    JOIN public.tasks t ON th.task_id = t.id
    WHERE 
        t.project_id = ANY(project_ids)
        AND th.changed_field = 'status_id'
        AND th.new_value IN (SELECT id::text FROM public.task_statuses WHERE name = 'Concluído')
    GROUP BY date
    ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
