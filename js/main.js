/* ============================================================
   main.js — جلب البيانات من Google Sheets + إدارة السلة
   ============================================================ */
(function() {
  const API_URL = "https://script.google.com/macros/s/AKfycbxtyvD8zQv2IsnaX0tYL8f0npfUJv8A7SVBTHeklRoE9yeq-M9r3DSvVnO5XDDXheVw-g/exec";

  /* ---------------- الوضع الليلي ---------------- */
  const darkBtn = document.getElementById("darkBtn");
  if (darkBtn) {
    if (localStorage.getItem("pharmacy_dark") === "1") document.body.classList.add("dark");
    darkBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("pharmacy_dark", document.body.classList.contains("dark") ? "1" : "0");
    });
  }

  /* ---------------- القائمة ---------------- */
  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
  }

  /* ---------------- دالة إضافة السلة (عامة) ---------------- */
  window.addToCart = function(name, price) {
    let cart = JSON.parse(localStorage.getItem("pharmacy_cart") || "[]");
    const existing = cart.find(item => item.name === name);
    const numericPrice = parseFloat(price) || 0;
    
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name: name, price: numericPrice, qty: 1 });
    }
    
    localStorage.setItem("pharmacy_cart", JSON.stringify(cart));
    
    // إبلاغ ملف booking.js بتحديث الواجهة
    window.dispatchEvent(new Event("cartUpdated"));
    
    // إشعار
    if (typeof window.showToast === "function") {
      window.showToast(`تمت إضافة: ${name}`);
    }
  };

  /* ---------------- جلب المنتجات ---------------- */
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
        
        const remaining = (product.TotalQty || 0) - (product.SoldQty || 0);
        const isLow = remaining <= 1;
        const price = parseFloat(product.Price) || 0;

        const card = document.createElement("div");
        card.className = "product-card";
        card.setAttribute("data-category", product.Category || "all");
        card.setAttribute("data-search", product.Name.toLowerCase());

        card.innerHTML = `
          <img src="${product.ImageUrl}" alt="${product.Name}" style="background:#eee;" />
          <h3>${product.Name}</h3>
          <div class="stock-info">
            <span class="stock-badge total">الكلية: ${product.TotalQty || 0}</span>
            <span class="stock-badge sold">المباع: ${product.SoldQty || 0}</span>
            <span class="stock-badge remain ${isLow ? 'low' : ''}">المتبقي: ${remaining} ${isLow ? '⚠️' : ''}</span>
          </div>
          <p class="price">${price} ر.ي</p>
          <div class="product-actions">
            <button class="btn btn-primary add-btn" data-name="${product.Name}" data-price="${price}">أضف للطلب</button>
            <a href="https://wa.me/967773704939?text=أريد طلب: ${product.Name}" target="_blank" class="btn btn-whatsapp">💬</a>
          </div>
        `;
        grid.appendChild(card);
      });

      // ربط الأزرار بالسلة بعد إنشائها
      document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          window.addToCart(btn.dataset.name, btn.dataset.price);
        });
      });

      filterProducts();

    } catch (error) {
      console.error("Error loading products:", error);
      grid.innerHTML = `<p style="text-align:center; width:100%; color:red;">حدث خطأ في تحميل البيانات.</p>`;
    }
  }

  /* ---------------- الفلترة والبحث ---------------- */
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

  document.querySelectorAll(".category-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterProducts();
    });
  });

  if (searchBar) searchBar.addEventListener("input", filterProducts);

  // بدء التشغيل
  document.addEventListener("DOMContentLoaded", loadProducts);
})();
