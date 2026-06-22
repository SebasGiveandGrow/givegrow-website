export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }});
    }

    // ALMA proxy — /api/alma
    if (url.pathname === '/api/alma' && request.method === 'POST') {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({type:'error',error:{type:'api_error',message:'ANTHROPIC_API_KEY not set'}}), {
          status: 503, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
        });
      }
      const body = await request.text();
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body
      });
      const text = await resp.text();
      return new Response(text, {
        status: resp.status,
        headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
      });
    }

    // Archivos estáticos
    return env.ASSETS.fetch(request);
  }
};
