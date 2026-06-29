import { NextRequest, NextResponse } from "next/server";
import { TAKEOFF_SYSTEM_PROMPT, parseAiJson } from "@/lib/ai/takeoffPrompt";
import { guard } from "@/lib/api/guard";
import type { AiTakeoffResponse, DeterministicTakeoff } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface TakeoffRequestBody {
  inputs: Record<string, unknown>;
  deterministic: DeterministicTakeoff;
  photos: string[]; // base64 (data URLs or raw base64), ordered
}

export async function POST(req: NextRequest) {
  // ~12 MB cap (8 photos of base64), 20 calls / 10 min per IP, same-origin only.
  const blocked = guard(req, { name: "takeoff", limit: 20, windowMs: 600_000, maxBytes: 12_000_000 });
  if (blocked) return blocked;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: TakeoffRequestBody;
  try {
    body = (await req.json()) as TakeoffRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content: unknown[] = [
    {
      type: "text",
      text:
        "STRUCTURED INPUTS:\n" +
        JSON.stringify(body.inputs, null, 2) +
        "\n\nDETERMINISTIC BASELINE (engine-owned — do not change physics):\n" +
        JSON.stringify(body.deterministic, null, 2) +
        "\n\nReturn ONLY the JSON object described in the system prompt.",
    },
  ];

  for (const p of (body.photos ?? []).slice(0, 8)) {
    const { mediaType, data } = splitBase64(p);
    // Whitelist the media type so a client can't smuggle an arbitrary data: prefix.
    const media = ALLOWED_MEDIA.has(mediaType) ? mediaType : "image/jpeg";
    content.push({
      type: "image",
      source: { type: "base64", media_type: media, data },
    });
  }

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: TAKEOFF_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Network error contacting the AI service." },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    // Log detail server-side; don't leak the upstream body to the client.
    const text = await resp.text().catch(() => "");
    console.error(`Anthropic ${resp.status}: ${text.slice(0, 500)}`);
    return NextResponse.json(
      { error: `AI service error (${resp.status}).` },
      { status: 502 }
    );
  }

  const json = (await resp.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  const text = json.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) {
    return NextResponse.json(
      { error: `Empty model content. stop_reason: ${json.stop_reason ?? "unknown"}` },
      { status: 502 }
    );
  }

  let parsed: AiTakeoffResponse;
  try {
    parsed = parseAiJson(text) as AiTakeoffResponse;
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse model JSON: ${String(e)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ai: parsed });
}

function splitBase64(input: string): { mediaType: string; data: string } {
  const m = input.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mediaType: m[1], data: m[2] };
  return { mediaType: "image/jpeg", data: input };
}
