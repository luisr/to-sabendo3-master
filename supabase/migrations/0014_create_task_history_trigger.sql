-- Esta função será chamada pelo nosso gatilho.
-- Ela compara a versão antiga (OLD) e a nova (NEW) da tarefa
-- e insere um registro na tabela de histórico para cada campo alterado.
CREATE OR REPLACE FUNCTION public.record_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    -- Pega o ID do usuário que fez a alteração
    p_user_id uuid := auth.uid();
BEGIN
    -- Verifica se o campo 'status_id' mudou
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
        INSERT INTO public.task_history (task_id, user_id, changed_field, old_value, new_value)
        VALUES (NEW.id, p_user_id, 'status_id', OLD.status_id::text, NEW.status_id::text);
    END IF;

    -- Verifica se o campo 'assignee_id' mudou
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
        INSERT INTO public.task_history (task_id, user_id, changed_field, old_value, new_value)
        VALUES (NEW.id, p_user_id, 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
    END IF;

    -- Adicione outros campos que você queira rastrear aqui (ex: name, description, end_date)
    -- IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN ... END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- O Gatilho (Trigger)
-- Primeiro, removemos o gatilho antigo se ele existir, para evitar duplicação.
DROP TRIGGER IF EXISTS on_task_update_history ON public.tasks;

-- Agora, criamos o novo gatilho.
-- Ele será acionado DEPOIS de cada atualização (UPDATE) na tabela de tarefas.
-- Ele executará a função para CADA LINHA (FOR EACH ROW) que for alterada.
CREATE TRIGGER on_task_update_history
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.record_task_changes();
