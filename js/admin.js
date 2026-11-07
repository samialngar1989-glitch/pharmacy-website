const API_URL = "https://script.google.com/macros/s/AKfycbzH_fiKERFvtR-aJ0yGOWgkrKYwpjg0jMKl8uSP-mG3HbHp_7DnwUMwplINmSpOxoQCDQ/exec";
const ADMIN_PASSWORD = "almajidi2025";
const SESSION_KEY = "pharmacy_admin_logged";

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");

let globalOrders = [];
let globalProducts = [];

// الدخول
if (localStorage.getItem(SESSION_KEY) === "1") {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  loadAllData();
} else {
  loginScreen.style.display = "flex";
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (document.getElementById("passwordInput").value.trim() === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "1");
    loginScreen.style.display = "none";
    adminPanel.style.display = "block";
    loadAllData();
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

async function loadAllData() {
  await Promise.all([loadOrders(), loadProducts(), loadSuppliers()]);
}

async function loadOrders() {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = `<p class="empty-state">⏳ جاري تحميل الطلبات...</p>`;
  try {
    const res = await fetch(`${API_URL}?action=getOrders`);
    const data = await res.json();
    globalOrders = data.orders || [];
    renderOrders();
  } catch (err) {
    container.innerHTML = `<p class="empty-state" style="color:red;">خطأ في جلب الطلبات.</p>`;
  }
}

async function loadProducts() {
  const container = document.getElementById("inventoryContainer");
  container.innerHTML = `<p class="empty-state">⏳ جاري تحميل المخزون...</p>`;
  try {
    const res = await fetch(`${API_URL}?action=getProducts`);
    const data = await res.json();
    globalProducts = data.products || [];
    renderInventory();
  } catch (err) {
    container.innerHTML = `<p class="empty-state" style="color:red;">خطأ في جلب المخزون.</p>`;
  }
}

async function loadSuppliers() {
  const container = document.getElementById("suppliersContainer");
  container.innerHTML = `<p class="empty-state">⏳ جاري تحميل الطلبات...</p>`;
  try {
    const res = await fetch(`${API_URL}?action=getSuppliers`);
    const data = await res.json();
    renderSuppliers(data.suppliers || []);
  } catch (err) {
    container.innerHTML = `<p class="empty-state" style="color:red;">خطأ في جلب طلبات الشركات.</p>`;
  }
}

function renderOrders() {
  const container = document.getElementById("ordersContainer");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;

  document.getElementById("statTotal").textContent = globalOrders.length;
  document.getElementById("statPending").textContent = globalOrders.filter(o => o.Status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent = globalOrders.filter(o => o.Status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent = globalOrders.filter(o => o.Status === "تم التسليم").length;

  const filtered = globalOrders.filter(o => {
    const matchSearch = !search || o.CustomerName.toLowerCase().includes(search) || o.Phone.includes(search);
    const matchStatus = status === "all" || o.Status === status;
    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد طلبات مطابقة.</p>`;
    return;
  }

  container.innerHTML = filtered.map(order => {
    let dateStr = order.Date ? new Date(order.Date).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }) : "";
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
          <button class="btn-print-order" onclick="printInvoice(${order.InvoiceNum})">🖨️ طباعة</button>
          <button onclick="sendWhatsApp('${order.CustomerName}', '${order.Phone}', ${order.InvoiceNum})" style="background:#25d366; color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer;">💬 إرسال</button>
        </div>
      </div>
    `;
  }).join("");
}

document.getElementById("searchInput").addEventListener("input", renderOrders);
document.getElementById("filterStatus").addEventListener("change", renderOrders);

async function updateStatus(invoiceNum, newStatus) {
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateOrderStatus", invoiceNum: invoiceNum, status: newStatus }),
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    loadAllData();
    alert("✅ تم تحديث الحالة وخصم المخزون في Google Sheets");
  } catch (err) {
    alert("❌ حدث خطأ في تحديث الحالة");
  }
}

function renderInventory() {
  const container = document.getElementById("inventoryContainer");
  const expiryBox = document.getElementById("expiryWarningBox");
  const expiryList = document.getElementById("expiryWarningList");
  
  if (globalProducts.length === 0) {
    container.innerHTML = `<p class="empty-state">لا يوجد مخزون.</p>`;
    return;
  }

  let html = `<table class="data-table"><thead><tr>
    <th>الدواء</th><th>السعر</th><th>الكلية</th><th>المباع</th><th>المتبقي</th><th>التراكمي</th>
  </tr></thead><tbody>`;

  let expiringHTML = "";
  const today = new Date();

  globalProducts.forEach(p => {
    const remaining = (p.TotalQty || 0) - (p.SoldQty || 0);
    const isLow = remaining <= 1;
    const totalRevenue = (p.SoldQty || 0) * (p.Price || 0);
    
    if (p.ExpiryDate) {
      const expiryDate = new Date(p.ExpiryDate);
      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90 && diffDays >= 0) {
        expiringHTML += `<li><strong>${p.Name}</strong> - ينتهي بعد ${diffDays} يوم</li>`;
      }
    }
    
    html += `<tr>
      <td>${p.Name}</td>
      <td>${p.Price} ر.ي</td>
      <td>${p.TotalQty || 0}</td>
      <td>${p.SoldQty || 0}</td>
      <td class="${isLow ? 'low-stock' : ''}">${remaining} ${isLow ? '⚠️' : ''}</td>
      <td>${totalRevenue} ر.ي</td>
    </tr>`;
  });

  container.innerHTML = html + `</tbody></table>`;

  if (expiryBox && expiryList) {
    if (expiringHTML) {
      expiryBox.style.display = "block";
      expiryList.innerHTML = expiringHTML;
    } else {
      expiryBox.style.display = "none";
    }
  }
}

document.getElementById("refreshInventoryBtn").addEventListener("click", loadProducts);

function renderSuppliers(suppliers) {
  const container = document.getElementById("suppliersContainer");
  if (suppliers.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد طلبات شراء مسجلة.</p>`;
    return;
  }
  let html = `<table class="data-table"><thead><tr>
    <th>التاريخ</th><th>الشركة</th><th>الدواء</th><th>العدد</th><th>موعد الاستلام</th>
  </tr></thead><tbody>`;
  suppliers.forEach(s => {
    let dateStr = s.Date ? new Date(s.Date).toLocaleDateString("ar-SA") : "";
    html += `<tr><td>${dateStr}</td><td>${s.Company}</td><td>${s.ItemName}</td><td>${s.Qty}</td><td>${s.ExpectedDate || 'غير محدد'}</td></tr>`;
  });
  container.innerHTML = html + `</tbody></table>`;
}

document.getElementById("refreshSupBtn").addEventListener("click", loadSuppliers);

/* ============================================================
   تحديث الشريط الإعلاني في الموقع
   ============================================================ */
document.getElementById("whatsappCampaignBtn").addEventListener("click", async () => {
  const message = prompt("أدخلي النص الجديد الذي سيظهر في الشريط المتحرك أعلى الموقع:");
  if (!message) return;

  const btn = document.getElementById("whatsappCampaignBtn");
  btn.textContent = "⏳ جاري التحديث...";
  btn.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateTicker", message: message }),
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    
    const data = await res.json();
    if (data.success) {
      alert("✅ تم تحديث الشريط الإعلاني في الموقع بنجاح!");
    } else {
      alert("❌ فشل التحديث. رد جوجل: " + JSON.stringify(data));
    }
  } catch (e) {
    alert("❌ خطأ في الاتصال بالخادم: " + e.message);
  } finally {
    btn.textContent = "📢 تحديث الشريط الإعلاني";
    btn.disabled = false;
  }
});

/* ============================================================
   الطباعة والواتساب
   ============================================================ */
function sendWhatsApp(name, phone, invoiceNum) {
  let msg = `*صيدلية المجيدي*\nمرحباً ${name}،\nنود إبلاغك بأن طلبك (فاتورة #${invoiceNum}) قيد التجهيز.\nشكراً لثقتكم بنا 🌿`;
  window.open(`https://wa.me/${phone.startsWith("0") ? "967" + phone.substring(1) : phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

function printInvoice(invoiceNum) {
  const order = globalOrders.find(o => o.InvoiceNum == invoiceNum);
  if (!order) return alert("الطلب غير موجود");

  let items = [];
  try { items = JSON.parse(order.Items); } catch(e) {}
  const itemsHtml = items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price} ر.ي</td><td>${item.price * item.qty} ر.ي</td></tr>`).join("");

  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert("يرجى السماح بالنوافذ المنبثقة.");
  
  printWindow.document.write(`
    <html dir="rtl"><head><meta charset="UTF-8"><style>
      body { font-family: Arial; padding: 30px; max-width: 800px; margin: auto; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0e9f6e; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #000; padding: 10px; text-align: right; }
      th { background: #f0f0f0; } .total { text-align: left; font-weight: bold; font-size: 18px; margin-top: 15px; }
    </style></head><body>
      <div class="header">
        <div><h1 style="color:#0e9f6e;margin:0;">صيدلية المجيدي</h1><p>د. سامي محمد احمد | ترخيص: 80808080<br>هاتف: 773704939</p></div>
        <img src="https://samialngar1989-glitch.github.io/pharmacy-website/images/logo.png" width="80">
      </div>
      <p><strong>فاتورة رقم:</strong> ${order.InvoiceNum} | <strong>التاريخ:</strong> ${new Date(order.Date).toLocaleString("ar-SA")}</p>
      <p><strong>العميل:</strong> ${order.CustomerName} | <strong>الجوال:</strong> ${order.Phone}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${itemsHtml}</table>
      <div class="total">الإجمالي: ${order.Total} ر.ي</div>
      <div style="text-align:left; margin-top:40px;">
        <img src="https://samialngar1989-glitch.github.io/pharmacy-website/images/stamp.png" width="90" style="border-radius:50%; padding:5px;">
        <p>ختم الصيدلية</p>
      </div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);}<\/script>
    </body></html>
  `);
  printWindow.document.close();
}
