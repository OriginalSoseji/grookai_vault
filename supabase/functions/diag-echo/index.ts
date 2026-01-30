Deno.serve((_req)=>new Response(JSON.stringify({
    ok: true,
    route: "diag-echo"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  }));
