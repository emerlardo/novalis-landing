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

const preorderBtn = document.getElementById("preorderBtn");
const waitlistForm = document.getElementById("waitlistForm");
const waitlistEmail = document.getElementById("waitlistEmail");
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

preorderBtn.addEventListener("click", () => {
  waitlistForm.classList.toggle("is-open");
  if (waitlistForm.classList.contains("is-open")) waitlistEmail.focus();
});

document.getElementById("stickyCtaBtn").addEventListener("click", () => {
  preorderBtn.scrollIntoView({ behavior: "smooth", block: "center" });
  preorderBtn.click();
});

let supabaseClientPromise = null;

function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = Promise.all([
      import("https://esm.sh/@supabase/supabase-js@2"),
      import("./supabase-config.js"),
    ]).then(([{ createClient }, { SUPABASE_URL, SUPABASE_ANON_KEY }]) => {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    });
  }
  return supabaseClientPromise;
}

waitlistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = waitlistEmail.value.trim();
  if (!email) return;

  const submitBtn = waitlistForm.querySelector("button");
  submitBtn.disabled = true;

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({ email });

    if (error) {
      showToast(error.code === "23505" ? "You're already on the list." : "Something went wrong. Try again.");
      return;
    }

    waitlistEmail.value = "";
    waitlistForm.classList.remove("is-open");
    showToast("You're on the list. We'll let you know when Nova One ships.");
  } catch {
    showToast("Waitlist isn't connected yet.");
  } finally {
    submitBtn.disabled = false;
  }
});
