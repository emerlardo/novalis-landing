import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signedOutPanel = document.getElementById("signedOutPanel");
const recoveryPanel = document.getElementById("recoveryPanel");
const signedInPanel = document.getElementById("signedInPanel");

const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const recoveryForm = document.getElementById("recoveryForm");

const accountEmail = document.getElementById("accountEmail");
const signOutBtn = document.getElementById("signOutBtn");
const ordersList = document.getElementById("ordersList");
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function showPanel(panel) {
  signedOutPanel.hidden = panel !== "out";
  recoveryPanel.hidden = panel !== "recovery";
  signedInPanel.hidden = panel !== "in";
}

tabSignIn.addEventListener("click", () => {
  tabSignIn.classList.add("is-active");
  tabSignUp.classList.remove("is-active");
  signInForm.classList.add("is-open");
  signUpForm.classList.remove("is-open");
  forgotPasswordBtn.hidden = false;
});

tabSignUp.addEventListener("click", () => {
  tabSignUp.classList.add("is-active");
  tabSignIn.classList.remove("is-active");
  signUpForm.classList.add("is-open");
  signInForm.classList.remove("is-open");
  forgotPasswordBtn.hidden = true;
});

function formatAmount(cents, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function renderOrders(userId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    ordersList.innerHTML = `<p class="account-copy">Couldn't load orders. Try refreshing.</p>`;
    return;
  }

  if (!data.length) {
    ordersList.innerHTML = `<p class="account-copy">No orders yet.</p>`;
    return;
  }

  ordersList.innerHTML = data
    .map(
      (order) => `
        <div class="order-card">
          <div>
            <p class="order-card__product">${order.product}</p>
            <p class="order-card__date">${formatDate(order.created_at)}</p>
          </div>
          <div class="order-card__meta">
            <span class="order-card__amount">${formatAmount(order.amount_cents, order.currency)}</span>
            <span class="order-card__status order-card__status--${order.status}">${order.status}</span>
          </div>
        </div>
      `
    )
    .join("");
}

async function showSignedIn(session) {
  showPanel("in");
  accountEmail.textContent = session.user.email;
  ordersList.innerHTML = `
    <div class="skeleton skeleton--order"></div>
    <div class="skeleton skeleton--order"></div>
  `;
  await renderOrders(session.user.id);
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("signInEmail").value.trim();
  const password = document.getElementById("signInPassword").value;
  const btn = signInForm.querySelector("button");
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  btn.disabled = false;

  if (error) {
    showToast(error.message === "Invalid login credentials" ? "Incorrect email or password." : "Something went wrong. Try again.");
  }
});

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("signUpEmail").value.trim();
  const password = document.getElementById("signUpPassword").value;
  const passwordConfirm = document.getElementById("signUpPasswordConfirm").value;

  if (password !== passwordConfirm) {
    showToast("Passwords don't match.");
    return;
  }

  const btn = signUpForm.querySelector("button");
  btn.disabled = true;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + "/account/" },
  });

  btn.disabled = false;

  if (error) {
    showToast(
      error.message.toLowerCase().includes("already registered")
        ? "That email is already registered. Try signing in instead."
        : "Something went wrong. Try again."
    );
    return;
  }

  if (data.session) {
    return;
  }

  signUpForm.reset();
  showToast("Check your email to confirm your account.");
});

forgotPasswordBtn.addEventListener("click", async () => {
  const email = document.getElementById("signInEmail").value.trim();
  if (!email) {
    showToast("Enter your email above first.");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/account/",
  });

  showToast(error ? "Something went wrong. Try again." : "Check your email for a reset link.");
});

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const newPassword = document.getElementById("newPassword").value;
  const btn = recoveryForm.querySelector("button");
  btn.disabled = true;

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  btn.disabled = false;

  if (error) {
    showToast("Something went wrong. Try again.");
    return;
  }

  showToast("Password updated.");
});

signOutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showPanel("out");
});

const {
  data: { session: initialSession },
} = await supabase.auth.getSession();

if (initialSession) {
  await showSignedIn(initialSession);
} else {
  showPanel("out");
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showPanel("recovery");
    return;
  }
  if (session) {
    showSignedIn(session);
  } else {
    showPanel("out");
  }
});
