/* ============================================================
   admin.js — النسخة النهائية الشاملة (مع كل الأدوية)
   صيدلية المجيدي
   ============================================================ */

const ADMIN_PASSWORD = "almajidi2025";
const SESSION_KEY = "pharmacy_admin_logged";
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");

// دالة الدخول
if (localStorage.getItem(SESSION_KEY) === "1") {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  renderAll();
} else {
  loginScreen.style.display = "flex";
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (document.getElementById("passwordInput").value.trim() === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "1");
    loginScreen.style.display = "none";
    adminPanel.style.display = "block";
    renderAll();
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

// البيانات
function getOrders() { return JSON.parse(localStorage.getItem("pharmacy_orders") || "[]"); }
function saveOrders(o) { localStorage.setItem("pharmacy_orders", JSON.stringify(o)); }
function getInventory() { return JSON.parse(localStorage.getItem("pharmacy_inventory") || "[]"); }
function saveInventory(i) { localStorage.setItem("pharmacy_inventory", JSON.stringify(i)); }
function getSuppliers() { return JSON.parse(localStorage.getItem("pharmacy_suppliers") || "[]"); }
function saveSuppliers(s) { localStorage.setItem("pharmacy_suppliers", JSON.stringify(s)); }

// قائمة الأدوية الموحدة (19 دواء)
const ALL_MEDICINES = [
  "بنادول إكسترا 500mg",
  "باراسيتامول 500mg",
  "بروفين 400mg",
  "أموكسيسيلين 500mg",
  "أزيثرومايسين 500mg",
  "فيتامين سي 1000mg",
  "فيتامين د 50000 وحدة",
  "أقراص الحديد + فوليك",
  "أوميبرازول 20mg",
  "شراب مضاد حموضة",
  "واقي شمس SPF 50",
  "كريم مرطب للبشرة",
  "حليب أطفال 400g",
  "حفاضات أطفال (32 حبة)",
  "جهاز قياس الضغط الرقمي",
  "جهاز قياس السكر",
  "كمامات طبية (50 حبة)",
  "ضمادات لاصقة (20 حبة)",
  "مطهر جروح (بيتادين)"
];

/* ============================================================
   الطلبات والمزامنة التلقائية للمخزون
   ============================================================ */
function renderOrders() {
  const orders = getOrders();
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;

  document.getElementById("statTotal").textContent = orders.length;
  document.getElementById("statPending").textContent = orders.filter(o => o.status === "قيد الانتظار").length;
  document.getElementById("statPreparing").textContent = orders.filter(o => o.status === "قيد التجهيز").length;
  document.getElementById("statDone").textContent = orders.filter(o => o.status === "تم التسليم").length;

  const filtered = orders.filter(o => {
    return (o.name.toLowerCase().includes(search) || o.phone.includes(search)) && (status === "all" || o.status === status);
  });

  const container = document.getElementById("ordersContainer");
  if (filtered.length === 0) { container.innerHTML = `<p class="empty-state">لا توجد طلبات.</p>`; return; }

  container.innerHTML = filtered.map(order => {
    const i = orders.indexOf(order);
    let invNum = order.invoiceNumber;
    if (!invNum) {
      invNum = parseInt(localStorage.getItem("lastInvoiceNumber") || "100") + 1;
      localStorage.setItem("lastInvoiceNumber", invNum);
      orders[i].invoiceNumber = invNum;
      saveOrders(orders);
    }

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div><div class="order-customer">👤 ${order.name} <span style="font-size:0.8rem; color:gray;">(فاتورة #${invNum})</span></div>
          <div class="order-meta">📱 ${order.phone} · ${order.method}</div></div>
          <span class="status-badge">${order.status}</span>
        </div>
        <div class="order-details">
          <ul>${order.items.map(item => `<li>${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي</li>`).join("")}</ul>
          <p><strong>الإجمالي:</strong> ${order.total} ر.ي</p>
        </div>
        <div class="order-actions">
          <select class="status-select" onchange="changeOrderStatus(${i}, this.value)">
            <option value="قيد الانتظار" ${order.status === "قيد الانتظار" ? "selected" : ""}>قيد الانتظار</option>
            <option value="قيد التجهيز" ${order.status === "قيد التجهيز" ? "selected" : ""}>قيد التجهيز</option>
            <option value="تم التسليم" ${order.status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
          </select>
          <button onclick="printInvoice(${i})" class="btn-print-order">🖨️ طباعة</button>
          <button onclick="sendWhatsApp(${i})" style="background:#25d366; color:#fff; border:none; padding:8px; border-radius:6px;">💬 إرسال</button>
        </div>
      </div>
    `;
  }).join("");
}

function changeOrderStatus(index, newStatus) {
  const orders = getOrders();
  const oldStatus = orders[index].status;
  orders[index].status = newStatus;
  saveOrders(orders);

  if (newStatus === "تم التسليم" && oldStatus !== "تم التسليم") {
    const inv = getInventory();
    orders[index].items.forEach(orderItem => {
      const invItem = inv.find(i => i.name === orderItem.name);
      if (invItem) invItem.sold += orderItem.qty;
    });
    saveInventory(inv);
  }
  
  if (newStatus !== "تم التسليم" && oldStatus === "تم التسليم") {
    const inv = getInventory();
    orders[index].items.forEach(orderItem => {
      const invItem = inv.find(i => i.name === orderItem.name);
      if (invItem) invItem.sold = Math.max(0, invItem.sold - orderItem.qty);
    });
    saveInventory(inv);
  }

  renderOrders();
  renderInventory();
}

/* ============================================================
   المخزون
   ============================================================ */
function renderInventory() {
  const inv = getInventory();
  const container = document.getElementById("inventoryContainer");

  if (inv.length === 0) { container.innerHTML = `<p class="empty-state">لا يوجد مخزون.</p>`; return; }

  let html = `<table class="data-table"><thead><tr>
    <th>الدواء</th><th>الكلية</th><th>المباع</th><th>المتبقي</th><th>السعر التراكمي</th><th>إجراءات</th>
  </tr></thead><tbody>`;

  inv.forEach((item, index) => {
    const remaining = item.qty - item.sold;
    const isLow = remaining <= 1;
    const totalRevenue = item.sold * (item.price || 0);
    
    html += `<tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.sold}</td>
      <td class="${isLow ? 'low-stock' : ''}">${remaining} ${isLow ? '⚠️' : ''}</td>
      <td>${totalRevenue} ر.ي</td>
      <td>
        <button class="action-btn btn-edit" onclick="editInventory(${index})">تعديل</button>
        <button class="action-btn btn-delete" onclick="deleteInventory(${index})">حذف</button>
      </td>
    </tr>`;
  });

  container.innerHTML = html + `</tbody></table>`;
}

document.getElementById("addInventoryBtn").addEventListener("click", () => {
  document.getElementById("inventoryForm").style.display = "block";
  document.getElementById("editInvIndex").value = "-1";
  document.getElementById("invQty").value = "";
  document.getElementById("invSold").value = "0";
  document.getElementById("invPrice").value = "";
  
  // تعبئة قائمة الأدوية في المخزون
  const select = document.getElementById("invName");
  select.innerHTML = '<option value="">-- اختر الدواء --</option>' + 
    ALL_MEDICINES.map(med => `<option value="${med}">${med}</option>`).join("");
});

document.getElementById("cancelInvBtn").addEventListener("click", () => {
  document.getElementById("inventoryForm").style.display = "none";
});

document.getElementById("saveInvBtn").addEventListener("click", () => {
  const name = document.getElementById("invName").value;
  const qty = parseInt(document.getElementById("invQty").value) || 0;
  const sold = parseInt(document.getElementById("invSold").value) || 0;
  const price = parseFloat(document.getElementById("invPrice").value) || 0;
  const index = parseInt(document.getElementById("editInvIndex").value);

  if (!name) return alert("يرجى اختيار الدواء من القائمة");

  const inv = getInventory();
  if (index === -1) {
    if (inv.find(i => i.name === name)) return alert("هذا الدواء موجود بالفعل في المخزون، قم بتعديله بدلاً من إضافته.");
    inv.push({ name, qty, sold, price });
  } else {
    inv[index] = { name, qty, sold, price };
  }
  saveInventory(inv);
  renderInventory();
  document.getElementById("inventoryForm").style.display = "none";
});

function editInventory(index) {
  const item = getInventory()[index];
  document.getElementById("inventoryForm").style.display = "block";
  document.getElementById("editInvIndex").value = index;
  
  // تعبئة القائمة المنسدلة عند التعديل
  const select = document.getElementById("invName");
  select.innerHTML = ALL_MEDICINES.map(med => `<option value="${med}" ${med === item.name ? 'selected' : ''}>${med}</option>`).join("");
  
  document.getElementById("invQty").value = item.qty;
  document.getElementById("invSold").value = item.sold;
  document.getElementById("invPrice").value = item.price || 0;
}

function deleteInventory(index) {
  if (!confirm("حذف الدواء؟")) return;
  const inv = getInventory();
  inv.splice(index, 1);
  saveInventory(inv);
  renderInventory();
}

/* ============================================================
   طلبات الشركات
   ============================================================ */
function renderSuppliers() {
  const sup = getSuppliers();
  const container = document.getElementById("suppliersContainer");

  if (sup.length === 0) { container.innerHTML = `<p class="empty-state">لا توجد طلبات شراء.</p>`; return; }

  let html = `<table class="data-table"><thead><tr>
    <th>الشركة</th><th>الدواء</th><th>العدد</th><th>موعد الاستلام</th><th>إجراءات</th>
  </tr></thead><tbody>`;

  sup.forEach((item, index) => {
    html += `<tr>
      <td>${item.company}</td><td>${item.name}</td><td>${item.qty}</td><td>${item.date || 'غير محدد'}</td>
      <td><button class="action-btn btn-delete" onclick="deleteSupplier(${index})">حذف</button></td>
    </tr>`;
  });

  container.innerHTML = html + `</tbody></table>`;
}

document.getElementById("addSupplierBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "block";
  
  // تعبئة قائمة الأدوية في طلبات الشركات
  const select = document.getElementById("supName");
  select.innerHTML = '<option value="">-- اختر الدواء --</option>' + 
    ALL_MEDICINES.map(med => `<option value="${med}">${med}</option>`).join("");
});

document.getElementById("cancelSupBtn").addEventListener("click", () => {
  document.getElementById("supplierForm").style.display = "none";
});

document.getElementById("saveSupBtn").addEventListener("click", () => {
  const company = document.getElementById("supCompany").value.trim();
  const name = document.getElementById("supName").value;
  const qty = parseInt(document.getElementById("supQty").value) || 0;
  const date = document.getElementById("supDate").value;

  if (!name || !company) return alert("يرجى اختيار الدواء وإدخال اسم الشركة");

  const sup = getSuppliers();
  sup.push({ company, name, qty, date });
  saveSuppliers(sup);
  renderSuppliers();
  document.getElementById("supplierForm").style.display = "none";
});

function deleteSupplier(index) {
  if (!confirm("حذف الطلب؟")) return;
  const sup = getSuppliers();
  sup.splice(index, 1);
  saveSuppliers(sup);
  renderSuppliers();
}

/* ============================================================
   الطباعة والواتساب
   ============================================================ */
function sendWhatsApp(index) {
  const order = getOrders()[index];
  let msg = `*صيدلية المجيدي*\nمرحباً ${order.name}،\nتفاصيل طلبك (فاتورة #${order.invoiceNumber}):\n------------------------\n`;
  order.items.forEach(item => { msg += `▪️ ${item.name} × ${item.qty} = ${item.price * item.qty} ر.ي\n`; });
  msg += `------------------------\n*الإجمالي: ${order.total} ر.ي*\nشكراً لثقتكم بنا 🌿`;
  window.open(`https://wa.me/${order.phone.startsWith("0") ? "967" + order.phone.substring(1) : order.phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

function printInvoice(index) {
  const order = getOrders()[index];
  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert("يرجى السماح بالنوافذ المنبثقة.");
  
  const itemsHtml = order.items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price} ر.ي</td><td>${item.price * item.qty} ر.ي</td></tr>`).join("");
  
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
      <p><strong>فاتورة رقم:</strong> ${order.invoiceNumber} | <strong>التاريخ:</strong> ${new Date(order.date).toLocaleString("ar-SA")}</p>
      <p><strong>العميل:</strong> ${order.name} | <strong>الجوال:</strong> ${order.phone}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${itemsHtml}</table>
      <div class="total">الإجمالي: ${order.total} ر.ي</div>
      <div style="text-align:left; margin-top:40px;">
        <img src="https://samialngar1989-glitch.github.io/pharmacy-website/images/stamp.png" width="90" style="border-radius:50%; padding:5px;">
        <p>ختم الصيدلية</p>
      </div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);}<\/script>
    </body></html>
  `);
  printWindow.document.close();
}

function renderAll() { renderOrders(); renderInventory(); renderSuppliers(); }
