-- Esta função substitui a versão anterior, que continha um erro de lógica.
-- A correção principal é usar a coluna `changed_at` para a data, em vez
-- de tentar converter o `new_value` (que é um UUID) para uma data.
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
        -- Na visão consolidada, pega todos os projetos do usuário
        SELECT array_agg(c.project_id) INTO project_ids FROM public.collaborators c WHERE c.user_id = auth.uid();
    END IF;

    -- Se não houver projetos, retorna uma tabela vazia
    IF project_ids IS NULL OR array_length(project_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Retorna a contagem de tarefas que entraram no status 'Concluído', agrupadas por dia
    RETURN QUERY
    SELECT
        th.changed_at::date AS date, -- ** A CORREÇÃO ESTÁ AQUI **
        COUNT(th.task_id) AS completed_count
    FROM
        public.task_history th
    JOIN
        public.tasks t ON th.task_id = t.id
    WHERE 
        t.project_id = ANY(project_ids)
        AND th.changed_field = 'status_id'
        AND th.new_value IN (SELECT ts.id::text FROM public.task_statuses ts WHERE ts.name = 'Concluído')
    GROUP BY
        th.changed_at::date -- Agrupa pela data da mudança
    ORDER BY
        date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
