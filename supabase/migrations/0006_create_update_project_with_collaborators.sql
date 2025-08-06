-- Função para atualizar um projeto e sincronizar sua lista de colaboradores
CREATE OR REPLACE FUNCTION public.update_project_with_collaborators(
    p_project_id uuid,
    p_name text,
    p_description text,
    p_start_date date,
    p_end_date date,
    p_budget numeric,
    p_collaborator_ids uuid[]
)
RETURNS void AS $$
DECLARE
    -- Variáveis
    manager_id uuid;
    collaborator_id uuid;
BEGIN
    -- 1. Atualiza os detalhes do projeto na tabela 'projects'
    UPDATE public.projects
    SET
        name = p_name,
        description = p_description,
        start_date = p_start_date,
        end_date = p_end_date,
        budget = p_budget,
        updated_at = now()
    WHERE id = p_project_id;

    -- 2. Identifica o gerente do projeto para não removê-lo
    SELECT user_id INTO manager_id 
    FROM public.collaborators 
    WHERE project_id = p_project_id AND role = 'Gerente'
    LIMIT 1;

    -- 3. Remove colaboradores que não estão mais na nova lista (exceto o gerente)
    DELETE FROM public.collaborators
    WHERE project_id = p_project_id
      AND user_id <> manager_id
      AND user_id NOT IN (SELECT unnest(p_collaborator_ids));

    -- 4. Adiciona os novos colaboradores da lista
    -- A cláusula ON CONFLICT garante que não haja erro se um colaborador já existir
    INSERT INTO public.collaborators (project_id, user_id, role)
    SELECT p_project_id, unnest_id, 'Membro'::collaborator_role
    FROM unnest(p_collaborator_ids) AS unnest_id
    ON CONFLICT (project_id, user_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
