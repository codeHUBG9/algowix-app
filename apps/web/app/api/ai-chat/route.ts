import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface ChatBody {
  messages: { role: "user" | "assistant"; content: string }[];
  pageContext?: string;
}

function systemPrompt(pageContext?: string) {
  return `You are the built-in AI assistant for AlgoWix, a multi-tenant SaaS platform.
You have access to the user's current page context.
Help with: navigation, understanding data, explaining features, drafting content,
answering questions about billing/subscriptions/RBAC/integrations/inventory/CRM/HRMS.
Be concise. Use markdown for structure. Never fabricate data — if you don't know, say so.
Current page context: ${pageContext ?? "unknown"}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI Chat is not configured. Add ANTHROPIC_API_KEY to apps/web/.env.local." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, pageContext } = (await req.json()) as ChatBody;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages is required" }), { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const events = client.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 1024,
          system: systemPrompt(pageContext),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        events.on("text", (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        });

        await events.finalMessage();
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI Chat request failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
