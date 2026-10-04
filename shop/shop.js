import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const buyBtn = document.getElementById("buyBtn");
const stickyCtaBtn = document.getElementById("stickyCtaBtn");
const reserveForm = document.getElementById("reserveForm");
const reserveEmail = document.getElementById("reserveEmail");
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function openReserveForm() {
  reserveForm.classList.add("is-open");
  reserveEmail.focus();
}

buyBtn.addEventListener("click", openReserveForm);

stickyCtaBtn.addEventListener("click", () => {
  buyBtn.scrollIntoView({ behavior: "smooth", block: "center" });
  openReserveForm();
});

reserveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = reserveEmail.value.trim();
  if (!email) return;

  const submitBtn = reserveForm.querySelector("button");
  submitBtn.disabled = true;

  try {
    const { error } = await supabase.from("waitlist").insert({ email });

    if (error) {
      showToast(
        error.code === "23505"
          ? "You're already reserved. We'll be in touch."
          : "Something went wrong. Try again."
      );
      return;
    }

    reserveEmail.value = "";
    reserveForm.classList.remove("is-open");
    window.location.href = "/shop/success/";
  } catch (err) {
    console.error("reserve error:", err);
    showToast("Something went wrong. Try again.");
  } finally {
    submitBtn.disabled = false;
  }
});

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

// Anything already on screen at load shows straight away, so the page is never
// blank if the observer is slow or unavailable.
revealEls.forEach((el) => {
  if (el.getBoundingClientRect().top < window.innerHeight) {
    el.classList.add("is-visible");
  }
});
