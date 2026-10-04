const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function closeNav() {
  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.tagName === "A") closeNav();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });
}
