-- Função para buscar todas as tarefas atribuídas ao usuário logado
-- que não estão em um status considerado 'Concluído'.
CREATE OR REPLACE FUNCTION public.get_my_incomplete_tasks()
RETURNS TABLE (
    id uuid,
    formatted_id text,
    name text,
    priority text,
    end_date date,
    project_id uuid,
    project_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        'TSK-' || lpad(t.task_serial_id::text, 4, '0') as formatted_id,
        t.name,
        t.priority::text,
        t.end_date,
        t.project_id,
        p.name as project_name
    FROM
        public.tasks t
    JOIN
        public.projects p ON t.project_id = p.id
    LEFT JOIN
        public.task_statuses ts ON t.status_id = ts.id
    WHERE
        t.assignee_id = auth.uid()
        AND (ts.name IS NULL OR ts.name <> 'Concluído');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
