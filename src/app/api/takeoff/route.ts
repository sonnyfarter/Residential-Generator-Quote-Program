import { NextRequest, NextResponse } from "next/server";
import { TAKEOFF_SYSTEM_PROMPT, parseAiJson } from "@/lib/ai/takeoffPrompt";
import type { AiTakeoffResponse, DeterministicTakeoff } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface TakeoffRequestBody {
  inputs: Record<string, unknown>;
  deterministic: DeterministicTakeoff;
  photos: string[]; // base64 (data URLs or raw base64), ordered
}

export async function POST(req: NextRequest) {
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
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data },
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
  } catch (e) {
    return NextResponse.json(
      { error: `Network error calling Anthropic: ${String(e)}` },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: `Anthropic ${resp.status}: ${text.slice(0, 500)}` },
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
