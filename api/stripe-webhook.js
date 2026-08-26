import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: "https://96bf11ce119787db512827c41692f5cc@o4511979641176065.ingest.us.sentry.io/4511979708350464" });

export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = "https://gwlnepcglnsyetwkspxy.supabase.co";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const buf = await buffer(req);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("stripe-webhook signature error:", err.message);
    Sentry.captureException(err);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  console.log("stripe-webhook received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;

    if (!userId) {
      console.error("stripe-webhook: no user_id in session metadata", session.id);
      Sentry.captureException(new Error(`stripe-webhook: no user_id in session metadata (${session.id})`));
    } else {
      const { error } = await supabaseAdmin.from("orders").insert({
        user_id: userId,
        product: "Nova One",
        amount_cents: session.amount_total,
        currency: session.currency,
        status: "paid",
        stripe_session_id: session.id,
      });

      if (error && error.code !== "23505") {
        console.error("stripe-webhook insert error:", error);
        Sentry.captureException(new Error(`stripe-webhook insert error: ${error.message}`));
        return res.status(500).json({ error: "Failed to record order" });
      }

      if (!error) {
        console.log("stripe-webhook: order recorded for user", userId);
      }
    }
  }

  res.status(200).json({ received: true });
}
