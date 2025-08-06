-- Esta função permite salvar (UPSERT) múltiplas preferências de dashboard
-- para um usuário em uma única chamada, o que é muito eficiente.
CREATE TYPE public.dashboard_preference AS (
    widget_id text,
    is_visible boolean
);

CREATE OR REPLACE FUNCTION public.upsert_dashboard_preferences(
    preferences dashboard_preference[]
)
RETURNS void AS $$
DECLARE
    -- Pega o ID do usuário que está chamando a função
    p_user_id uuid := auth.uid();
    pref dashboard_preference;
BEGIN
    -- Percorre a lista de preferências enviadas pelo frontend
    FOREACH pref IN ARRAY preferences
    LOOP
        -- Tenta inserir ou atualizar a preferência no banco de dados
        INSERT INTO public.user_dashboard_preferences (user_id, widget_id, is_visible)
        VALUES (p_user_id, pref.widget_id, pref.is_visible)
        ON CONFLICT (user_id, widget_id) -- Se a combinação usuário/widget já existir...
        DO UPDATE SET is_visible = pref.is_visible; -- ...apenas atualiza o valor.
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
