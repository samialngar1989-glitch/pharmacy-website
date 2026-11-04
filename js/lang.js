/* ============================================================
   lang.js — نظام الترجمة الكاملة (عربي / إنجليزي)
   صيدلية المجيدي
   ============================================================ */

const langBtn = document.getElementById("langBtn");

/* ---------------- تطبيق اللغة ---------------- */
function applyLanguage(lang) {
  const isEn = lang === "en";

  // 1) اتجاه الصفحة
  document.documentElement.lang = lang;
  document.documentElement.dir = isEn ? "ltr" : "rtl";

  // 2) النصوص العادية
  document.querySelectorAll("[data-ar]").forEach(el => {
    const ar = el.dataset.ar;
    const en = el.dataset.en;
    if (!ar && !en) return;

    if (el.children.length === 0) {
      el.textContent = isEn ? (en || ar) : ar;
    } else {
      replaceDirectText(el, isEn ? (en || ar) : ar);
    }
  });

  // 3) placeholders
  document.querySelectorAll("[data-placeholder-ar]").forEach(el => {
    const ar = el.dataset.placeholderAr;
    const en = el.dataset.placeholderEn;
    el.placeholder = isEn ? (en || ar) : ar;
  });

  // 4) عنوان الصفحة
  const title = document.querySelector("title");
  if (title && title.dataset.ar) {
    document.title = isEn ? (title.dataset.en || title.dataset.ar) : title.dataset.ar;
  }

  // 5) خيارات القائمة المنسدلة
  document.querySelectorAll("select option[data-ar]").forEach(opt => {
    const ar = opt.dataset.ar;
    const en = opt.dataset.en;
    opt.textContent = isEn ? (en || ar) : ar;
  });

  // 6) زر تبديل اللغة
  if (langBtn) langBtn.textContent = isEn ? "ع" : "EN";

  // 7) حفظ الاختيار
  localStorage.setItem("pharmacy_lang", lang);

  // 8) إبلاغ booking.js
  window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
}

/* ---------------- استبدال النص المباشر فقط ---------------- */
function replaceDirectText(parent, newText) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      node.textContent = "";
    }
  }
  const firstChild = parent.firstChild;
  const textNode = document.createTextNode(newText + " ");
  parent.insertBefore(textNode, firstChild);
}

/* ---------------- زر تبديل اللغة ---------------- */
if (langBtn) {
  langBtn.addEventListener("click", () => {
    const current = localStorage.getItem("pharmacy_lang") || "ar";
    applyLanguage(current === "ar" ? "en" : "ar");
  });
}

/* ---------------- التطبيق عند التحميل ---------------- */
const savedLang = localStorage.getItem("pharmacy_lang") || "ar";
applyLanguage(savedLang);
