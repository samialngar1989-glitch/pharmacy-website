(function() {
  const API_URL = "https://script.google.com/macros/s/AKfycbzmLpjpb8zJbcL8P91hYcg47TWKABVR2bV0MY3sFRTM_I-01Tfg-TyKIs7F5hZt3GYx3w/exec";

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
  if (menuBtn && nav) menuBtn.addEventListener("click", () => nav.classList.toggle("open"));

  /* ---------------- السلة ---------------- */
  window.addToCart = function(name, price) {
    let cart = JSON.parse(localStorage.getItem("pharmacy_cart") || "[]");
    const existing = cart.find(item => item.name === name);
    const numericPrice = parseFloat(price) || 0;
    if (existing) existing.qty += 1;
    else cart.push({ name: name, price: numericPrice, qty: 1 });
    localStorage.setItem("pharmacy_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    if (typeof window.showToast === "function") window.showToast(`تمت إضافة: ${name}`);
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
        const isOutOfStock = remaining <= 0;
        const isLow = remaining <= 1 && remaining > 0;
        const price = parseFloat(product.Price) || 0;

        const card = document.createElement("div");
        card.className = "product-card";
        card.setAttribute("data-category", product.Category || "all");
        card.setAttribute("data-search", product.Name.toLowerCase());

        let actionButton = isOutOfStock 
          ? `<button class="btn btn-disabled" disabled>غير متوفر</button>`
          : `<button class="btn btn-primary add-btn" data-name="${product.Name}" data-price="${price}">أضف للطلب</button>`;

        card.innerHTML = `
          ${isOutOfStock ? '<span class="product-badge out-stock">نفذت الكمية</span>' : ''}
          <img src="${product.ImageUrl}" alt="${product.Name}" style="background:#eee;" />
          <h3>${product.Name}</h3>
          <div class="stock-info">
            <span class="stock-badge total">الكلية: ${product.TotalQty || 0}</span>
            <span class="stock-badge sold">المباع: ${product.SoldQty || 0}</span>
            <span class="stock-badge remain ${isOutOfStock || isLow ? 'low' : ''}">المتبقي: ${remaining} ${isOutOfStock || isLow ? '⚠️' : ''}</span>
          </div>
          <p class="price">${price} ر.ي</p>
          <div class="product-actions">
            ${actionButton}
            <a href="https://wa.me/967773704939?text=أريد طلب: ${product.Name}" target="_blank" class="btn btn-whatsapp">💬</a>
          </div>
        `;
        grid.appendChild(card);
      });
      document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", () => window.addToCart(btn.dataset.name, btn.dataset.price));
      });
      filterProducts();
    } catch (error) {
      console.error(error);
      grid.innerHTML = `<p style="text-align:center; width:100%; color:red;">حدث خطأ في تحميل البيانات.</p>`;
    }
  }

  /* ---------------- تطبيق الإعدادات من لوحة التحكم ---------------- */
  async function loadSettings() {
    try {
      const response = await fetch(`${API_URL}?action=getSettings`);
      const data = await response.json();
      if (data.settings) {
        const s = data.settings;
        
        // 1. الاسم في الهيدر والفوتر
        if (s.PharmacyName) {
          document.getElementById("sitePharmacyName").textContent = s.PharmacyName;
          document.getElementById("footerPharmacyName").textContent = s.PharmacyName;
          document.getElementById("footerCopyrightName").textContent = s.PharmacyName;
          document.title = s.PharmacyName + " | صحتك أمانة";
        }

        // 2. بيانات الدكتور والترخيص
        if (s.DrName) document.getElementById("footerDrName").textContent = "الصيدلي: " + s.DrName;
        if (s.License) document.getElementById("footerLicense").textContent = "رقم الترخيص: " + s.License;

        // 3. الهاتف
        if (s.Phone) {
          document.getElementById("footerPhone").textContent = "هاتف: " + s.Phone;
          document.getElementById("whatsappFloatLink").href = "https://wa.me/967" + s.Phone.substring(1); 
        }

        // 4. سياسة الإرجاع والتنبيه
        if (s.ReturnPolicy) document.getElementById("footerReturnPolicy").textContent = s.ReturnPolicy;
        if (s.WarningText) document.getElementById("footerWarningText").innerHTML = "<strong>تنبيه هام:</strong> " + s.WarningText;

        // 5. الشريط الإعلاني
        if (s.TickerMessage) document.getElementById("tickerText").textContent = s.TickerMessage;

        // 6. الفيديو (استخراج المعرف من الرابط)
        if (s.VideoUrl) {
          let videoId = "";
          if (s.VideoUrl.includes("youtu.be/")) videoId = s.VideoUrl.split("youtu.be/")[1].split("?")[0];
          else if (s.VideoUrl.includes("youtube.com/watch")) videoId = s.VideoUrl.split("v=")[1].split("&")[0];
          
          if (videoId) {
            document.getElementById("siteVideoIframe").src = `https://www.youtube.com/embed/${videoId}`;
          } else {
            document.getElementById("siteVideoIframe").src = s.VideoUrl; // إذا كان رابط مباشر
          }
        }
      }
    } catch (error) {
      console.error("خطأ في جلب الإعدادات:", error);
    }
  }

  /* ---------------- الفلترة ---------------- */
  const searchBar = document.getElementById("searchBar");
  const noResults = document.getElementById("noResults");

  function filterProducts() {
    const activeCategory = document.querySelector(".category-card.active")?.dataset.filter || "all";
    const searchTerm = searchBar ? searchBar.value.trim().toLowerCase() : "";
    const cards = document.querySelectorAll(".product-card");
    let visibleCount = 0;

    const categoryMap = { "مسكنات": "general", "مضادات حيوية": "antibiotics", "فيتامينات": "vitamins", "الجهاز الهضمي": "digestive", "العناية بالبشرة": "skincare", "الأم والطفل": "mom-baby", "أجهزة القياس": "devices", "مستلزمات طبية": "supplies" };

    cards.forEach(card => {
      let category = card.dataset.category;
      if (categoryMap[category]) category = categoryMap[category];
      const searchData = (card.dataset.search || "").toLowerCase();
      const matchCategory = activeCategory === "all" || category === activeCategory;
      const matchSearch = searchTerm === "" || searchData.includes(searchTerm);
      if (matchCategory && matchSearch) {
        card.style.display = "flex"; visibleCount++;
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

  /* ---------------- بدء التشغيل ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadSettings();
    setTimeout(() => {
      const cart = JSON.parse(localStorage.getItem("pharmacy_cart") || "[]");
      if (cart.length > 0) {
        const modal = document.getElementById("abandonedCartModal");
        if (modal) modal.style.display = "flex";
      }
    }, 4000);
  });

  window.closeCartModal = function() {
    const modal = document.getElementById("abandonedCartModal");
    if (modal) modal.style.display = "none";
  };
})();
