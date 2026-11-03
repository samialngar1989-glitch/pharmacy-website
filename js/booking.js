/* ============================================================
   booking.js — منطق سلة الطلب وإرسال الطلب عبر واتساب
   ============================================================ */

/* ⚙️ عدّلي هذا الرقم فقط */
const WHATSAPP_NUMBER = "966773704939"; // بدون + أو مسافات

/* ---------------- عناصر الصفحة ---------------- */
const orderListEl   = document.getElementById("orderList");
const orderTotalEl  = document.getElementById("orderTotal");
const orderForm     = document.getElementById("orderForm");
const deliverySel   = document.getElementById("deliveryMethod");
const addressLabel  = document.getElementById("addressLabel");
const addressInput  = document.getElementById("customerAddress");

/* ---------------- سلة الطلب ---------------- */
let cart = []; // [{name, price, qty}]

/* ---------------- إضافة منتج ---------------- */
document.querySelectorAll(".add-to-order").forEach(btn => {
  btn.addEventListener("click", () => {
    const name  = btn.dataset.name;
    const price = parseFloat(btn.dataset.price) || 0;

    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }

    renderCart();
    showToast(`تمت إضافة: ${name}`);

    // تأثير بسيط على الزر
    btn.textContent = "✓ أُضيف";
    setTimeout(() => (btn.textContent = "أضف للطلب"), 1200);
  });
});

/* ---------------- عرض السلة ---------------- */
function renderCart() {
  orderListEl.innerHTML = "";

  if (cart.length === 0) {
    orderListEl.innerHTML = `<li class="empty-msg">لم تُضف أي منتج بعد</li>`;
    orderTotalEl.textContent = "0";
    return;
  }

  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "order-item";
    li.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-qty">
        <button type="button" class="qty-btn" data-action="dec" data-index="${index}">−</button>
        <span>${item.qty}</span>
        <button type="button" class="qty-btn" data-action="inc" data-index="${index}">+</button>
      </span>
      <span class="item-price">${item.price * item.qty} ر.س</span>
      <button type="button" class="remove-btn" data-action="remove" data-index="${index}">✕</button>
    `;
    orderListEl.appendChild(li);
  });

  orderTotalEl.textContent = calculateTotal();
}

/* ---------------- إجمالي السلة ---------------- */
function calculateTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/* ---------------- أزرار السلة (زيادة/تقليل/حذف) ---------------- */
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

/* ---------------- إظهار حقل العنوان عند التوصيل ---------------- */
deliverySel.addEventListener("change", () => {
  const isDelivery = deliverySel.value === "توصيل للمنزل";
  addressLabel.style.display = isDelivery ? "block" : "none";
  addressInput.required = isDelivery;
});

/* ---------------- إرسال الطلب عبر واتساب ---------------- */
orderForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // تحقق من وجود منتجات
  if (cart.length === 0) {
    showToast("⚠️ أضف منتجًا واحدًا على الأقل قبل تأكيد الطلب", true);
    return;
  }

  const name    = document.getElementById("customerName").value.trim();
  const phone   = document.getElementById("customerPhone").value.trim();
  const method  = deliverySel.value;
  const address = addressInput.value.trim();
  const coupon  = document.getElementById("couponCode").value.trim();
  const notes   = document.getElementById("orderNotes").value.trim();
  const file    = document.getElementById("prescriptionFile").files[0];

  // تحقق سريع
  if (!name || !phone) {
    showToast("⚠️ يرجى إدخال الاسم ورقم الجوال", true);
    return;
  }
  if (method === "توصيل للمنزل" && !address) {
    showToast("⚠️ يرجى إدخال العنوان للتوصيل", true);
    return;
  }

  // بناء رسالة واتساب
  let msg = "🛒 *طلب جديد من صيدلية [صبر]*\n";
  msg += "──────────────────\n";
  msg += `👤 *الاسم:* ${name}\n`;
  msg += `📱 *الجوال:* ${phone}\n`;
  msg += `📦 *طريقة الاستلام:* ${method}\n`;
  if (method === "توصيل للمنزل") {
    msg += `📍 *العنوان:* ${address}\n`;
  }
  msg += "──────────────────\n";
  msg += "🧾 *المنتجات:*\n";

  cart.forEach((item, i) => {
    msg += `${i + 1}. ${item.name} × ${item.qty} = ${item.price * item.qty} ر.س\n`;
  });

  msg += "──────────────────\n";
  msg += `💰 *الإجمالي:* ${calculateTotal()} ر.س\n`;

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

  showToast("✅ تم فتح واتساب لإرسال الطلب");

  // تفريغ النموذج
  setTimeout(() => {
    orderForm.reset();
    addressLabel.style.display = "none";
    cart = [];
    renderCart();
  }, 1500);
});

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
