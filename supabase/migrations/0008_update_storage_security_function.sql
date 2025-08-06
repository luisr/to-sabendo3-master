-- Esta função substitui a original, tornando-a mais inteligente para lidar
-- tanto com anexos de tarefas quanto com uploads de importação de CSV.
CREATE OR REPLACE FUNCTION public.can_interact_with_task_file(p_file_path text)
RETURNS boolean AS $$
DECLARE
    path_parts text[];
    project_id_from_path uuid;
    task_id_from_path uuid;
    has_permission boolean := false;
BEGIN
    -- Divide o caminho do arquivo em partes. Ex: 'imports/uuid-...' -> {'imports', 'uuid-...'}
    path_parts := string_to_array(p_file_path, '/');

    -- CASO 1: É um arquivo de importação? (caminho começa com 'imports/')
    IF path_parts[1] = 'imports' THEN
        BEGIN
            -- Extrai o UUID do projeto do nome do arquivo. Ex: 'uuid-timestamp-nome.csv'
            project_id_from_path := substring(path_parts[2] from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
        EXCEPTION WHEN others THEN
            RETURN FALSE; -- Nome do arquivo não está no formato esperado
        END;

        -- Verifica se o usuário é um colaborador do projeto extraído
        SELECT EXISTS (
            SELECT 1 FROM public.collaborators c
            WHERE c.project_id = project_id_from_path AND c.user_id = auth.uid()
        ) INTO has_permission;

    -- CASO 2: É um anexo de tarefa? (lógica original)
    -- Adicionamos uma verificação para garantir que o caminho tenha o formato esperado, ex: 'public/attachments/task_id/...'
    ELSIF array_length(path_parts, 1) >= 3 THEN
        BEGIN
            task_id_from_path := path_parts[3]::uuid;
        EXCEPTION WHEN others THEN
            RETURN FALSE; -- A terceira parte não é um UUID de tarefa válido
        END;

        -- Verifica se o usuário é colaborador no projeto ao qual a tarefa pertence
        SELECT EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.collaborators c ON t.project_id = c.project_id
            WHERE t.id = task_id_from_path AND c.user_id = auth.uid()
        ) INTO has_permission;
    END IF;

    -- Permite acesso total para Admins, independentemente das outras regras
    RETURN has_permission OR (SELECT public.get_my_role() = 'Admin');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
