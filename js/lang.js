/* ============================================================
   lang.js — نظام الترجمة الكاملة (عربي / إنجليزي)
   ============================================================ */

const langBtn = document.getElementById("langBtn");

/* ---------------- تطبيق اللغة ---------------- */
function applyLanguage(lang) {
  const isEn = lang === "en";

  // 1) اتجاه الصفحة
  document.documentElement.lang = lang;
  document.documentElement.dir = isEn ? "ltr" : "rtl";

  // 2) النصوص
  document.querySelectorAll("[data-ar]").forEach(el => {
    const ar = el.dataset.ar;
    const en = el.dataset.en;
    if (!ar && !en) return;

    // استثناء العناصر التي تحتوي على عناصر فرعية (مثل disclaimer)
    if (el.children.length === 0) {
      el.textContent = isEn ? (en || ar) : ar;
    } else {
      // إذا كان العنصر يحتوي على عناصر داخلية (مثل <strong>)
      // نستبدل فقط العقد النصية المباشرة
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

  // 5) خيارات القائمة المنسدلة (select)
  document.querySelectorAll("select option[data-ar]").forEach(opt => {
    const ar = opt.dataset.ar;
    const en = opt.dataset.en;
    opt.textContent = isEn ? (en || ar) : ar;
  });

  // 6) زر تبديل اللغة
  if (langBtn) langBtn.textContent = isEn ? "ع" : "EN";

  // 7) حفظ الاختيار
  localStorage.setItem("pharmacy_lang", lang);

  // 8) إبلاغ booking.js بتغيير اللغة (لتحديث أسماء المنتجات في السلة)
  window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
}

/* ---------------- استبدال النص المباشر فقط ---------------- */
function replaceDirectText(parent, newText) {
  // نحذف العقد النصية القديمة ونضيف النص الجديد في البداية
  // مع الحفاظ على العناصر الفرعية مثل <strong>
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      node.textContent = "";
    }
  }
  // نضيف النص الجديد قبل أول عنصر فرعي
  const firstChild = parent.firstChild;
  const textNode = document.createTextNode(newText + " ");
  parent.insertBefore(textNode, firstChild);
}

/* ---------------- الزر ---------------- */
if (langBtn) {
  langBtn.addEventListener("click", () => {
    const current = localStorage.getItem("pharmacy_lang") || "ar";
    applyLanguage(current === "ar" ? "en" : "ar");
  });
}

/* ---------------- التطبيق عند التحميل ---------------- */
const savedLang = localStorage.getItem("pharmacy_lang") || "ar";
applyLanguage(savedLang);
