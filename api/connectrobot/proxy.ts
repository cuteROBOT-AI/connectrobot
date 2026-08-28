type ProtectedNetworkingDnaHandler = (request: Request) => Response | Promise<Response>;

export async function forwardToProtectedNetworkingDnaEndpoint(
  request: Request,
  destinationPath: string,
  handler: ProtectedNetworkingDnaHandler,
): Promise<Response> {
  const apiKey = process.env.NETWORKING_DNA_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "NETWORKING_DNA_API_KEY is not configured" }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  const destinationUrl = new URL(destinationPath, request.url);
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body.length > 0) {
      init.body = body;
    }
  }

  return handler(new Request(destinationUrl, init));
}
