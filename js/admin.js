/* ============================================================
   admin.js — النسخة النهائية المضمونة
   صيدلية المجيدي
   ============================================================ */

const ADMIN_PASSWORD = "almajidi2025";
const SESSION_KEY = "pharmacy_admin_logged";

/* --- عناصر الصفحة --- */
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const ordersContainer = document.getElementById("ordersContainer");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const darkBtn = document.getElementById("darkBtn");

/* --- نظام الدخول --- */
function showPanel() {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  renderOrders();
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
  passwordInput.value = "";
});

if (localStorage.getItem(SESSION_KEY) === "1") {
  showPanel();
}

/* --- الوضع الليلي --- */
if (darkBtn) {
  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
    darkBtn.textContent = isDark ? "☀️" : "🌙";
  }
  applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
  darkBtn.addEventListener("click", () => {
    applyDarkMode(!document.body.classList.contains("dark"));
  });
}

/* --- الصوت --- */
let soundEnabled = localStorage.getItem("admin_sound") !== "0";
let lastKnownCount = 0;

if (soundToggleBtn) {
  soundToggleBtn.textContent = soundEnabled ? "🔔" : "🔕";
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("admin_sound", soundEnabled ? "1" : "0");
    soundToggleBtn.textContent = soundEnabled ? "🔔" : "🔕";
  });
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
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

/* --- إدارة الطلبات --- */
function getOrders() {
  return JSON.parse(localStorage.getItem("pharmacy_orders") || "[]");
}

function saveOrders(orders) {
  localStorage.setItem("pharmacy_orders", JSON.stringify(orders));
}

/* --- تحديث الأرقام --- */
function updateStats(orders) {
  document.getElementById("statTotal").textContent = orders.length;
  document.getElementById("statPending").textContent = orders.filter(o => o.status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent = orders.filter(o => o.status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent = orders.filter(o => o.status === "تم التسليم").length;
}

/* --- عرض الطلبات --- */
function renderOrders() {
  if (!ordersContainer) return;
  const orders = getOrders();
  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const status = filterStatus ? filterStatus.value : "all";

  updateStats(orders); // تحديث الأرقام هنا

  const filtered = orders.filter(order => {
    const matchSearch = !search || order.name.toLowerCase().includes(search) || order.phone.includes(search);
    const matchStatus = status === "all" || order.status === status;
    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    ordersContainer.innerHTML = `<p class="empty-state">لا توجد طلبات مطابقة.</p>`;
    return;
  }

  ordersContainer.innerHTML = filtered.map(order => {
    const index = orders.indexOf(order);
    const statusClass = "status-" + order.status.replace(/\s+/g, "-");
    const date = new Date(order.date).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
    
    const itemsHtml = order.items.map(item => `<li>${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي</li>`).join("");

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
        </div>

        <div class="internal-notes">
          <label><strong>🔒 ملاحظات داخلية:</strong></label>
          <textarea class="internal-notes-input" data-index="${index}" rows="2" placeholder="...">${order.internalNotes || ""}</textarea>
        </div>

        <div class="order-actions">
          <select class="status-select" data-index="${index}">
            <option value="قيد الانتظار" ${order.status === "قيد الانتظار" ? "selected" : ""}>قيد الانتظار</option>
            <option value="قيد التجهيز" ${order.status === "قيد التجهيز" ? "selected" : ""}>قيد التجهيز</option>
            <option value="جاهز للاستلام" ${order.status === "جاهز للاستلام" ? "selected" : ""}>جاهز للاستلام</option>
            <option value="تم التسليم" ${order.status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
            <option value="ملغي" ${order.status === "ملغي" ? "selected" : ""}>ملغي</option>
          </select>
          <button class="btn-print-order" data-index="${index}">🖨️ طباعة</button>
          <button class="btn-delete-order" data-index="${index}">🗑 حذف</button>
        </div>
      </div>
    `;
  }).join("");

  attachEvents();
}

/* --- ربط الأحداث --- */
function attachEvents() {
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const orders = getOrders();
      orders[index].status = e.target.value;
      saveOrders(orders);
      renderOrders(); // هذا السطر هو الذي يحدث الأرقام فورًا
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
      printInvoice(parseInt(e.target.dataset.index, 10));
    });
  });

  document.querySelectorAll(".btn-delete-order").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!confirm("هل تريد حذف هذا الطلب؟")) return;
      const index = parseInt(e.target.dataset.index, 10);
      const orders = getOrders();
      orders.splice(index, 1);
      saveOrders(orders);
      renderOrders();
    });
  });
}

/* ============================================================
   🖨️ الطباعة (النسخة المضمونة للجوال والكمبيوتر)
   ============================================================ */
function printInvoice(index) {
  const order = getOrders()[index];
  if (!order) return;

  // إنشاء نافذة طباعة جديدة
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) في المتصفح للطباعة.");
    return;
  }

  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.price} ر.ي</td>
      <td>${item.price * item.qty} ر.ي</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${index + 1}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        .header { text-align: center; border-bottom: 2px solid #0e9f6e; padding-bottom: 10px; margin-bottom: 20px; }
        h1 { color: #0e9f6e; margin: 0; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: right; }
        th { background: #f0f0f0; }
        .total { text-align: left; font-weight: bold; font-size: 18px; margin-top: 15px; }
        .info { margin-bottom: 20px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>صيدلية المجيدي</h1>
        <p>هاتف: 773704939</p>
      </div>
      <div class="info">
        <p><strong>العميل:</strong> ${order.name}</p>
        <p><strong>الجوال:</strong> ${order.phone}</p>
        <p><strong>طريقة الاستلام:</strong> ${order.method}</p>
      </div>
      <table>
        <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
        ${itemsHtml}
      </table>
      <div class="total">الإجمالي: ${order.total} ر.ي</div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 1000);
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/* --- الأزرار العامة --- */
if (searchInput) searchInput.addEventListener("input", renderOrders);
if (filterStatus) filterStatus.addEventListener("change", renderOrders);

document.getElementById("exportBtn").addEventListener("click", () => {
  const orders = getOrders();
  if (orders.length === 0) return alert("لا توجد طلبات.");
  const headers = ["الاسم", "الجوال", "المنتجات", "الإجمالي", "الحالة"];
  const rows = orders.map(o => [o.name, o.phone, o.items.map(i => `${i.name}x${i.qty}`).join(" | "), o.total, o.status]);
  const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "orders.csv";
  link.click();
});

document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (!confirm("حذف كل الطلبات؟")) return;
  saveOrders([]);
  renderOrders();
});
