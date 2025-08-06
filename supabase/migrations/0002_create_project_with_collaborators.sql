-- Nova função para criar um projeto e adicionar colaboradores atomicamente
CREATE OR REPLACE FUNCTION public.create_project_with_collaborators(
    p_name text,
    p_description text,
    p_start_date date,
    p_end_date date,
    p_budget numeric,
    p_collaborator_ids uuid[]
)
RETURNS uuid AS $$
DECLARE
    new_project_id uuid;
    creator_id uuid := auth.uid();
BEGIN
    -- Inserir o novo projeto na tabela 'projects'
    INSERT INTO public.projects (name, description, start_date, end_date, budget)
    VALUES (p_name, p_description, p_start_date, p_end_date, p_budget)
    RETURNING id INTO new_project_id;

    -- Adicionar o criador do projeto como 'Gerente'
    -- Usamos ON CONFLICT para evitar erro caso o ID já esteja na lista de colaboradores
    INSERT INTO public.collaborators (project_id, user_id, role)
    VALUES (new_project_id, creator_id, 'Gerente')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Adicionar os colaboradores selecionados como 'Membro'
    IF array_length(p_collaborator_ids, 1) > 0 THEN
        INSERT INTO public.collaborators (project_id, user_id, role)
        SELECT new_project_id, collaborator_id, 'Membro'
        FROM unnest(p_collaborator_ids) AS collaborator_id
        -- Garante que não tentemos inserir o criador novamente se ele foi selecionado na lista
        WHERE collaborator_id <> creator_id 
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;

    RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
