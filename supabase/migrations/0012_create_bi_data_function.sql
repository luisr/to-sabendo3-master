-- Esta função coleta o histórico detalhado de mudanças de status das tarefas,
-- que é a base para a construção da maioria dos gráficos de BI (Burn-up, Burn-down, CFD).
CREATE OR REPLACE FUNCTION public.get_bi_data(p_project_id uuid)
RETURNS TABLE (
    task_id uuid,
    task_created_at timestamptz,
    status_changed_at timestamptz,
    old_status_name text,
    new_status_name text
) AS $$
BEGIN
    -- Validação: Retorna vazio se nenhum ID de projeto for fornecido
    IF p_project_id IS NULL THEN
        RETURN;
    END IF;

    -- A consulta une o histórico de tarefas com as tarefas e os status
    -- para obter os dados necessários para a análise de BI.
    RETURN QUERY
    SELECT
        th.task_id,
        t.created_at AS task_created_at,
        th.changed_at AS status_changed_at,
        os.name AS old_status_name,
        ns.name AS new_status_name
    FROM
        public.task_history th
    -- Junta com a tabela de tarefas para garantir que a tarefa pertence ao projeto selecionado
    JOIN
        public.tasks t ON th.task_id = t.id
    -- Junta com a tabela de status duas vezes para obter os nomes do status antigo e novo
    LEFT JOIN
        public.task_statuses os ON th.old_value::uuid = os.id
    LEFT JOIN
        public.task_statuses ns ON th.new_value::uuid = ns.id
    WHERE
        t.project_id = p_project_id
        AND th.changed_field = 'status_id' -- Filtra apenas por mudanças de status
    ORDER BY
        th.changed_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
