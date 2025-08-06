import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { filePath, projectId, mappings } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Baixar o arquivo do bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('tosabendo2')
      .download(filePath);

    if (downloadError) throw downloadError;

    const fileContent = await fileData.text();

    // 2. Analisar o CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`Erro ao analisar o CSV: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const tasksToInsert = parseResult.data.map((row: any) => {
      const task: { [key: string]: any } = {
        project_id: projectId,
        custom_fields: {},
      };

      for (const csvHeader in mappings) {
        const systemField = mappings[csvHeader];
        if (systemField === 'ignore' || !row[csvHeader]) continue;

        if (systemField.startsWith('custom_')) {
          task.custom_fields[systemField] = row[csvHeader];
        } else {
          task[systemField] = row[csvHeader];
        }
      }
      return task;
    });
    
    // 3. Inserir as tarefas no banco de dados
    const { error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert);
      
    if (insertError) throw insertError;

    // 4. Excluir o arquivo do bucket
    await supabaseAdmin.storage.from('tosabendo2').remove([filePath]);

    return new Response(JSON.stringify({ message: `${tasksToInsert.length} tarefas importadas com sucesso.` }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 400,
    });
  }
});
