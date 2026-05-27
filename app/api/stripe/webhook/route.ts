import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  // =========================
  // STRIPE PAYMENT SUCCESS
  // =========================
  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;

    const email = session.customer_email;
    const customerId = session.customer;

    if (email) {
      // upgrade user to PRO
      await supabase.from("profiles").upsert({
        email,
        plan: "pro",
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });

      // 💰 TRACK REVENUE (PHASE 14)
      await supabase.from("analytics").insert([
        {
          user_id: null,
          type: "revenue",
          value: 29,
        },
      ]);
    }
  }

  return NextResponse.json({ received: true });
}