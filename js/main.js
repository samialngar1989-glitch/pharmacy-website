/* ============================================================
   main.js — جلب البيانات من Google Sheets + إدارة السلة
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxtyvD8zQv2IsnaX0tYL8f0npfUJv8A7SVBTHeklRoE9yeq-M9r3DSvVnO5XDDXheVw-g/exec";

/* ---------------- الوضع الليلي ---------------- */
const darkBtn = document.getElementById("darkBtn");
function applyDarkMode(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("pharmacy_dark", isDark ? "1" : "0");
  if (darkBtn) darkBtn.textContent = isDark ? "☀️" : "🌙";
}
applyDarkMode(localStorage.getItem("pharmacy_dark") === "1");
if (darkBtn) {
  darkBtn.addEventListener("click", () => {
    applyDarkMode(!document.body.classList.contains("dark"));
  });
}

/* ---------------- القائمة والتمرير ---------------- */
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
}
const toTopBtn = document.getElementById("toTop");
window.addEventListener("scroll", () => {
  if (toTopBtn) toTopBtn.classList.toggle("show", window.scrollY > 400);
});
if (toTopBtn) {
  toTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============================================================
   جلب المنتجات من Google Sheets
   ============================================================ */
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  try {
    grid.innerHTML = `<p style="text-align:center; width:100%; padding:20px;">⏳ جاري تحميل الأدوية...</p>`;
    const response = await fetch(`${API_URL}?action=getProducts`);
    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      grid.innerHTML = `<p style="text-align:center; width:100%;">لا توجد أدوية حالياً.</p>`;
      return;
    }

    grid.innerHTML = ""; 

    data.products.forEach(product => {
      if (!product.Name) return;

      const remaining = product.TotalQty - product.SoldQty;
      const isLow = remaining <= 1;

      const card = document.createElement("div");
      card.className = "product-card";
      card.setAttribute("data-category", product.Category || "all");
      card.setAttribute("data-search", product.Name.toLowerCase());

      card.innerHTML = `
        <img src="${product.ImageUrl}" alt="${product.Name}" style="background:#eee;" />
        <h3>${product.Name}</h3>
        <div class="stock-info">
          <span class="stock-badge total">الكلية: ${product.TotalQty}</span>
          <span class="stock-badge sold">المباع: ${product.SoldQty}</span>
          <span class="stock-badge remain ${isLow ? 'low' : ''}">المتبقي: ${remaining} ${isLow ? '⚠️' : ''}</span>
        </div>
        <p class="price">${product.Price} ر.ي</p>
        <div class="product-actions">
          <!-- ربط مباشر لدالة الإضافة العامة -->
          <button class="btn btn-primary" onclick="addToCart('${product.Name}', ${product.Price})">أضف للطلب</button>
          <a href="https://wa.me/967773704939?text=أريد طلب: ${product.Name}" target="_blank" class="btn btn-whatsapp">💬</a>
        </div>
      `;
      grid.appendChild(card);
    });

    filterProducts();

  } catch (error) {
    console.error("Error loading products:", error);
    grid.innerHTML = `<p style="text-align:center; width:100%; color:red;">حدث خطأ. تأكد من اتصالك بالإنترنت.</p>`;
  }
}

/* ============================================================
   دالة الإضافة للسلة (عامة لكي تراها الأزرار الديناميكية)
   ============================================================ */
window.addToCart = function(name, price) {
  let cart = JSON.parse(localStorage.getItem("pharmacy_cart") || "[]");
  const existing = cart.find(item => item.name === name);
  
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price: parseFloat(price), qty: 1 });
  }
  
  localStorage.setItem("pharmacy_cart", JSON.stringify(cart));
  
  // إبلاغ ملف booking.js بتحديث الواجهة
  window.dispatchEvent(new Event("cartUpdated"));
  
  // إشعار
  if (typeof showToast === "function") showToast(`تمت إضافة: ${name}`);
};

/* ---------------- الفلترة والبحث ---------------- */
const categoryButtons = document.querySelectorAll(".category-card");
const searchBar = document.getElementById("searchBar");
const noResults = document.getElementById("noResults");

function filterProducts() {
  const activeCategory = document.querySelector(".category-card.active")?.dataset.filter || "all";
  const searchTerm = searchBar ? searchBar.value.trim().toLowerCase() : "";
  const cards = document.querySelectorAll(".product-card");
  let visibleCount = 0;

  cards.forEach(card => {
    const category = card.dataset.category;
    const searchData = (card.dataset.search || "").toLowerCase();
    const matchCategory = activeCategory === "all" || category === activeCategory;
    const matchSearch = searchTerm === "" || searchData.includes(searchTerm);

    if (matchCategory && matchSearch) {
      card.style.display = "flex";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  if (noResults) noResults.style.display = visibleCount === 0 ? "block" : "none";
}

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    categoryButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterProducts();
  });
});

if (searchBar) searchBar.addEventListener("input", filterProducts);

// بدء التشغيل
document.addEventListener("DOMContentLoaded", loadProducts);
