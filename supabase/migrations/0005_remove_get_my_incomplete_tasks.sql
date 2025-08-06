-- Remove a função que não é mais necessária, pois a lógica de filtro
-- será implementada diretamente no frontend na página de projetos.
DROP FUNCTION IF EXISTS public.get_my_incomplete_tasks();
