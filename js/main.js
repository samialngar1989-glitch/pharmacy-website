/* ============================================================
   main.js — الوظائف العامة
   (الوضع الليلي + القائمة + زر أعلى الصفحة + فلترة الأقسام + السنة)
   ============================================================ */

/* ---------------- 1) الوضع الليلي ---------------- */
const darkBtn = document.getElementById("darkBtn");

function applyDarkMode(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
  if (darkBtn) darkBtn.textContent = isDark ? "☀️" : "🌙";
}

// استرجاع الحالة المحفوظة
applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");

if (darkBtn) {
  darkBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyDarkMode(isDark);
  });
}

/* ---------------- 2) القائمة على الجوال ---------------- */
const menuBtn = document.getElementById("menuBtn");
const nav     = document.getElementById("nav");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  // إغلاق القائمة عند الضغط على أي رابط
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

/* ---------------- 3) زر العودة لأعلى الصفحة ---------------- */
const toTopBtn = document.getElementById("toTop");

window.addEventListener("scroll", () => {
  if (!toTopBtn) return;
  if (window.scrollY > 400) {
    toTopBtn.classList.add("show");
  } else {
    toTopBtn.classList.remove("show");
  }
});

if (toTopBtn) {
  toTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------------- 4) فلترة المنتجات حسب القسم ---------------- */
const categoryButtons = document.querySelectorAll(".category-card");
const productCards     = document.querySelectorAll(".product-card");

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // تفعيل الزر المختار
    categoryButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter;

    productCards.forEach(card => {
      const match = filter === "all" || card.dataset.category === filter;
      card.style.display = match ? "flex" : "none";
    });
  });
});

/* تفعيل زر "الكل" افتراضيًا */
if (categoryButtons.length > 0) {
  categoryButtons[0].classList.add("active");
}

/* ---------------- 5) سنة الفوتر ---------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------- 6) تأثير Header عند التمرير ---------------- */
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  if (!header) return;
  if (window.scrollY > 20) {
    header.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
  } else {
    header.style.boxShadow = "";
  }
});
