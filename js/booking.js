/* ============================================================
   booking.js — سلة الطلب وإرسال البيانات لجوجل شيت
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxtyvD8zQv2IsnaX0tYL8f0npfUJv8A7SVBTHeklRoE9yeq-M9r3DSvVnO5XDDXheVw-g/exec";
const WHATSAPP_NUMBER = "967773704939";

const orderListEl = document.getElementById("orderList");
const orderTotalEl = document.getElementById("orderTotal");
const orderForm = document.getElementById("orderForm");
const deliverySel = document.getElementById("deliveryMethod");
const addressLabel = document.getElementById("addressLabel");
const addressInput = document.getElementById("customerAddress");

let cart = [];

function renderCart() {
  if (!orderListEl) return;
  orderListEl.innerHTML = "";

  if (cart.length === 0) {
    orderListEl.innerHTML = `<li class="empty-msg">لم تُضف أي منتج بعد</li>`;
    if (orderTotalEl) orderTotalEl.textContent = "0";
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
      <span class="item-price">${item.price * item.qty} ر.ي</span>
      <button type="button" class="remove-btn" data-action="remove" data-index="${index}">✕</button>
    `;
    orderListEl.appendChild(li);
  });

  if (orderTotalEl) orderTotalEl.textContent = calculateTotal();
}

function calculateTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

if (orderListEl) {
  orderListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
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

if (deliverySel && addressLabel && addressInput) {
  deliverySel.addEventListener("change", () => {
    const isDelivery = deliverySel.value === "توصيل للمنزل";
    addressLabel.style.display = isDelivery ? "block" : "none";
    addressInput.required = isDelivery;
  });
}

/* إرسال الطلب */
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast("⚠️ أضف منتجًا واحدًا على الأقل قبل تأكيد الطلب", true);
      return;
    }

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const method = deliverySel.value;
    const address = addressInput ? addressInput.value.trim() : "";
    const coupon = document.getElementById("couponCode").value.trim();
    const notes = document.getElementById("orderNotes").value.trim();
    const file = document.getElementById("prescriptionFile").files[0];

    if (!name || !phone) return showToast("⚠️ يرجى إدخال الاسم ورقم الجوال", true);
    if (method === "توصيل للمنزل" && !address) return showToast("⚠️ يرجى إدخال العنوان للتوصيل", true);

    const submitBtn = orderForm.querySelector("button[type='submit']");
    submitBtn.textContent = "⏳ جاري حفظ الطلب...";
    submitBtn.disabled = true;

    const orderData = {
      action: "addOrder",
      order: {
        name, phone, method, address, coupon, notes,
        items: cart,
        total: calculateTotal(),
        prescription: file ? file.name : null
      }
    };

    try {
      // إرسال إلى جوجل شيت
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(orderData),
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
      });

      // بناء رسالة الواتساب
      let msg = "🛒 *طلب جديد من صيدلية المجيدي*\n──────────────────\n";
      msg += `👤 *الاسم:* ${name}\n📱 *الجوال:* ${phone}\n📦 *طريقة الاستلام:* ${method}\n`;
      if (method === "توصيل للمنزل") msg += `📍 *العنوان:* ${address}\n`;
      msg += "──────────────────\n🧾 *المنتجات:*\n";
      cart.forEach((item, i) => {
        msg += `${i + 1}. ${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي\n`;
      });
      msg += `──────────────────\n💰 *الإجمالي:* ${calculateTotal()} ر.ي\n`;
      if (coupon) msg += `🎟️ *كود الخصم:* ${coupon}\n`;
      if (file) msg += `📎 *وصفة طبية:* ${file.name}\n`;
      if (notes) msg += `📝 *ملاحظات:* ${notes}\n`;
      msg += "──────────────────\n✅ أرجو تأكيد الطلب وشكراً 🙏";

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
      showToast("✅ تم حفظ الطلب بنجاح وفتح واتساب");

      setTimeout(() => {
        orderForm.reset();
        if (addressLabel) addressLabel.style.display = "none";
        cart = [];
        renderCart();
        submitBtn.textContent = "تأكيد الطلب عبر واتساب";
        submitBtn.disabled = false;
      }, 1500);

    } catch (error) {
      console.error("Error saving order:", error);
      showToast("❌ حدث خطأ أثناء حفظ الطلب. حاول مرة أخرى.", true);
      submitBtn.textContent = "تأكيد الطلب عبر واتساب";
      submitBtn.disabled = false;
    }
  });
}

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

renderCart();
