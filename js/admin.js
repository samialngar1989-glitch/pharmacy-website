/* ============================================================
   admin.js — النسخة الشاملة (طلبات + مخزون + شركات)
   ============================================================ */

const ADMIN_PASSWORD = "almajidi2025";
const SESSION_KEY = "pharmacy_admin_logged";

/* --- عناصر الدخول --- */
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

function showPanel() {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  renderAll(); // تشغيل كل الدوال
  startSoundWatcher();
}

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value.trim() === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "1");
      loginError.textContent = "";
      showPanel();
    } else {
      loginError.textContent = "❌ كلمة المرور غير صحيحة";
      passwordInput.value = "";
    }
  });
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  loginScreen.style.display = "flex";
  adminPanel.style.display = "none";
});

if (localStorage.getItem(SESSION_KEY) === "1") showPanel();

/* --- التبويبات --- */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* --- الوضع الليلي والصوت --- */
const darkBtn = document.getElementById("darkBtn");
if (darkBtn) {
  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
    darkBtn.textContent = isDark ? "☀️" : "🌙";
  }
  applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
  darkBtn.addEventListener("click", () => applyDarkMode(!document.body.classList.contains("dark")));
}

/* ============================================================
   إدارة الطلبات
   ============================================================ */
function getOrders() { return JSON.parse(localStorage.getItem("pharmacy_orders") || "[]"); }
function saveOrders(orders) { localStorage.setItem("pharmacy_orders", JSON.stringify(orders)); }

function renderOrders() {
  const orders = getOrders();
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("filterStatus").value;
  
  document.getElementById("statTotal").textContent = orders.length;
  document.getElementById("statPending").textContent = orders.filter(o => o.status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent = orders.filter(o => o.status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent = orders.filter(o => o.status === "تم التسليم").length;

  const filtered = orders.filter(order => {
    const matchSearch = !search || order.name.toLowerCase().includes(search) || order.phone.includes(search);
    const matchStatus = status === "all" || order.status === status;
    return matchSearch && matchStatus;
  });

  const container = document.getElementById("ordersContainer");
  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد طلبات مطابقة.</p>`;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const index = orders.indexOf(order);
    const statusClass = "status-" + order.status.replace(/\s+/g, "-");
    const date = new Date(order.date).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
    const itemsHtml = order.items.map(item => `<li>${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي</li>`).join("");
    
    // الترقيم المتسلسل (إذا لم يكن هناك رقم، نعطيه رقمًا جديدًا)
    let invNum = order.invoiceNumber;
    if (!invNum) {
      invNum = parseInt(localStorage.getItem("lastInvoiceNumber") || "100") + 1;
      localStorage.setItem("lastInvoiceNumber", invNum);
      orders[index].invoiceNumber = invNum;
      saveOrders(orders);
    }

    return `
      <div class="order-card" data-index="${index}">
        <div class="order-card-header">
          <div>
            <div class="order-customer">👤 ${order.name} <span style="font-size:0.8rem; color:gray;">(فاتورة #${invNum})</span></div>
            <div class="order-meta">📱 ${order.phone} · ${order.method}</div>
          </div>
          <div>
            <span class="status-badge ${statusClass}">${order.status}</span>
            <div class="order-date">${date}</div>
          </div>
        </div>
        <div class="order-details">
          <p><strong>🧾 المنتجات:</strong></p>
          <ul class="order-items-list">${itemsHtml}</ul>
          <p><strong>💰 الإجمالي:</strong> ${order.total} ر.ي</p>
        </div>
        <div class="order-actions">
          <select class="status-select" data-index="${index}">
            <option value="قيد الانتظار" ${order.status === "قيد الانتظار" ? "selected" : ""}>قيد الانتظار</option>
            <option value="قيد التجهيز" ${order.status === "قيد التجهيز" ? "selected" : ""}>قيد التجهيز</option>
            <option value="جاهز للاستلام" ${order.status === "جاهز للاستلام" ? "selected" : ""}>جاهز للاستلام</option>
            <option value="تم التسليم" ${order.status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
            <option value="ملغي" ${order.status === "ملغي" ? "selected" : ""}>ملغي</option>
          </select>
          <button class="btn-print-order" onclick="printInvoice(${index})">🖨️ طباعة</button>
          <button class="btn-whatsapp-order" onclick="sendWhatsApp(${index})" style="background:#25d366; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">💬 إرسال للعميل</button>
          <button class="btn-delete-order" onclick="deleteOrder(${index})">🗑 حذف</button>
        </div>
      </div>
    `;
  }).join("");

  // ربط تغيير الحالة
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      orders[i].status = e.target.value;
      saveOrders(orders);
      renderOrders();
    });
  });
}

function deleteOrder(index) {
  if (!confirm("هل تريد حذف هذا الطلب؟")) return;
  const orders = getOrders();
  orders.splice(index, 1);
  saveOrders(orders);
  renderOrders();
}

/* إرسال الفاتورة عبر واتساب */
function sendWhatsApp(index) {
  const order = getOrders()[index];
  let msg = `*صيدلية المجيدي*\n`;
  msg += `مرحباً ${order.name}،\n`;
  msg += `تفاصيل طلبك (فاتورة #${order.invoiceNumber}):\n`;
  msg += `------------------------\n`;
  order.items.forEach(item => {
    msg += `▪️ ${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي\n`;
  });
  msg += `------------------------\n`;
  msg += `*الإجمالي: ${order.total} ر.ي*\n`;
  msg += `طريقة الاستلام: ${order.method}\n\n`;
  msg += `شكراً لثقتكم بنا 🌿`;
  
  const url = `https://wa.me/${order.phone.startsWith("0") ? "967" + order.phone.substring(1) : order.phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* الطباعة */
function printInvoice(index) {
  const order = getOrders()[index];
  if (!order) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert("يرجى السماح بالنوافذ المنبثقة.");
  
  const itemsHtml = order.items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price} ر.ي</td><td>${item.price * item.qty} ر.ي</td></tr>`).join("");
  const logoUrl = "https://samialngar1989-glitch.github.io/pharmacy-website/images/logo.png";

  printWindow.document.write(`
    <html dir="rtl"><head><meta charset="UTF-8"><style>
      body { font-family: Arial; padding: 30px; max-width: 800px; margin: auto; color: #000; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0e9f6e; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #000; padding: 10px; text-align: right; }
      th { background: #f0f0f0; } .total { text-align: left; font-weight: bold; font-size: 18px; margin-top: 15px; }
    </style></head><body>
      <div class="header">
        <div><h1 style="color:#0e9f6e;margin:0;">صيدلية المجيدي</h1>
        <p>د. سامي محمد احمد | ترخيص: 80808080<br>هاتف: 773704939</p></div>
        <img src="${logoUrl}" width="80">
      </div>
      <p><strong>فاتورة رقم:</strong> ${order.invoiceNumber || index+1} | <strong>التاريخ:</strong> ${new Date(order.date).toLocaleString("ar-SA")}</p>
      <p><strong>العميل:</strong> ${order.name} | <strong>الجوال:</strong> ${order.phone}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${itemsHtml}</table>
      <div class="total">الإجمالي: ${order.total} ر.ي</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);}<\/script>
    </body></html>
  `);
  printWindow.document.close();
}

/* ============================================================
   إدارة المخزون
   ============================================================ */
function getInventory() { return JSON.parse(localStorage.getItem("pharmacy_inventory") || "[]"); }
function saveInventory(inv) { localStorage.setItem("pharmacy_inventory", JSON.stringify(inv)); }

function renderInventory() {
  const inv = getInventory();
  const search = document.getElementById("searchInventory").value.trim().toLowerCase();
  const filtered = inv.filter(item => item.name.toLowerCase().includes(search));
  const container = document.getElementById("inventoryContainer");

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد أدوية في المخزون. أضف دواءً جديداً.</p>`;
    return;
  }

  let html = `<table class="data-table"><thead><tr>
    <th>اسم الدواء</th><th>الكمية الكلية</th><th>المباع</th><th>المتبقي</th><th>إجراءات</th>
  </tr></thead><tbody>`;

  filtered.forEach(item => {
    const index = inv.indexOf(item);
    const remaining = item.qty - item.sold;
    const isLow = remaining <= 1;
    
    html += `<tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.sold}</td>
      <td class="${isLow ? 'low-stock' : ''}">${remaining} ${isLow ? '⚠️' : ''}</td>
      <td>
        <button class="action-btn btn-edit" onclick="editInventory(${index})">تعديل</button>
        <button class="action-btn btn-delete" onclick="deleteInventory(${index})">حذف</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

document.getElementById("addInventoryBtn").addEventListener("click", () => {
  document.getElementById("inventoryForm").style.display = "block";
  document.getElementById("editInvIndex").value = "-1";
  document.getElementById("invName").value = "";
  document.getElementById("invQty").value = "";
  document.getElementById("invSold").value = "";
});

document.getElementById("cancelInvBtn").addEventListener("click", () => {
  document.getElementById("inventoryForm").style.display = "none";
});

document.getElementById("saveInvBtn").addEventListener("click", () => {
  const name = document.getElementById("invName").value.trim();
  const qty = parseInt(document.getElementById("invQty").value) || 0;
  const sold = parseInt(document.getElementById("invSold").value) || 0;
  const index = parseInt(document.getElementById("editInvIndex").value);

  if (!name) return alert("أدخل اسم الدواء");

  const inv = getInventory();
  if (index === -1) {
    inv.push({ name, qty, sold });
  } else {
    inv[index] = { name, qty, sold };
  }
  saveInventory(inv);
  renderInventory();
  document.getElementById("inventoryForm").style.display = "none";
});

function editInventory(index) {
  const item = getInventory()[index];
  document.getElementById("inventoryForm").style.display = "block";
  document.getElementById("editInvIndex").value = index;
  document.getElementById("invName").value = item.name;
  document.getElementById("invQty").value = item.qty;
  document.getElementById("invSold").value = item.sold;
}

function deleteInventory(index) {
  if (!confirm("حذف هذا الدواء من المخزون؟")) return;
  const inv = getInventory();
  inv.splice(index, 1);
  saveInventory(inv);
  renderInventory();
}

/* ============================================================
   إدارة طلبات الشركات
   ============================================================ */
function getSuppliers() { return JSON.parse(localStorage.getItem("pharmacy_suppliers") || "[]"); }
function saveSuppliers(sup) { localStorage.setItem("pharmacy_suppliers", JSON.stringify(sup)); }

function renderSuppliers() {
  const sup = getSuppliers();
  const container = document.getElementById("suppliersContainer");

  if (sup.length === 0) {
    container.innerHTML = `<p class="empty-state">لا توجد طلبات شراء حالياً.</p>`;
    return;
  }

  let html = `<table class="data-table"><thead><tr>
    <th>الدواء / النوع</th><th>العدد المطلوب</th><th>موعد الاستلام</th><th>إجراءات</th>
  </tr></thead><tbody>`;

  sup.forEach(item => {
    const index = sup.indexOf(item);
    html += `<tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.date || 'غير محدد'}</td>
      <td>
        <button class="action-btn btn-delete" onclick="deleteSupplier(${index})">حذف</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

document.getElementById("addSupplierBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "block";
});

document.getElementById("cancelSupBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "none";
});

document.getElementById("saveSupBtn").addEventListener("click", () => {
  const name = document.getElementById("supName").value.trim();
  const qty = parseInt(document.getElementById("supQty").value) || 0;
  const date = document.getElementById("supDate").value;

  if (!name) return alert("أدخل اسم الدواء");

  const sup = getSuppliers();
  sup.push({ name, qty, date });
  saveSuppliers(sup);
  renderSuppliers();
  document.getElementById("supplierForm").style.display = "none";
});

function deleteSupplier(index) {
  if (!confirm("حذف هذا الطلب؟")) return;
  const sup = getSuppliers();
  sup.splice(index, 1);
  saveSuppliers(sup);
  renderSuppliers();
}

/* ============================================================
   التشغيل الشامل
   ============================================================ */
function renderAll() {
  renderOrders();
  renderInventory();
  renderSuppliers();
}

document.getElementById("searchInput").addEventListener("input", renderOrders);
document.getElementById("filterStatus").addEventListener("change", renderOrders);
document.getElementById("searchInventory").addEventListener("input", renderInventory);

let soundEnabled = localStorage.getItem("admin_sound") !== "0";
let lastCount = 0;
const soundBtn = document.getElementById("soundToggleBtn");

if (soundBtn) {
  soundBtn.textContent = soundEnabled ? "🔔" : "🔕";
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("admin_sound", soundEnabled ? "1" : "0");
    soundBtn.textContent = soundEnabled ? "🔔" : "🔕";
  });
}

function startSoundWatcher() {
  lastCount = getOrders().length;
  setInterval(() => {
    const now = getOrders().length;
    if (now > lastCount && soundEnabled) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } catch(e){}
    }
    lastCount = now;
  }, 5000);
}
