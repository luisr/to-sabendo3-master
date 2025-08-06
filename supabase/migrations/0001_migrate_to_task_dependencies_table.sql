-- Passo 1: Adicionar a nova tabela de dependências (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, dependency_id)
);

-- Passo 2: Remover a coluna 'dependencies' da tabela 'tasks'
ALTER TABLE public.tasks
DROP COLUMN IF EXISTS dependencies;

-- Passo 3: Recriar a função get_tasks_for_project
DROP FUNCTION IF EXISTS public.get_tasks_for_project(uuid);
CREATE OR REPLACE FUNCTION public.get_tasks_for_project(p_project_id uuid)
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
        COALESCE(deps.dependency_ids, ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        COALESCE(u.name, auth_user.email, 'N/A') as assignee_name,
        ts.name as status_name, ts.color as status_color,
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
    LEFT JOIN (
        SELECT task_id, array_agg(dependency_id) as dependency_ids
        FROM public.task_dependencies
        GROUP BY task_id
    ) deps ON t.id = deps.task_id
    WHERE t.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Passo 4: Recriar a função get_all_user_tasks
DROP FUNCTION IF EXISTS public.get_all_user_tasks();
CREATE OR REPLACE FUNCTION public.get_all_user_tasks()
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
        COALESCE(deps.dependency_ids, ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        COALESCE(u.name, auth_user.email, 'N/A') as assignee_name,
        ts.name as status_name, ts.color as status_color,
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
    LEFT JOIN (
        SELECT task_id, array_agg(dependency_id) as dependency_ids
        FROM public.task_dependencies
        GROUP BY task_id
    ) deps ON t.id = deps.task_id
    WHERE t.project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Passo 5: Recriar a função insert_task_with_tags
DROP FUNCTION IF EXISTS public.insert_task_with_tags(uuid,text,text,uuid,uuid,text,integer,text,text,uuid,uuid[],uuid[],jsonb);
CREATE OR REPLACE FUNCTION public.insert_task_with_tags(
    p_project_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text, 
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[], p_custom_fields jsonb
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    INSERT INTO public.tasks (
        project_id, name, description, assignee_id, status_id, priority, progress, start_date, end_date, parent_id, custom_fields
    ) VALUES (
        p_project_id, p_name, p_description, p_assignee_id, p_status_id, p_priority::task_priority, p_progress, 
        p_start_date::date, p_end_date::date, p_parent_id, p_custom_fields
    ) RETURNING id INTO new_task_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
        INSERT INTO public.task_tags (task_id, tag_id)
        SELECT new_task_id, unnest(p_tag_ids);
    END IF;

    IF array_length(p_dependencies, 1) > 0 THEN
        INSERT INTO public.task_dependencies (task_id, dependency_id)
        SELECT new_task_id, unnest(p_dependencies);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

-- Passo 6: Recriar a função update_task_with_tags
DROP FUNCTION IF EXISTS public.update_task_with_tags(uuid,text,text,uuid,uuid,text,integer,text,text,uuid,uuid[],uuid[],jsonb);
CREATE OR REPLACE FUNCTION public.update_task_with_tags(
    p_task_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text,
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[], p_custom_fields jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE public.tasks
    SET
        name = p_name, description = p_description, assignee_id = p_assignee_id, status_id = p_status_id,
        priority = p_priority::task_priority, progress = p_progress, start_date = p_start_date::date,
        end_date = p_end_date::date, parent_id = p_parent_id, custom_fields = p_custom_fields
    WHERE id = p_task_id;

    -- Gerenciar tags
    DELETE FROM public.task_tags WHERE task_id = p_task_id;
    IF array_length(p_tag_ids, 1) > 0 THEN
        INSERT INTO public.task_tags (task_id, tag_id)
        SELECT p_task_id, unnest(p_tag_ids);
    END IF;

    -- Gerenciar dependências
    DELETE FROM public.task_dependencies WHERE task_id = p_task_id;
    IF array_length(p_dependencies, 1) > 0 THEN
        INSERT INTO public.task_dependencies (task_id, dependency_id)
        SELECT p_task_id, unnest(p_dependencies);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Passo 7: Desativar o trigger antigo que usava a coluna 'dependencies'
DROP TRIGGER IF EXISTS after_task_update ON public.tasks;
DROP FUNCTION IF EXISTS update_dependent_tasks();

SELECT 'Script de migração para task_dependencies executado com sucesso!';
