/* ============================================================
   main.js — الوظائف العامة (الوضع الليلي + القائمة + البحث + الفلترة)
   صيدلية المجيدي
   ============================================================ */

/* ---------------- 1) الوضع الليلي ---------------- */
const darkBtn = document.getElementById("darkBtn");

function applyDarkMode(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
  if (darkBtn) darkBtn.textContent = isDark ? "☀️" : "🌙";
}

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
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

/* ---------------- 3) زر العودة لأعلى الصفحة ---------------- */
const toTopBtn = document.getElementById("toTop");
window.addEventListener("scroll", () => {
  if (!toTopBtn) return;
  toTopBtn.classList.toggle("show", window.scrollY > 400);
});

if (toTopBtn) {
  toTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------------- 4) فلترة المنتجات حسب القسم ---------------- */
const categoryButtons = document.querySelectorAll(".category-card");
const productCards    = document.querySelectorAll(".product-card");
const searchBar       = document.getElementById("searchBar");
const noResults       = document.getElementById("noResults");

// دالة الفلترة الموحدة (تعمل للأقسام والبحث)
function filterProducts() {
  const activeCategory = document.querySelector(".category-card.active")?.dataset.filter || "all";
  const searchTerm = searchBar ? searchBar.value.trim().toLowerCase() : "";
  let visibleCount = 0;

  productCards.forEach(card => {
    const category = card.dataset.category;
    const searchData = (card.dataset.search || "").toLowerCase();
    const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
    
    // شرط القسم
    const matchCategory = activeCategory === "all" || category === activeCategory;
    
    // شرط البحث
    const matchSearch = searchTerm === "" || 
                        searchData.includes(searchTerm) || 
                        title.includes(searchTerm);

    if (matchCategory && matchSearch) {
      card.style.display = "flex";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  // إظهار رسالة "لا توجد نتائج" إذا لم يتبق أي منتج
  if (noResults) {
    noResults.style.display = visibleCount === 0 ? "block" : "none";
  }
}

// ربط الفلترة بأزرار الأقسام
categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    categoryButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterProducts(); // تشغيل الفلترة
  });
});

// ربط الفلترة بشريط البحث
if (searchBar) {
  searchBar.addEventListener("input", filterProducts);
}

// تفعيل زر "الكل" افتراضيًا عند التحميل
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
  header.style.boxShadow = window.scrollY > 20 ? "0 2px 12px rgba(0,0,0,0.12)" : "";
});
/* مزامنة عدادات المخزون في الموقع الرئيسي */
document.addEventListener("DOMContentLoaded", () => {
  const inv = JSON.parse(localStorage.getItem("pharmacy_inventory") || "[]");
  document.querySelectorAll(".stock-badge").forEach(badge => {
    const item = inv.find(i => i.name === badge.dataset.name);
    if (item) {
      const rem = item.qty - item.sold;
      if (badge.classList.contains("total")) badge.textContent = `الكلية: ${item.qty}`;
      if (badge.classList.contains("sold")) badge.textContent = `المباع: ${item.sold}`;
      if (badge.classList.contains("remain")) {
        badge.textContent = `المتبقي: ${rem}`;
        if (rem <= 1) badge.classList.add("low");
      }
    }
  });
});
