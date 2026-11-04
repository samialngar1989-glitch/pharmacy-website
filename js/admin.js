/* ============================================================
   admin.js — منطق لوحة التحكم
   صيدلية المجيدي
   ============================================================ */

/* ⚙️ غيّري كلمة المرور هنا */
const ADMIN_PASSWORD = "almajidi2025";

/* ---------------- عناصر الصفحة ---------------- */
const loginScreen    = document.getElementById("loginScreen");
const adminPanel     = document.getElementById("adminPanel");
const loginForm      = document.getElementById("loginForm");
const passwordInput  = document.getElementById("passwordInput");
const loginError     = document.getElementById("loginError");
const ordersContainer = document.getElementById("ordersContainer");
const searchInput    = document.getElementById("searchInput");
const filterStatus   = document.getElementById("filterStatus");

/* ---------------- جلسة الدخول ---------------- */
const SESSION_KEY = "pharmacy_admin_logged";

function checkSession() {
  if (localStorage.getItem(SESSION_KEY) === "1") {
    showPanel();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = "flex";
  adminPanel.style.display = "none";
}

function showPanel() {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  renderOrders();
}

/* ---------------- نموذج الدخول ---------------- */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pass = passwordInput.value.trim();

  if (pass === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "1");
    loginError.textContent = "";
    showPanel();
  } else {
    loginError.textContent = "❌ كلمة المرور غير صحيحة";
    passwordInput.value = "";
    passwordInput.focus();
  }
});

/* ---------------- تسجيل الخروج ---------------- */
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
  passwordInput.value = "";
});

/* ---------------- الوضع الليلي ---------------- */
const darkBtn = document.getElementById("darkBtn");
function applyDarkMode(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
  darkBtn.textContent = isDark ? "☀️" : "🌙";
}
applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
darkBtn.addEventListener("click", () => {
  applyDarkMode(!document.body.classList.contains("dark"));
});

/* ---------------- قراءة الطلبات ---------------- */
function getOrders() {
  return JSON.parse(localStorage.getItem("pharmacy_orders") || "[]");
}

function saveOrders(orders) {
  localStorage.setItem("pharmacy_orders", JSON.stringify(orders));
}

/* ---------------- عرض الطلبات ---------------- */
function renderOrders() {
  const orders = getOrders();
  const search = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;

  // الإحصائيات
  updateStats(orders);

  // تصفية
  const filtered = orders.filter(order => {
    const matchSearch = !search ||
      order.name.toLowerCase().includes(search) ||
      order.phone.includes(search);
    const matchStatus = status === "all" || order.status === status;
    return matchSearch && matchStatus;
  });

  // عرض
  if (filtered.length === 0) {
    ordersContainer.innerHTML = `<p class="empty-state">لا توجد طلبات مطابقة.</p>`;
    return;
  }

  ordersContainer.innerHTML = filtered.map(order => buildOrderCard(order)).join("");
  attachOrderEvents();
}

/* ---------------- بناء بطاقة طلب ---------------- */
function buildOrderCard(order) {
  const index = getOrders().indexOf(order);
  const statusClass = "status-" + order.status.replace(/\s+/g, "-");

  const itemsHtml = order.items.map(item =>
    `<li>${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي</li>`
  ).join("");

  const date = new Date(order.date).toLocaleString("ar-SA", {
    dateStyle: "short",
    timeStyle: "short"
  });

  return `
    <div class="order-card" data-index="${index}">
      <div class="order-card-header">
        <div>
          <div class="order-customer">👤 ${order.name}</div>
          <div class="order-meta">📱 ${order.phone} · ${order.method}</div>
        </div>
        <div>
          <span class="status-badge ${statusClass}">${order.status}</span>
          <div class="order-date">${date}</div>
        </div>
      </div>

      <div class="order-details">
        ${order.address ? `<p><strong>📍 العنوان:</strong> ${order.address}</p>` : ""}
        <p><strong>🧾 المنتجات:</strong></p>
        <ul class="order-items-list">${itemsHtml}</ul>
        <p><strong>💰 الإجمالي:</strong> ${order.total} ر.ي</p>
        ${order.coupon ? `<p><strong>🎟️ الكوبون:</strong> ${order.coupon}</p>` : ""}
        ${order.prescription ? `<p><strong>📎 وصفة:</strong> ${order.prescription}</p>` : ""}
        ${order.notes ? `<p><strong>📝 ملاحظات:</strong> ${order.notes}</p>` : ""}
      </div>

      <div class="order-actions">
        <select class="status-select" data-index="${index}">
          <option value="قيد الانتظار"  ${order.status === "قيد الانتظار"  ? "selected" : ""}>قيد الانتظار</option>
          <option value="قيد التجهيز"   ${order.status === "قيد التجهيز"   ? "selected" : ""}>قيد التجهيز</option>
          <option value="جاهز للاستلام" ${order.status === "جاهز للاستلام" ? "selected" : ""}>جاهز للاستلام</option>
          <option value="تم التسليم"    ${order.status === "تم التسليم"    ? "selected" : ""}>تم التسليم</option>
          <option value="ملغي"          ${order.status === "ملغي"          ? "selected" : ""}>ملغي</option>
        </select>
        <button class="btn-delete-order" data-index="${index}">🗑 حذف</button>
      </div>
    </div>
  `;
}

/* ---------------- ربط أحداث البطاقات ---------------- */
function attachOrderEvents() {
  // تغيير الحالة
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const orders = getOrders();
      orders[index].status = e.target.value;
      saveOrders(orders);
      renderOrders();
    });
  });

  // حذف طلب
  document.querySelectorAll(".btn-delete-order").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      if (!confirm("هل تريد حذف هذا الطلب نهائيًا؟")) return;
      const orders = getOrders();
      orders.splice(index, 1);
      saveOrders(orders);
      renderOrders();
    });
  });
}

/* ---------------- الإحصائيات ---------------- */
function updateStats(orders) {
  document.getElementById("statTotal").textContent = orders.length;
  document.getElementById("statPending").textContent =
    orders.filter(o => o.status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent =
    orders.filter(o => o.status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent =
    orders.filter(o => o.status === "تم التسليم").length;
}

/* ---------------- البحث والفلترة ---------------- */
searchInput.addEventListener("input", renderOrders);
filterStatus.addEventListener("change", renderOrders);

/* ---------------- تصدير CSV ---------------- */
document.getElementById("exportBtn").addEventListener("click", () => {
  const orders = getOrders();
  if (orders.length === 0) {
    alert("لا توجد طلبات لتصديرها.");
    return;
  }

  const headers = ["التاريخ", "الاسم", "الجوال", "طريقة الاستلام", "العنوان", "المنتجات", "الإجمالي", "الكوبون", "الوصفة", "ملاحظات", "الحالة"];
  const rows = orders.map(o => [
    new Date(o.date).toLocaleString("ar-SA"),
    o.name,
    o.phone,
    o.method,
    o.address || "",
    o.items.map(i => `${i.name} × ${i.qty}`).join(" | "),
    o.total,
    o.coupon || "",
    o.prescription || "",
    o.notes || "",
    o.status
  ]);

  const csvContent = "\uFEFF" + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `orders-${Date.now()}.csv`;
  link.click();
});

/* ---------------- حذف الكل ---------------- */
document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (getOrders().length === 0) return;
  if (!confirm("⚠️ سيتم حذف جميع الطلبات نهائيًا. متأكد؟")) return;
  saveOrders([]);
  renderOrders();
});

/* ---------------- التشغيل ---------------- */
checkSession();
