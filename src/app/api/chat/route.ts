import { chat } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          send({ type: "status", text: "Thinking..." });

          const result = await chat(
            messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
            (status: string) => {
              send({ type: "status", text: status });
            }
          );

          send({
            type: "result",
            content: result.text,
            toolCards: result.toolCards,
          });

          send({ type: "done" });
          controller.close();
        } catch (error) {
          console.error("Chat error:", error);
          send({
            type: "error",
            text: "Something went wrong. Please try again.",
          });
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
  } catch (error) {
    console.error("Request error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
