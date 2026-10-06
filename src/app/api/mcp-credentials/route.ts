import { NextResponse } from "next/server";
import { z } from "zod";
import { createOwnMcpCredential, listOwnMcpCredentials } from "@/lib/services/mcp-credentials";
import { apiUser, assertSameOrigin, errorResponse } from "@/lib/services/http";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120).default("ChatGPT Personal"),
});

export async function GET() {
  try {
    const user = await apiUser();
    return NextResponse.json(await listOwnMcpCredentials(user), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await apiUser();
    const input = createSchema.parse(await request.json());
    const { credential, secret } = await createOwnMcpCredential(user, input);

    const serverUrl = new URL("/mcp", request.url);
    serverUrl.searchParams.set("key", secret);

    return NextResponse.json({
      credential,
      secret,
      serverUrl: serverUrl.toString(),
    }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
