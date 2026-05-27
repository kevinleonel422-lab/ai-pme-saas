import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function POST(req: Request) {
  const { email } = await req.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",

    customer_email: email,

    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],

    success_url: "http://localhost:3000?success=1",
    cancel_url: "http://localhost:3000?canceled=1",
  });

  return NextResponse.json({ url: session.url });
}