-- Substitui a função anterior por uma que retorna o objeto de tarefa completo,
-- necessário para componentes como o EditTaskModal.
DROP FUNCTION IF EXISTS public.get_my_incomplete_tasks();
CREATE OR REPLACE FUNCTION public.get_my_incomplete_tasks()
RETURNS TABLE (
    id uuid, formatted_id text, name text, description text, assignee_id uuid, status_id uuid, priority text, start_date date,
    end_date date, progress integer, wbs_code text, dependencies uuid[], parent_id uuid, created_at timestamptz,
    project_id uuid, project_name text, assignee_name text, status_name text, status_color text, tags json, custom_fields jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        'TSK-' || lpad(t.task_serial_id::text, 4, '0') as formatted_id,
        t.name, t.description, t.assignee_id, t.status_id, t.priority::text, t.start_date,
        t.end_date, t.progress, t.wbs_code,
        -- Agrega as dependências da tabela task_dependencies
        COALESCE((SELECT array_agg(td.dependency_id) FROM public.task_dependencies td WHERE td.task_id = t.id), ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        COALESCE(u.name, auth_user.email, 'N/A') as assignee_name,
        ts.name as status_name, ts.color as status_color,
        -- Agrega as tags da tabela task_tags
        COALESCE(
            (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id),
            '[]'::json
        ) as tags,
        t.custom_fields
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles u ON t.assignee_id = u.id
    LEFT JOIN auth.users auth_user ON u.id = auth_user.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE
        t.assignee_id = auth.uid()
        AND (ts.name IS NULL OR ts.name <> 'Concluído');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
