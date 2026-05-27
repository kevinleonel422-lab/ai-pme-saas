import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const body = await req.json();

  const { userId, platform, sender, message } = body;

  if (!message) {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  // =========================
  // IA RESPONSE
  // =========================
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant automatique pour un commerce. Réponds comme un humain professionnel, court et efficace.",
      },
      {
        role: "user",
        content: message,
      },
    ],
    max_tokens: 200,
    temperature: 0.4,
  });

  const response = completion.choices[0].message.content;

  // =========================
  // SAVE CONVERSATION
  // =========================
  await supabase.from("messages").insert([
    {
      user_id: userId,
      platform,
      sender,
      message,
      response,
    },
  ]);

  // =========================
  // RETURN RESPONSE (SIMULATION)
  // =========================
  return NextResponse.json({
    response,
  });
}