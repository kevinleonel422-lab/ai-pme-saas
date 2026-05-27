import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// VERIFY WEBHOOK (META)
// =========================
export async function GET(req: Request) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// =========================
// RECEIVE MESSAGE
// =========================
export async function POST(req: Request) {
  const body = await req.json();

  try {
    const message =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const sender = message.from;
    const text = message.text?.body;

    if (!text) return NextResponse.json({ ok: true });

    // =========================
    // IA RESPONSE
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant WhatsApp pour un commerce. Réponds court, professionnel, humain.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const response = completion.choices[0].message.content;

    // =========================
    // SAVE DB
    // =========================
    await supabase.from("messages").insert([
      {
        user_id: null,
        platform: "whatsapp",
        sender,
        message: text,
        response,
      },
    ]);

    // =========================
    // SEND MESSAGE BACK
    // =========================
    await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: sender,
          text: { body: response },
        }),
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}