/* ===========================================================
   NEBULA STORE — script.js
   All store logic: catalog render, search, filters, cart,
   checkout validation, Razorpay payment flow.
   =========================================================== */

/* ----------------------- 1. PRODUCT DATA ----------------------- */
// Product catalog, gradients and localStorage helpers come from data.js
// (shared with admin.js) so admin edits show up here immediately.
let PRODUCTS = loadProducts();

/* ----------------------- 2. STATE ----------------------- */
let cart = JSON.parse(localStorage.getItem("nebula_cart") || "[]");
let filters = {
  search: "",
  categories: new Set(),
  priceMin: 0,
  priceMax: 6000,
  sort: "default"
};

function saveCart(){ localStorage.setItem("nebula_cart", JSON.stringify(cart)); }

/* ----------------------- 3. RENDER: PRODUCT GRID ----------------------- */
const grid = document.getElementById("productGrid");
const noResults = document.getElementById("noResults");
const resultCount = document.getElementById("resultCount");

function getFilteredProducts(){
  let list = PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.categories.size === 0 || filters.categories.has(p.category);
    const matchesPrice = p.price >= filters.priceMin && p.price <= filters.priceMax;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  switch(filters.sort){
    case "price-asc": list.sort((a,b)=>a.price-b.price); break;
    case "price-desc": list.sort((a,b)=>b.price-a.price); break;
    case "popularity": list.sort((a,b)=>b.popularity-a.popularity); break;
    case "newest": list.sort((a,b)=> new Date(b.added) - new Date(a.added)); break;
    default: break;
  }
  return list;
}

function renderGrid(){
  const list = getFilteredProducts();
  resultCount.textContent = `Showing ${list.length} product${list.length===1?"":"s"}`;
  noResults.classList.toggle("hidden", list.length !== 0);
  grid.innerHTML = list.map(p => `
    <article class="product-card" data-id="${p.id}">
      <span class="card-tag">${p.category}</span>
      <div class="card-icon" style="background:${gradientFor(p.id)}">
        <i class="fa-solid ${p.icon}"></i>
      </div>
      <h3 class="card-name">${p.name}</h3>
      <p class="card-desc">${p.desc}</p>
      <div class="card-rating">
        <i class="fa-solid fa-star"></i> ${p.rating.toFixed(1)} <span>(${p.reviews})</span>
      </div>
      <div class="card-price-row">
        <span class="card-price">₹${p.price.toLocaleString("en-IN")}</span>
      </div>
      <div class="card-actions">
        <button class="btn-secondary add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
        <button class="btn-primary buy-now-btn" data-id="${p.id}">Buy Now</button>
      </div>
    </article>
  `).join("");

  attachCardEvents();
  observeCards();
  renderActiveChips();
}

function attachCardEvents(){
  document.querySelectorAll(".add-to-cart-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      addToCart(Number(btn.dataset.id));
    });
  });
  document.querySelectorAll(".buy-now-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      addToCart(Number(btn.dataset.id), { silent:true });
      openCheckout();
    });
  });

  // 3D tilt-on-hover effect for each card
  document.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("mousemove", e=>{
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rx = ((y / rect.height) - 0.5) * -10;
      const ry = ((x / rect.width) - 0.5) * 10;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", ()=>{
      card.style.transform = "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
    });
  });
}

// Scroll-reveal animation for cards
let cardObserver;
function observeCards(){
  if(cardObserver) cardObserver.disconnect();
  cardObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.12 });
  document.querySelectorAll(".product-card").forEach(c=>cardObserver.observe(c));
}

/* ----------------------- 4. SEARCH (live filter + suggestions) ----------------------- */
const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById("searchSuggestions");

searchInput.addEventListener("input", ()=>{
  filters.search = searchInput.value.trim();
  renderGrid();
  renderSuggestions();
});
searchInput.addEventListener("focus", renderSuggestions);
document.addEventListener("click", e=>{
  if(!e.target.closest(".search-wrap")) searchSuggestions.innerHTML = "";
});

function renderSuggestions(){
  const q = filters.search.toLowerCase();
  if(!q){ searchSuggestions.innerHTML = ""; return; }
  const matches = PRODUCTS.filter(p=>p.name.toLowerCase().includes(q)).slice(0,6);
  searchSuggestions.innerHTML = matches.map(p=>`
    <div class="sugg-item" data-id="${p.id}">
      <span class="sugg-icon" style="background:${gradientFor(p.id)}"><i class="fa-solid ${p.icon}"></i></span>
      <span>${p.name}</span>
      <span class="sugg-price">₹${p.price.toLocaleString("en-IN")}</span>
    </div>
  `).join("");
  searchSuggestions.querySelectorAll(".sugg-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      const product = PRODUCTS.find(p=>p.id === Number(item.dataset.id));
      searchInput.value = product.name;
      filters.search = product.name;
      searchSuggestions.innerHTML = "";
      renderGrid();
      document.getElementById("catalog").scrollIntoView({behavior:"smooth"});
    });
  });
}

/* ----------------------- 5. FILTER PANEL ----------------------- */
const filterPanel = document.getElementById("filterPanel");
const filterOverlay = document.getElementById("filterOverlay");

document.getElementById("filterToggle").addEventListener("click", ()=>{
  filterPanel.classList.add("open");
  filterOverlay.classList.add("show");
});
function closeFilterPanel(){
  filterPanel.classList.remove("open");
  filterOverlay.classList.remove("show");
}
document.getElementById("filterClose").addEventListener("click", closeFilterPanel);
filterOverlay.addEventListener("click", ()=>{ closeFilterPanel(); closeCart(); });

// Category list, built dynamically from product data
const categoryList = document.getElementById("categoryList");
function renderCategoryList(){
  const categories = [...new Set(PRODUCTS.map(p=>p.category))].sort();
  categoryList.innerHTML = categories.map(cat=>{
    const count = PRODUCTS.filter(p=>p.category===cat).length;
    return `<button class="cat-pill" data-cat="${cat}"><span>${cat}</span><span class="cat-count">${count}</span></button>`;
  }).join("");
  categoryList.querySelectorAll(".cat-pill").forEach(pill=>{
    pill.addEventListener("click", ()=>{
      const cat = pill.dataset.cat;
      if(filters.categories.has(cat)) filters.categories.delete(cat);
      else filters.categories.add(cat);
      pill.classList.toggle("active");
      renderGrid();
    });
  });
}

// Price range (two-thumb, JS-clamped)
const priceMin = document.getElementById("priceMin");
const priceMax = document.getElementById("priceMax");
const priceMinLabel = document.getElementById("priceMinLabel");
const priceMaxLabel = document.getElementById("priceMaxLabel");

function updatePriceRange(){
  let minVal = Number(priceMin.value);
  let maxVal = Number(priceMax.value);
  if(minVal > maxVal - 100){ minVal = maxVal - 100; priceMin.value = minVal; }
  filters.priceMin = minVal;
  filters.priceMax = maxVal;
  priceMinLabel.textContent = minVal.toLocaleString("en-IN");
  priceMaxLabel.textContent = maxVal.toLocaleString("en-IN");
  renderGrid();
}
priceMin.addEventListener("input", updatePriceRange);
priceMax.addEventListener("input", updatePriceRange);

// Sort
document.getElementById("sortSelect").addEventListener("change", e=>{
  filters.sort = e.target.value;
  renderGrid();
});

// Reset
document.getElementById("filterReset").addEventListener("click", ()=>{
  filters = { search:"", categories:new Set(), priceMin:0, priceMax:6000, sort:"default" };
  searchInput.value = "";
  priceMin.value = 0; priceMax.value = 6000;
  priceMinLabel.textContent = "0"; priceMaxLabel.textContent = "6000";
  document.getElementById("sortSelect").value = "default";
  document.querySelectorAll(".cat-pill").forEach(p=>p.classList.remove("active"));
  renderGrid();
});

function renderActiveChips(){
  const chipsWrap = document.getElementById("activeChips");
  const chips = [];
  if(filters.search) chips.push({ label:`"${filters.search}"`, clear:()=>{ filters.search=""; searchInput.value=""; }});
  filters.categories.forEach(cat=>{
    chips.push({ label:cat, clear:()=>{
      filters.categories.delete(cat);
      document.querySelectorAll(".cat-pill").forEach(p=>{ if(p.dataset.cat===cat) p.classList.remove("active"); });
    }});
  });
  if(filters.priceMin > 0 || filters.priceMax < 6000){
    chips.push({ label:`₹${filters.priceMin}–₹${filters.priceMax}`, clear:()=>{
      filters.priceMin = 0; filters.priceMax = 6000;
      priceMin.value = 0; priceMax.value = 6000;
      priceMinLabel.textContent = "0"; priceMaxLabel.textContent = "6000";
    }});
  }
  chipsWrap.innerHTML = chips.map((c,i)=>`<span class="chip" data-i="${i}">${c.label} <i class="fa-solid fa-xmark"></i></span>`).join("");
  chipsWrap.querySelectorAll(".chip").forEach((el,i)=>{
    el.querySelector("i").addEventListener("click", ()=>{
      chips[i].clear();
      renderGrid();
    });
  });
}

/* ----------------------- 6. CART ----------------------- */
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsEl = document.getElementById("cartItems");
const cartEmptyEl = document.getElementById("cartEmpty");
const cartBadge = document.getElementById("cartBadge");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const checkoutBtn = document.getElementById("checkoutBtn");

function addToCart(id, opts={}){
  const existing = cart.find(c=>c.id===id);
  if(existing) existing.qty += 1;
  else cart.push({ id, qty:1 });
  saveCart();
  renderCart();
  if(!opts.silent) openCart();
}

function changeQty(id, delta){
  const item = cart.find(c=>c.id===id);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(c=>c.id!==id);
  saveCart();
  renderCart();
}

function removeFromCart(id){
  cart = cart.filter(c=>c.id!==id);
  saveCart();
  renderCart();
}

function cartTotal(){
  return cart.reduce((sum,c)=>{
    const p = PRODUCTS.find(p=>p.id===c.id);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}

function renderCart(){
  const count = cart.reduce((n,c)=>n+c.qty, 0);
  cartBadge.textContent = count;
  cartEmptyEl.classList.toggle("hidden", cart.length !== 0);
  checkoutBtn.disabled = cart.length === 0;

  cartItemsEl.innerHTML = cart.map(c=>{
    const p = PRODUCTS.find(p=>p.id===c.id);
    if(!p) return "";
    return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item-icon" style="background:${gradientFor(p.id)}"><i class="fa-solid ${p.icon}"></i></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">₹${p.price.toLocaleString("en-IN")}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="dec"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-val">${c.qty}</span>
            <button class="qty-btn" data-action="inc"><i class="fa-solid fa-plus"></i></button>
            <button class="cart-item-remove" data-action="remove"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  cartItemsEl.querySelectorAll(".cart-item").forEach(row=>{
    const id = Number(row.dataset.id);
    row.querySelector('[data-action="inc"]').addEventListener("click", ()=>changeQty(id, 1));
    row.querySelector('[data-action="dec"]').addEventListener("click", ()=>changeQty(id, -1));
    row.querySelector('[data-action="remove"]').addEventListener("click", ()=>removeFromCart(id));
  });

  cartSubtotalEl.textContent = `₹${cartTotal().toLocaleString("en-IN")}`;
}

function openCart(){ cartPanel.classList.add("open"); cartOverlay.classList.add("show"); }
function closeCart(){ cartPanel.classList.remove("open"); cartOverlay.classList.remove("show"); }

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

/* ----------------------- 7. CHECKOUT MODAL ----------------------- */
const checkoutOverlay = document.getElementById("checkoutOverlay");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const modalTotal = document.getElementById("modalTotal");

function openCheckout(){
  if(cart.length === 0) return;
  modalTotal.textContent = `₹${cartTotal().toLocaleString("en-IN")}`;
  checkoutOverlay.classList.add("show");
  checkoutModal.classList.add("open");
  closeCart();
}
function closeCheckout(){
  checkoutOverlay.classList.remove("show");
  checkoutModal.classList.remove("open");
}
checkoutBtn.addEventListener("click", openCheckout);
document.getElementById("checkoutClose").addEventListener("click", closeCheckout);
checkoutOverlay.addEventListener("click", closeCheckout);

function validateField(id, value, rules){
  const errEl = document.getElementById(`err${id.replace("cust","")}`);
  const inputEl = document.getElementById(id);
  let message = "";
  if(rules.required && !value.trim()) message = "This field is required.";
  else if(rules.pattern && !rules.pattern.test(value)) message = rules.message;
  errEl.textContent = message;
  inputEl.classList.toggle("invalid", !!message);
  return !message;
}

checkoutForm.addEventListener("submit", e=>{
  e.preventDefault();
  const name = document.getElementById("custName").value;
  const mobile = document.getElementById("custMobile").value;
  const email = document.getElementById("custEmail").value;

  const validName = validateField("custName", name, { required:true });
  const validMobile = validateField("custMobile", mobile, {
    required:true, pattern:/^[0-9]{10}$/, message:"Enter a valid 10-digit mobile number."
  });
  const validEmail = validateField("custEmail", email, {
    required:true, pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message:"Enter a valid email address."
  });

  if(validName && validMobile && validEmail){
    closeCheckout();
    startRazorpayPayment({ name, mobile, email });
  }
});

/* ----------------------- 8. RAZORPAY PAYMENT ----------------------- */
// NOTE ON PRODUCTION SECURITY:
// In a live deployment, never trust the client-side amount. The proper
// flow is: (1) browser asks YOUR backend to create a Razorpay order
// (server calls Razorpay's Orders API with the verified cart total),
// (2) browser opens Razorpay Checkout using that order_id, (3) on
// success, the browser sends the payment id + signature back to your
// backend, which verifies the signature with your Razorpay key secret
// before marking the order as paid. Example Node/Express endpoints:
//
//   app.post("/api/create-order", async (req, res) => {
//     const order = await razorpay.orders.create({
//       amount: verifiedServerSideTotal * 100,
//       currency: "INR",
//       receipt: `rcpt_${Date.now()}`
//     });
//     res.json(order);
//   });
//
//   app.post("/api/verify-payment", (req, res) => {
//     const { order_id, payment_id, signature } = req.body;
//     const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(`${order_id}|${payment_id}`).digest("hex");
//     res.json({ valid: expected === signature });
//   });
//
// This demo calls Razorpay Checkout directly from the browser with a
// placeholder key, which is fine for a sandbox/demo but NOT for production.

let lastCustomer = null;

function startRazorpayPayment(customer){
  lastCustomer = customer;
  const totalAmount = cartTotal();

  if(typeof Razorpay === "undefined"){
    // Razorpay script failed to load (e.g. offline demo) — simulate flow instead.
    simulatePaymentResult(true, customer, totalAmount);
    return;
  }

  const options = {
    key: "rzp_test_T79LjsJP4bsGGO", // Replace with your real Razorpay Key ID
    amount: totalAmount * 100,   // amount in paise
    currency: "INR",
    name: "NebulaStore",
    description: "Software Purchase",
    handler: function(response){
      finalizeOrder(customer, totalAmount, response.razorpay_payment_id || "demo_payment_id");
    },
    prefill: {
      name: customer.name,
      email: customer.email,
      contact: customer.mobile
    },
    notes: { store: "NebulaStore Demo" },
    theme: { color: "#7C5CFC" },
    modal: {
      ondismiss: function(){ showConfirmFail(); }
    }
  };

  try{
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function(){ showConfirmFail(); });
    rzp.open();
  }catch(err){
    simulatePaymentResult(true, customer, totalAmount);
  }
}

// Fallback so the demo always shows a working confirmation, even without
// a live Razorpay key.
function simulatePaymentResult(success, customer, totalAmount){
  setTimeout(()=>{
    if(success) finalizeOrder(customer, totalAmount, "demo_" + Date.now());
    else showConfirmFail();
  }, 600);
}

function finalizeOrder(customer, totalAmount, paymentId){
  const order = {
    id: "ORD" + Date.now(),
    paymentId,
    customer,
    items: cart.map(c=>{
      const p = PRODUCTS.find(p=>p.id===c.id);
      return { id:c.id, name:p?.name, price:p?.price, qty:c.qty };
    }),
    total: totalAmount,
    status: "Paid",
    date: new Date().toISOString()
  };
  saveOrder(order);
  cart = [];
  saveCart();
  renderCart();
  showConfirmSuccess(order);
}

function saveOrder(order){
  const orders = JSON.parse(localStorage.getItem("nebula_orders") || "[]");
  orders.push(order);
  localStorage.setItem("nebula_orders", JSON.stringify(orders));

  const customers = JSON.parse(localStorage.getItem("nebula_customers") || "[]");
  if(!customers.find(c=>c.email === order.customer.email)){
    customers.push({ name: order.customer.name, mobile: order.customer.mobile, email: order.customer.email, since: order.date });
    localStorage.setItem("nebula_customers", JSON.stringify(customers));
  }
}

/* ----------------------- 9. CONFIRMATION MODAL ----------------------- */
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmModal = document.getElementById("confirmModal");
const confirmSuccess = document.getElementById("confirmSuccess");
const confirmFail = document.getElementById("confirmFail");

function showConfirmSuccess(order){
  confirmOverlay.classList.add("show");
  confirmModal.classList.add("open");
  confirmSuccess.classList.remove("hidden");
  confirmFail.classList.add("hidden");
  document.getElementById("confirmMsg").textContent = `Your license has been emailed to ${order.customer.email}.`;
  document.getElementById("confirmOrderId").textContent = `Order ID: ${order.id}`;
}
function showConfirmFail(){
  confirmOverlay.classList.add("show");
  confirmModal.classList.add("open");
  confirmFail.classList.remove("hidden");
  confirmSuccess.classList.add("hidden");
}
function closeConfirm(){
  confirmOverlay.classList.remove("show");
  confirmModal.classList.remove("open");
}
document.getElementById("confirmClose").addEventListener("click", closeConfirm);
document.getElementById("cancelPayment").addEventListener("click", closeConfirm);
document.getElementById("retryPayment").addEventListener("click", ()=>{
  closeConfirm();
  if(lastCustomer) startRazorpayPayment(lastCustomer);
});

/* ----------------------- 10. TESTIMONIALS CAROUSEL ----------------------- */
const TESTIMONIALS = [
  { name:"Riya Kapoor", role:"Freelance Designer", quote:"PixelCraft replaced two subscriptions for me. Checkout took less than a minute and the key landed instantly.", stars:5 },
  { name:"Arjun Mehta", role:"Startup Founder", quote:"Bought CodeForge IDE Pro and TaskFlow together — bundle felt fair and support answered an activation question in minutes.", stars:5 },
  { name:"Sana Iyer", role:"Video Editor", quote:"MotionForge handles 4K timelines smoother than tools twice the price. Genuinely impressed.", stars:4 },
  { name:"Karthik Rao", role:"IT Admin", quote:"Rolled out SecureGuard across 40 office machines using the license keys from one order. Painless.", stars:5 },
  { name:"Neha Verma", role:"Content Creator", quote:"The search-as-you-type made finding ScreenCast Pro instant. Loved the whole experience.", stars:4 }
];
let tIndex = 0;
const testimonialTrack = document.getElementById("testimonialTrack");
const tDots = document.getElementById("tDots");

function renderTestimonials(){
  testimonialTrack.innerHTML = TESTIMONIALS.map((t,i)=>`
    <div class="t-card ${i===tIndex?"active":""}">
      <div class="t-stars">${"★".repeat(t.stars)}${"☆".repeat(5-t.stars)}</div>
      <p class="t-quote">"${t.quote}"</p>
      <div class="t-author">${t.name}</div>
      <div class="t-role">${t.role}</div>
    </div>
  `).join("");
  tDots.innerHTML = TESTIMONIALS.map((_,i)=>`<span class="${i===tIndex?"active":""}" data-i="${i}"></span>`).join("");
  tDots.querySelectorAll("span").forEach(dot=>{
    dot.addEventListener("click", ()=>{ tIndex = Number(dot.dataset.i); renderTestimonials(); });
  });
}
document.getElementById("tPrev").addEventListener("click", ()=>{
  tIndex = (tIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
  renderTestimonials();
});
document.getElementById("tNext").addEventListener("click", ()=>{
  tIndex = (tIndex + 1) % TESTIMONIALS.length;
  renderTestimonials();
});
setInterval(()=>{
  tIndex = (tIndex + 1) % TESTIMONIALS.length;
  renderTestimonials();
}, 6000);

/* ----------------------- 11. FAQ ACCORDION ----------------------- */
const FAQS = [
  { q:"How fast will I receive my license after paying?", a:"Instantly. The moment your payment is confirmed, your license key and download link are shown on screen and emailed to you." },
  { q:"Can I use one license on multiple devices?", a:"It depends on the product — most listings support 1–5 devices. Device limits are shown on each product's detail page." },
  { q:"What if I need a refund?", a:"Unused licenses can be refunded within 7 days of purchase. Reach out to support with your Order ID and we'll sort it out." },
  { q:"Do you offer business or bulk licensing?", a:"Yes — contact our sales team for volume pricing on 10+ seats of any product in the catalog." },
  { q:"Is my payment information safe?", a:"Yes. All payments are processed through Razorpay's PCI-DSS compliant checkout — we never see or store your card details." }
];
const faqList = document.getElementById("faqList");
faqList.innerHTML = FAQS.map((f,i)=>`
  <div class="faq-item" data-i="${i}">
    <button class="faq-q">${f.q} <i class="fa-solid fa-plus"></i></button>
    <div class="faq-a"><p>${f.a}</p></div>
  </div>
`).join("");
faqList.querySelectorAll(".faq-item").forEach(item=>{
  const q = item.querySelector(".faq-q");
  const a = item.querySelector(".faq-a");
  q.addEventListener("click", ()=>{
    const isOpen = item.classList.contains("open");
    faqList.querySelectorAll(".faq-item").forEach(i=>{
      i.classList.remove("open");
      i.querySelector(".faq-a").style.maxHeight = null;
    });
    if(!isOpen){
      item.classList.add("open");
      a.style.maxHeight = a.scrollHeight + "px";
    }
  });
});

/* ----------------------- 12. NEWSLETTER ----------------------- */
document.getElementById("newsletterForm").addEventListener("submit", e=>{
  e.preventDefault();
  document.getElementById("newsletterMsg").textContent = "Thanks! You're on the list.";
  e.target.reset();
});

/* ----------------------- 13. INIT ----------------------- */
renderCategoryList();
renderGrid();
renderCart();
renderTestimonials();
