/* ============================================================
   admin.js — لوحة التحكم المتصلة بـ Google Sheets
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxtyvD8zQv2IsnaX0tYL8f0npfUJv8A7SVBTHeklRoE9yeq-M9r3DSvVnO5XDDXheVw-g/exec";
const ADMIN_PASSWORD = "almajidi2025";
const SESSION_KEY = "pharmacy_admin_logged";

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");

// الدخول
if (localStorage.getItem(SESSION_KEY) === "1") {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  loadAdminData();
} else {
  loginScreen.style.display = "flex";
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (document.getElementById("passwordInput").value.trim() === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "1");
    loginScreen.style.display = "none";
    adminPanel.style.display = "block";
    loadAdminData();
  } else {
    document.getElementById("loginError").textContent = "❌ كلمة المرور غير صحيحة";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
});

// التبويبات
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// الوضع الليلي
const darkBtn = document.getElementById("darkBtn");
if (darkBtn) {
  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark", isDark);
    darkBtn.textContent = isDark ? "☀️" : "🌙";
  }
  applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
  darkBtn.addEventListener("click", () => applyDarkMode(!document.body.classList.contains("dark")));
}

/* ============================================================
   دوال جلب البيانات
   ============================================================ */
async function loadAdminData() {
  // جلب الطلبات
  const ordersContainer = document.getElementById("ordersContainer");
  if (ordersContainer) ordersContainer.innerHTML = `<p class="empty-state">⏳ جاري التحميل...</p>`;

  try {
    const response = await fetch(`${API_URL}?action=getOrders`);
    const data = await response.json();
    renderOrders(data.orders || []);
  } catch (err) {
    if (ordersContainer) ordersContainer.innerHTML = `<p class="empty-state" style="color:red;">خطأ في جلب الطلبات.</p>`;
  }
}

/* ============================================================
   عرض الطلبات
   ============================================================ */
function renderOrders(orders) {
  const container = document.getElementById("ordersContainer");
  if (!container) return;

  // الإحصائيات
  document.getElementById("statTotal").textContent = orders.length;
  document.getElementById("statPending").textContent = orders.filter(o => o.Status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent = orders.filter(o => o.Status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent = orders.filter(o => o.Status === "تم التسليم").length;

  if (orders.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد طلبات.</p>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    // بما أن جوجل يرجع التواريخ كنصوص أحياناً، نعرضها كما هي
    let dateStr = order.Date ? new Date(order.Date).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }) : "";
    
    // تحويل النص إلى كائن JSON لفهم المنتجات
    let items = [];
    try { items = JSON.parse(order.Items); } catch(e) { items = []; }
    const itemsHtml = items.map(item => `<li>${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي</li>`).join("");

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <div class="order-customer">👤 ${order.CustomerName} <span style="font-size:0.8rem; color:gray;">(فاتورة #${order.InvoiceNum})</span></div>
            <div class="order-meta">📱 ${order.Phone} · ${order.Method}</div>
          </div>
          <div>
            <span class="status-badge status-${order.Status.replace(/\s+/g, "-")}">${order.Status}</span>
            <div class="order-date">${dateStr}</div>
          </div>
        </div>
        <div class="order-details">
          <ul class="order-items-list">${itemsHtml}</ul>
          <p><strong>الإجمالي:</strong> ${order.Total} ر.ي</p>
        </div>
        <div class="order-actions">
          <select class="status-select" onchange="updateStatus(${order.InvoiceNum}, this.value)">
            <option value="قيد الانتظار" ${order.Status === "قيد الانتظار" ? "selected" : ""}>قيد الانتظار</option>
            <option value="قيد التجهيز" ${order.Status === "قيد التجهيز" ? "selected" : ""}>قيد التجهيز</option>
            <option value="تم التسليم" ${order.Status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
          </select>
        </div>
      </div>
    `;
  }).join("");
}

/* ============================================================
   تحديث حالة الطلب (يرسل لجوجل)
   ============================================================ */
async function updateStatus(invoiceNum, newStatus) {
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateOrderStatus",
        invoiceNum: invoiceNum,
        status: newStatus
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    
    // تحديث الشاشة فوراً
    loadAdminData();
    alert("✅ تم تحديث الحالة في Google Sheets");
  } catch (err) {
    alert("❌ حدث خطأ في تحديث الحالة");
  }
}

/* ============================================================
   إضافة طلب شراء
   ============================================================ */
document.getElementById("saveSupBtn").addEventListener("click", async () => {
  const company = document.getElementById("supCompany").value.trim();
  const name = document.getElementById("supName").value;
  const qty = parseInt(document.getElementById("supQty").value) || 0;
  const date = document.getElementById("supDate").value;

  if (!name || !company) return alert("اختر الدواء وأدخل الشركة");

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addSupplier",
        supplier: { company, name, qty, date }
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    alert("✅ تم إرسال الطلب إلى Google Sheets");
    document.getElementById("supplierForm").style.display = "none";
  } catch (err) {
    alert("❌ حدث خطأ");
  }
});

// إظهار النماذج
document.getElementById("addSupplierBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "block";
});
document.getElementById("cancelSupBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "none";
});
