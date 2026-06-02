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

// ========================================
// VERIFY WEBHOOK META
// ========================================
export async function GET(req: Request) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, {
      status: 200,
    });
  }

  return new Response("Forbidden", {
    status: 403,
  });
}

// ========================================
// RECEIVE WHATSAPP MESSAGE
// ========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({
        ok: true,
      });
    }

    const sender = message.from;
    const text = message.text?.body;

    if (!text) {
      return NextResponse.json({
        ok: true,
      });
    }

    // ========================================
    // GET BUSINESS
    // ========================================
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("whatsapp_number", sender)
      .single();

    // ========================================
    // BUSINESS PROMPT
    // ========================================
    const businessPrompt =
      business?.ai_prompt ||
      `
Tu es un assistant WhatsApp professionnel.

Tu réponds :
- de manière humaine
- courte
- professionnelle
- efficace
- chaleureuse

Tu aides les clients d'un commerce.
`;

    // ========================================
    // OPENAI RESPONSE
    // ========================================
    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content: businessPrompt,
          },
          {
            role: "user",
            content: text,
          },
        ],

        max_tokens: 200,
        temperature: 0.5,
      });

    const response =
      completion.choices[0].message.content ||
      "Bonjour 👋";

    // ========================================
    // SAVE MESSAGE
    // ========================================
    await supabase.from("messages").insert([
      {
        business_id: business?.id || null,
        user_id: business?.user_id || null,

        platform: "whatsapp",

        sender,

        message: text,

        response,
      },
    ]);

    // ========================================
    // SEND WHATSAPP RESPONSE
    // ========================================
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

          text: {
            body: response,
          },
        }),
      }
    );

    return NextResponse.json({
      ok: true,
    });

  } catch (error) {
    console.error("WHATSAPP WEBHOOK ERROR:", error);

    return NextResponse.json(
      {
        error: "Webhook error",
      },
      {
        status: 500,
      }
    );
  }
}