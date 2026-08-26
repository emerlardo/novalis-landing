import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOVA_ONE_PRICE_CENTS = 14900;

const buyBtn = document.getElementById("buyBtn");
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

async function reserve(userId) {
  buyBtn.disabled = true;
  buyBtn.textContent = "Reserving…";

  const { error } = await supabase.from("orders").insert({
    user_id: userId,
    product: "Nova One",
    amount_cents: NOVA_ONE_PRICE_CENTS,
    currency: "usd",
    status: "reserved",
  });

  if (error) {
    console.error("reserve error:", error);
    showToast("Something went wrong. Try again.");
    buyBtn.disabled = false;
    buyBtn.textContent = "Reserve Yours ($149)";
    return;
  }

  showToast("You're reserved. No payment required today.");
  buyBtn.textContent = "Reserved ✓";
}

async function hasExistingReservation(userId) {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("product", "Nova One")
    .limit(1);

  return Boolean(data && data.length);
}

async function updateButton() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    buyBtn.disabled = false;
    buyBtn.textContent = "Sign In to Reserve";
    buyBtn.onclick = () => {
      window.location.href = "/account/";
    };
    return;
  }

  const alreadyReserved = await hasExistingReservation(session.user.id);

  if (alreadyReserved) {
    buyBtn.disabled = true;
    buyBtn.textContent = "Reserved ✓";
    return;
  }

  buyBtn.disabled = false;
  buyBtn.textContent = "Reserve Yours ($149)";
  buyBtn.onclick = () => reserve(session.user.id);
}

updateButton();
supabase.auth.onAuthStateChange(() => updateButton());

const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => revealObserver.observe(el));
