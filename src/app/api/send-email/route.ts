import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RESEND_URL = "https://api.resend.com/emails";

interface SendBody {
  to: string;
  subject: string;
  body: string; // plain-text body
  pdfBase64?: string; // base64 (no data: prefix)
  filename?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  // Resend allows onboarding@resend.dev for testing to your own verified email;
  // set EMAIL_FROM to a verified domain address for production sending.
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set RESEND_API_KEY (and EMAIL_FROM) in the server environment.",
      },
      { status: 501 }
    );
  }

  let b: SendBody;
  try {
    b = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!b.to || !b.subject) {
    return NextResponse.json({ error: "Missing 'to' or 'subject'." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    from,
    to: [b.to],
    subject: b.subject,
    text: b.body || "",
  };
  if (b.pdfBase64) {
    payload.attachments = [
      { filename: b.filename || "report.pdf", content: b.pdfBase64 },
    ];
  }

  let resp: Response;
  try {
    resp = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Network error sending email: ${String(e)}` },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: `Email provider ${resp.status}: ${text.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const data = (await resp.json()) as { id?: string };
  return NextResponse.json({ ok: true, id: data.id ?? null });
}
