CREATE OR REPLACE FUNCTION public.get_my_projects_details()
RETURNS SETOF projects AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.projects p
  WHERE p.id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid())
     OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
