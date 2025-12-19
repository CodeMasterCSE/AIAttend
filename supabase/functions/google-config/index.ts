import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Google Client ID is a public identifier, safe to expose
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');

  return new Response(JSON.stringify({ clientId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
