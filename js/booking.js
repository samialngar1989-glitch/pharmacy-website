(function() {
  const API_URL = "https://script.google.com/macros/s/AKfycbyUOI3f_H9shabQfW1mL1UYOMdwvbAlQKRUw_hQ7mrBhlMzojaJBHUruz4GHD5IKDez/exec";
  const WHATSAPP_NUMBER = "967773704939";

  const orderListEl = document.getElementById("orderList");
  const orderTotalEl = document.getElementById("orderTotal");
  const orderForm = document.getElementById("orderForm");
  const deliverySel = document.getElementById("deliveryMethod");
  const addressLabel = document.getElementById("addressLabel");
  const addressInput = document.getElementById("customerAddress");

  window.showToast = function(text, isError = false) {
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
  };

  function getCart() { return JSON.parse(localStorage.getItem("pharmacy_cart") || "[]"); }
  function saveCart(cart) { localStorage.setItem("pharmacy_cart", JSON.stringify(cart)); renderCart(); }

  function renderCart() {
    if (!orderListEl) return;
    const cart = getCart();
    orderListEl.innerHTML = "";

    if (cart.length === 0) {
      orderListEl.innerHTML = `<li class="empty-msg">لم تُضف أي منتج بعد</li>`;
      if (orderTotalEl) orderTotalEl.textContent = "0";
      return;
    }

    let total = 0;
    cart.forEach((item, index) => {
      total += item.price * item.qty;
      const li = document.createElement("li");
      li.className = "order-item";
      li.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-qty">
          <button type="button" class="qty-btn" onclick="window.changeQty(${index}, -1)">−</button>
          <span>${item.qty}</span>
          <button type="button" class="qty-btn" onclick="window.changeQty(${index}, 1)">+</button>
        </span>
        <span class="item-price">${item.price * item.qty} ر.ي</span>
        <button type="button" class="remove-btn" onclick="window.removeFromCart(${index})">✕</button>
      `;
      orderListEl.appendChild(li);
    });

    if (orderTotalEl) orderTotalEl.textContent = total;
  }

  window.changeQty = function(index, change) {
    let cart = getCart();
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart(cart);
  };

  window.removeFromCart = function(index) {
    let cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  };

  window.addEventListener("cartUpdated", renderCart);

  if (deliverySel && addressLabel && addressInput) {
    deliverySel.addEventListener("change", () => {
      const isDelivery = deliverySel.value === "توصيل للمنزل";
      addressLabel.style.display = isDelivery ? "block" : "none";
      addressInput.required = isDelivery;
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cart = getCart();

      if (cart.length === 0) return window.showToast("⚠️ أضف منتجًا واحدًا على الأقل", true);

      const name = document.getElementById("customerName").value.trim();
      const phone = document.getElementById("customerPhone").value.trim();
      const method = deliverySel.value;
      const address = addressInput ? addressInput.value.trim() : "";
      const coupon = document.getElementById("couponCode").value.trim();
      const notes = document.getElementById("orderNotes").value.trim();
      const file = document.getElementById("prescriptionFile").files[0];

      if (!name || !phone) return window.showToast("⚠️ يرجى إدخال الاسم ورقم الجوال", true);
      
      const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const submitBtn = orderForm.querySelector("button[type='submit']");
      submitBtn.textContent = "⏳ جاري حفظ الطلب...";
      submitBtn.disabled = true;

      try {
        await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "addOrder",
            order: { name, phone, method, address, coupon, notes, items: cart, total, prescription: file ? file.name : null }
          }),
          headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        let msg = "🛒 *طلب جديد من صيدلية المجيدي*\n──────────────────\n";
        msg += `👤 *الاسم:* ${name}\n📱 *الجوال:* ${phone}\n📦 *طريقة الاستلام:* ${method}\n`;
        if (method === "توصيل للمنزل") msg += `📍 *العنوان:* ${address}\n`;
        msg += "──────────────────\n🧾 *المنتجات:*\n";
        cart.forEach((item, i) => { msg += `${i + 1}. ${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي\n`; });
        msg += `──────────────────\n💰 *الإجمالي:* ${total} ر.ي\n`;
        if (coupon) msg += `🎟️ *كود الخصم:* ${coupon}\n`;
        if (file) msg += `📎 *وصفة طبية:* ${file.name}\n`;
        if (notes) msg += `📝 *ملاحظات:* ${notes}\n`;
        msg += "──────────────────\n✅ أرجو تأكيد الطلب وشكراً 🙏";

        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");

        localStorage.removeItem("pharmacy_cart");
        renderCart();
        orderForm.reset();
        if (addressLabel) addressLabel.style.display = "none";
        window.showToast("✅ تم إرسال الطلب وفتح واتساب");
        window.closeCartModal();

      } catch (error) {
        console.error(error);
        window.showToast("❌ حدث خطأ، حاول مرة أخرى.", true);
      } finally {
        submitBtn.textContent = "تأكيد الطلب عبر واتساب";
        submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", renderCart);
})();
