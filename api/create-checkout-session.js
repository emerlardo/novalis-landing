import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: "https://96bf11ce119787db512827c41692f5cc@o4511979641176065.ingest.us.sentry.io/4511979708350464" });

const SUPABASE_URL = "https://gwlnepcglnsyetwkspxy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tgUOT9wPorTQvVRmFCJqLA_cw3KxK85";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOVA_ONE_PRICE_CENTS = 14900;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    console.error("create-checkout-session auth error:", userError);
    return res.status(401).json({ error: "Invalid session" });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userData.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Nova One" },
            unit_amount: NOVA_ONE_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: userData.user.id },
      success_url: `${origin}/shop/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel/`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    Sentry.captureException(err);
    res.status(500).json({ error: "Could not start checkout" });
  }
}
