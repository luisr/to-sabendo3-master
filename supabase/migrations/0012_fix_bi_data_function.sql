-- Esta versão corrige a anterior, adicionando verificações para garantir
-- que a conversão de `text` para `uuid` só ocorra quando os valores não são nulos.
CREATE OR REPLACE FUNCTION public.get_bi_data(p_project_id uuid)
RETURNS TABLE (
    task_id uuid,
    task_created_at timestamptz,
    status_changed_at timestamptz,
    old_status_name text,
    new_status_name text
) AS $$
BEGIN
    IF p_project_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        th.task_id,
        t.created_at AS task_created_at,
        th.changed_at AS status_changed_at,
        os.name AS old_status_name,
        ns.name AS new_status_name
    FROM
        public.task_history th
    JOIN
        public.tasks t ON th.task_id = t.id
    -- Correção: Faz o JOIN apenas quando o valor pode ser convertido para UUID
    LEFT JOIN
        public.task_statuses os ON th.old_value IS NOT NULL AND th.old_value::uuid = os.id
    LEFT JOIN
        public.task_statuses ns ON th.new_value IS NOT NULL AND th.new_value::uuid = ns.id
    WHERE
        t.project_id = p_project_id
        AND th.changed_field = 'status_id'
    ORDER BY
        th.changed_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
