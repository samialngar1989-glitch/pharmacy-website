/* ============================================================
   booking.js — منطق سلة الطلب وإرسال الطلب عبر واتساب
   صيدلية المجيدي
   ============================================================ */

/* ⚙️ رقم واتساب صيدلية المجيدي (دولي بدون + أو مسافات) */
const WHATSAPP_NUMBER = "967773704939";

/* ---------------- عناصر الصفحة ---------------- */
const orderListEl   = document.getElementById("orderList");
const orderTotalEl  = document.getElementById("orderTotal");
const orderForm     = document.getElementById("orderForm");
const deliverySel   = document.getElementById("deliveryMethod");
const addressLabel  = document.getElementById("addressLabel");
const addressInput  = document.getElementById("customerAddress");

/* ---------------- دعم تغيير اللغة لأسماء المنتجات ---------------- */
let currentLang = localStorage.getItem("pharmacy_lang") || "ar";

window.addEventListener("languageChanged", (e) => {
  currentLang = e.detail.lang;
  renderCart();
});

function getProductName(btn) {
  return currentLang === "en"
    ? (btn.dataset.nameEn || btn.dataset.name)
    : btn.dataset.name;
}

/* ---------------- سلة الطلب ---------------- */
let cart = []; // [{name, nameEn, price, qty}]

/* ---------------- إضافة منتج ---------------- */
document.querySelectorAll(".add-to-order").forEach(btn => {
  btn.addEventListener("click", () => {
    const name   = btn.dataset.name;
    const nameEn = btn.dataset.nameEn || name;
    const price  = parseFloat(btn.dataset.price) || 0;

    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, nameEn, price, qty: 1 });
    }

    renderCart();
    showToast(`تمت إضافة: ${currentLang === "en" ? nameEn : name}`);

    // تأثير بسيط على الزر
    const original = btn.textContent;
    btn.textContent = currentLang === "en" ? "✓ Added" : "✓ أُضيف";
    setTimeout(() => (btn.textContent = original), 1200);
  });
});

/* ---------------- عرض السلة ---------------- */
function renderCart() {
  if (!orderListEl) return;
  orderListEl.innerHTML = "";

  if (cart.length === 0) {
    const msg = currentLang === "en" ? "No products added yet" : "لم تُضف أي منتج بعد";
    orderListEl.innerHTML = `<li class="empty-msg">${msg}</li>`;
    if (orderTotalEl) orderTotalEl.textContent = "0";
    return;
  }

  cart.forEach((item, index) => {
    const displayName = currentLang === "en" ? item.nameEn : item.name;
    const li = document.createElement("li");
    li.className = "order-item";
    li.innerHTML = `
      <span class="item-name">${displayName}</span>
      <span class="item-qty">
        <button type="button" class="qty-btn" data-action="dec" data-index="${index}">−</button>
        <span>${item.qty}</span>
        <button type="button" class="qty-btn" data-action="inc" data-index="${index}">+</button>
      </span>
      <span class="item-price">${item.price * item.qty} ${currentLang === "en" ? "YER" : "ر.ي"}</span>
      <button type="button" class="remove-btn" data-action="remove" data-index="${index}">✕</button>
    `;
    orderListEl.appendChild(li);
  });

  if (orderTotalEl) orderTotalEl.textContent = calculateTotal();
}

/* ---------------- إجمالي السلة ---------------- */
function calculateTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/* ---------------- أزرار السلة (زيادة/تقليل/حذف) ---------------- */
if (orderListEl) {
  orderListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const index  = parseInt(btn.dataset.index, 10);
    const action = btn.dataset.action;

    if (action === "inc") cart[index].qty += 1;
    if (action === "dec") {
      cart[index].qty -= 1;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    if (action === "remove") cart.splice(index, 1);

    renderCart();
  });
}

/* ---------------- إظهار حقل العنوان عند التوصيل ---------------- */
if (deliverySel && addressLabel && addressInput) {
  deliverySel.addEventListener("change", () => {
    const isDelivery =
      deliverySel.value === "توصيل للمنزل" ||
      deliverySel.value === "Home Delivery" ||
      deliverySel.selectedOptions[0]?.dataset?.en === "Home Delivery";
    addressLabel.style.display = isDelivery ? "block" : "none";
    addressInput.required = isDelivery;
  });
}

/* ---------------- إرسال الطلب عبر واتساب ---------------- */
if (orderForm) {
  orderForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // تحقق من وجود منتجات
    if (cart.length === 0) {
      showToast(
        currentLang === "en"
          ? "⚠️ Add at least one product before confirming"
          : "⚠️ أضف منتجًا واحدًا على الأقل قبل تأكيد الطلب",
        true
      );
      return;
    }

    const name    = document.getElementById("customerName").value.trim();
    const phone   = document.getElementById("customerPhone").value.trim();
    const methodEl = deliverySel.selectedOptions[0];
    const method  = methodEl.value;
    const methodEn = methodEl.dataset.en || method;
    const isDelivery = methodEn === "Home Delivery";
    const address = addressInput ? addressInput.value.trim() : "";
    const coupon  = document.getElementById("couponCode").value.trim();
    const notes   = document.getElementById("orderNotes").value.trim();
    const file    = document.getElementById("prescriptionFile").files[0];

    // تحقق
    if (!name || !phone) {
      showToast(
        currentLang === "en" ? "⚠️ Please enter name and phone" : "⚠️ يرجى إدخال الاسم ورقم الجوال",
        true
      );
      return;
    }
    if (isDelivery && !address) {
      showToast(
        currentLang === "en" ? "⚠️ Please enter the delivery address" : "⚠️ يرجى إدخال العنوان للتوصيل",
        true
      );
      return;
    }

    // بناء رسالة واتساب
    let msg = "🛒 *طلب جديد من صيدلية المجيدي*\n";
    msg += "──────────────────\n";
    msg += `👤 *الاسم:* ${name}\n`;
    msg += `📱 *الجوال:* ${phone}\n`;
    msg += `📦 *طريقة الاستلام:* ${method}\n`;
    if (isDelivery) {
      msg += `📍 *العنوان:* ${address}\n`;
    }
    msg += "──────────────────\n";
    msg += "🧾 *المنتجات:*\n";

    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي\n`;
    });

    msg += "──────────────────\n";
    msg += `💰 *الإجمالي:* ${calculateTotal()} ر.ي\n`;

    if (coupon) msg += `🎟️ *كود الخصم:* ${coupon}\n`;

    if (file) {
      msg += `📎 *وصفة طبية مرفقة:* ${file.name}\n`;
      msg += `_(سيتم إرفاق الصورة يدويًا بعد فتح المحادثة)_\n`;
    }

    if (notes) msg += `📝 *ملاحظات:* ${notes}\n`;

    msg += "──────────────────\n";
    msg += "✅ أرجو تأكيد الطلب وشكراً 🙏";

    // حفظ الطلب في localStorage (لسجل لوحة التحكم)
    saveOrderToLog({
      name, phone, method, address, coupon, notes,
      items: [...cart],
      total: calculateTotal(),
      prescription: file ? file.name : null,
      date: new Date().toISOString(),
      status: "قيد الانتظار"
    });

    // فتح واتساب
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

    showToast(
      currentLang === "en"
        ? "✅ WhatsApp opened to send the order"
        : "✅ تم فتح واتساب لإرسال الطلب"
    );

    // تفريغ النموذج
    setTimeout(() => {
      orderForm.reset();
      if (addressLabel) addressLabel.style.display = "none";
      cart = [];
      renderCart();
    }, 1500);
  });
}

/* ---------------- حفظ الطلب في سجل (لوحة التحكم) ---------------- */
function saveOrderToLog(order) {
  const log = JSON.parse(localStorage.getItem("pharmacy_orders") || "[]");
  log.unshift(order);
  localStorage.setItem("pharmacy_orders", JSON.stringify(log));
}

/* ---------------- إشعار Toast بسيط ---------------- */
function showToast(text, isError = false) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (toast.className = "toast"), 3000);
}

/* ---------------- تهيئة ---------------- */
renderCart();
