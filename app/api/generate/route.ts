import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// =========================
// OPENAI
// =========================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// =========================
// SUPABASE (SERVICE ROLE)
// =========================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// HASH FUNCTION (CACHE)
// =========================
function getHash(text: string) {
  return crypto.createHash("md5").update(text).digest("hex");
}

export async function POST(req: Request) {
  try {
    const {
      message,
      businessName,
      businessType,
      userId,
      email,
    } = await req.json();

    // =========================
    // SECURITY CHECK
    // =========================
    if (!userId || !email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // =========================
    // GET USER PROFILE (PLAN)
    // =========================
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    const plan = profile?.plan || "free";

    // =========================
    // DAILY LIMIT (FREE USERS)
    // =========================
    const today = new Date().toISOString().split("T")[0];

    const { data: usage } = await supabase
      .from("usage_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    const count = usage?.count || 0;

    if (plan === "free" && count >= 10) {
      return NextResponse.json(
        { error: "Limite quotidienne atteinte (FREE)" },
        { status: 403 }
      );
    }

    // =========================
    // CACHE SYSTEM (ANTI COST)
    // =========================
    const inputHash = getHash(
      message + businessName + businessType
    );

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("*")
      .eq("input_hash", inputHash)
      .single();

    if (cached) {
      return NextResponse.json({
        result: cached.response,
        cached: true,
      });
    }

    // =========================
    // UPDATE USAGE
    // =========================
    if (usage) {
      await supabase
        .from("usage_limits")
        .update({ count: count + 1 })
        .eq("id", usage.id);
    } else {
      await supabase.from("usage_limits").insert([
        {
          user_id: userId,
          date: today,
          count: 1,
        },
      ]);
    }

    // =========================
    // OPENAI CALL (OPTIMISÉ)
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",

      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant IA pour PME. Tu rédiges des réponses courtes, professionnelles et prêtes à envoyer aux clients. Pas de blabla inutile.",
        },
        {
          role: "user",
          content: `
Commerce: ${businessName}
Type: ${businessType}
Message client: ${message}
          `,
        },
      ],

      max_tokens: 300,
      temperature: 0.4,
    });

    const result = completion.choices[0].message.content;

    // =========================
    // SAVE CACHE
    // =========================
    await supabase.from("ai_cache").insert([
      {
        input_hash: inputHash,
        response: result,
      },
    ]);
    
    await supabase.from("analytics").insert([
      {
        user_id: userId,
        type: "ai_usage",
        value: 0.001, // estimation coût GPT-4o-mini
      },
    ]);
    // =========================
    // RETURN
    // =========================
    return NextResponse.json({
      result,
      cached: false,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}