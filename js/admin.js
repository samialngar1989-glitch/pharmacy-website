/* ============================================================
   admin.js — منطق لوحة التحكم
   صيدلية المجيدي
   ============================================================ */

/* ⚙️ كلمة المرور */
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
const soundToggleBtn = document.getElementById("soundToggleBtn");

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
  if (loginScreen) loginScreen.style.display = "flex";
  if (adminPanel) adminPanel.style.display = "none";
}

function showPanel() {
  if (loginScreen) loginScreen.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
  renderOrders();
  startSoundWatcher(); 
}

/* ---------------- نموذج الدخول ---------------- */
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = passwordInput.value.trim();

    if (pass === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "1");
      if (loginError) loginError.textContent = "";
      showPanel();
    } else {
      if (loginError) loginError.textContent = "❌ كلمة المرور غير صحيحة";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });
}

/* ---------------- تسجيل الخروج ---------------- */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    showLogin();
    if (passwordInput) passwordInput.value = "";
  });
}

/* ---------------- الوضع الليلي ---------------- */
const darkBtn = document.getElementById("darkBtn");
function applyDarkMode(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
  if (darkBtn) darkBtn.textContent = isDark ? "☀️" : "🌙";
}
if (darkBtn) {
  applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
  darkBtn.addEventListener("click", () => {
    applyDarkMode(!document.body.classList.contains("dark"));
  });
}

/* ============================================================
   🔔 التنبيه الصوتي للطلبات الجديدة
   ============================================================ */
let soundEnabled = localStorage.getItem("admin_sound") !== "0";
let lastKnownCount = 0;

function updateSoundButton() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = soundEnabled ? "🔔" : "🔕";
  soundToggleBtn.style.opacity = soundEnabled ? "1" : "0.5";
}
updateSoundButton();

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("admin_sound", soundEnabled ? "1" : "0");
    updateSoundButton();
    if (soundEnabled) playBeep(); 
  });
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (err) {}
}

function startSoundWatcher() {
  lastKnownCount = getOrders().length;
  setInterval(() => {
    const currentCount = getOrders().length;
    if (currentCount > lastKnownCount && soundEnabled) {
      playBeep();
      setTimeout(playBeep, 300); 
    }
    lastKnownCount = currentCount;
  }, 5000);
}

/* ---------------- قراءة وحفظ الطلبات ---------------- */
function getOrders() {
  return JSON.parse(localStorage.getItem("pharmacy_orders") || "[]");
}

function saveOrders(orders) {
  localStorage.setItem("pharmacy_orders", JSON.stringify(orders));
}

/* ---------------- عرض الطلبات ---------------- */
function renderOrders() {
  if (!ordersContainer) return;
  const orders = getOrders();
  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const status = filterStatus ? filterStatus.value : "all";

  updateStats(orders);

  const filtered = orders.filter(order => {
    const matchSearch = !search ||
      order.name.toLowerCase().includes(search) ||
      order.phone.includes(search);
    const matchStatus = status === "all" || order.status === status;
    return matchSearch && matchStatus;
  });

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
        ${order.notes ? `<p><strong>📝 ملاحظات العميل:</strong> ${order.notes}</p>` : ""}
      </div>

      <div class="internal-notes">
        <label><strong>🔒 ملاحظات داخلية (لك فقط):</strong></label>
        <textarea class="internal-notes-input" data-index="${index}" rows="2" 
                  placeholder="مثال: العميل يفضل الاتصال مساءً...">${order.internalNotes || ""}</textarea>
      </div>

      <div class="order-actions">
        <select class="status-select" data-index="${index}">
          <option value="قيد الانتظار"  ${order.status === "قيد الانتظار"  ? "selected" : ""}>قيد الانتظار</option>
          <option value="قيد التجهيز"   ${order.status === "قيد التجهيز"   ? "selected" : ""}>قيد التجهيز</option>
          <option value="جاهز للاستلام" ${order.status === "جاهز للاستلام" ? "selected" : ""}>جاهز للاستلام</option>
          <option value="تم التسليم"    ${order.status === "تم التسليم"    ? "selected" : ""}>تم التسليم</option>
          <option value="ملغي"          ${order.status === "ملغي"          ? "selected" : ""}>ملغي</option>
        </select>
        <button class="btn-print-order" data-index="${index}">🖨️ طباعة</button>
        <button class="btn-delete-order" data-index="${index}">🗑 حذف</button>
      </div>
    </div>
  `;
}

/* ---------------- ربط أحداث البطاقات ---------------- */
function attachOrderEvents() {
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const orders = getOrders();
      orders[index].status = e.target.value;
      saveOrders(orders);
      renderOrders();
    });
  });

  document.querySelectorAll(".internal-notes-input").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const orders = getOrders();
      orders[index].internalNotes = e.target.value;
      saveOrders(orders);
    });
  });

  document.querySelectorAll(".btn-print-order").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      printInvoice(index);
    });
  });

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

/* ============================================================
   🖨️ طباعة الفاتورة
   ============================================================ */
function printInvoice(index) {
  const order = getOrders()[index];
  if (!order) return;

  const itemsRows = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.price} ر.ي</td>
      <td>${item.price * item.qty} ر.ي</td>
    </tr>
  `).join("");

  const date = new Date(order.date).toLocaleString("ar-SA");

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>فاتورة - صيدلية المجيدي</title>
      <style>
        body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 20px; color: #111; }
        .header { text-align: center; border-bottom: 3px solid #0e9f6e; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { color: #057a55; margin: 0; font-size: 1.6rem; }
        .header p { margin: 5px 0; color: #555; }
        .info p { margin: 6px 0; font-size: 0.95rem; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 0.9rem; }
        th { background: #e3f9f0; color: #057a55; }
        .total { text-align: left; font-size: 1.2rem; font-weight: bold; margin-top: 15px; color: #057a55; }
        .footer { margin-top: 30px; text-align: center; font-size: 0.8rem; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>صيدلية المجيدي</h1>
        <p>صحتك أمانة بين أيدينا</p>
        <p>📞 773704939</p>
      </div>
      <div class="info">
        <p><strong>رقم الفاتورة:</strong> #${String(index + 1).padStart(4, "0")}</p>
        <p><strong>التاريخ:</strong> ${date}</p>
        <p><strong>العميل:</strong> ${order.name}</p>
        <p><strong>الجوال:</strong> ${order.phone}</p>
        <p><strong>طريقة الاستلام:</strong> ${order.method}</p>
        ${order.address ? `<p><strong>العنوان:</strong> ${order.address}</p>` : ""}
      </div>
      <table>
        <thead>
          <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="total">الإجمالي: ${order.total} ر.ي</div>
      ${order.coupon ? `<p><strong>الكوبون:</strong> ${order.coupon}</p>` : ""}
      <div class="footer">
        <p>شكرًا لثقتكم بنا 🌿</p>
        <p>جميع الأدوية مضمونة من مصادر معتمدة</p>
      </div>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 500);
}

/* ---------------- الإحصائيات ---------------- */
function updateStats(orders) {
  const statTotal = document.getElementById("statTotal");
  const statPending = document.getElementById("statPending");
  const statPreparing = document.getElementById("statPreparing");
  const statDone = document.getElementById("statDone");

  if (statTotal) statTotal.textContent = orders.length;
  if (statPending) statPending.textContent = orders.filter(o => o.status === "قيد الانتظار").length;
  if (statPreparing) statPreparing.textContent = orders.filter(o => o.status === "قيد التجهيز").length;
  if (statDone) statDone.textContent = orders.filter(o => o.status === "تم التسليم").length;
}

/* ---------------- البحث والفلترة ---------------- */
if (searchInput) searchInput.addEventListener("input", renderOrders);
if (filterStatus) filterStatus.addEventListener("change", renderOrders);

/* ---------------- تصدير CSV ---------------- */
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const orders = getOrders();
    if (orders.length === 0) {
      alert("لا توجد طلبات لتصديرها.");
      return;
    }
    const headers = ["التاريخ", "الاسم", "الجوال", "طريقة الاستلام", "العنوان", "المنتجات", "الإجمالي", "الكوبون", "الوصفة", "ملاحظات العميل", "ملاحظات داخلية", "الحالة"];
    const rows = orders.map(o => [
      new Date(o.date).toLocaleString("ar-SA"),
      o.name, o.phone, o.method, o.address || "",
      o.items.map(i => `${i.name} × ${i.qty}`).join(" | "),
      o.total, o.coupon || "", o.prescription || "", o.notes || "", o.internalNotes || "", o.status
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders-${Date.now()}.csv`;
    link.click();
  });
}

/* ---------------- حذف الكل ---------------- */
const clearAllBtn = document.getElementById("clearAllBtn");
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    if (getOrders().length === 0) return;
    if (!confirm("⚠️ سيتم حذف جميع الطلبات نهائيًا. متأكد؟")) return;
    saveOrders([]);
    renderOrders();
  });
}

/* ---------------- التشغيل ---------------- */
checkSession();
