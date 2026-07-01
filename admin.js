/* ===========================================================
   NEBULA STORE — admin.js
   Demo admin panel. Auth + all data persistence use localStorage.
   PRODUCTION NOTE: a real deployment needs a backend + database
   (Node.js + MongoDB/MySQL) and server-side authentication —
   localStorage is per-browser only and not secure for real admin use.
   =========================================================== */

const ADMIN_CREDENTIALS = { username: "admin", password: "admin123" };

let products = loadProducts();

/* ----------------------- LOGIN ----------------------- */
const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

function isLoggedIn(){ return sessionStorage.getItem("nebula_admin_session") === "true"; }

function showApp(){
  loginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");
  renderDashboard();
  renderProductsTable();
  renderOrdersTable();
  renderCustomersTable();
}

if(isLoggedIn()) showApp();

loginForm.addEventListener("submit", e=>{
  e.preventDefault();
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  if(user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password){
    sessionStorage.setItem("nebula_admin_session", "true");
    loginError.textContent = "";
    showApp();
  } else {
    loginError.textContent = "Incorrect username or password.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", ()=>{
  sessionStorage.removeItem("nebula_admin_session");
  adminApp.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
});

/* ----------------------- TAB NAVIGATION ----------------------- */
document.querySelectorAll(".admin-nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".admin-nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-tab").forEach(t=>t.classList.add("hidden"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

/* ----------------------- DASHBOARD ----------------------- */
function getOrders(){ return JSON.parse(localStorage.getItem("nebula_orders") || "[]"); }
function getCustomers(){ return JSON.parse(localStorage.getItem("nebula_customers") || "[]"); }

function renderDashboard(){
  const orders = getOrders();
  const customers = getCustomers();
  const totalSales = orders.reduce((sum,o)=>sum + (o.total||0), 0);

  document.getElementById("statSales").textContent = `₹${totalSales.toLocaleString("en-IN")}`;
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statCustomers").textContent = customers.length;
  document.getElementById("statProducts").textContent = products.length;

  const chart = document.getElementById("revenueChart");
  const recent = orders.slice(-7);
  if(recent.length === 0){
    chart.innerHTML = `<p class="rev-empty">No orders yet — the chart fills in as sales come through.</p>`;
    return;
  }
  const max = Math.max(...recent.map(o=>o.total), 1);
  chart.innerHTML = recent.map(o=>{
    const heightPct = Math.max((o.total / max) * 100, 6);
    const dateLabel = new Date(o.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
    return `
      <div class="rev-bar-wrap">
        <div class="rev-bar" style="height:${heightPct}%" title="₹${o.total.toLocaleString("en-IN")}"></div>
        <span class="rev-bar-label">${dateLabel}</span>
      </div>
    `;
  }).join("");
}

/* ----------------------- MANAGE SOFTWARE ----------------------- */
const productsTableBody = document.getElementById("productsTableBody");

function renderProductsTable(){
  productsTableBody.innerHTML = products.map(p=>`
    <tr data-id="${p.id}">
      <td><div class="table-icon" style="background:${gradientFor(p.id)}"><i class="fa-solid ${p.icon}"></i></div></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>₹${p.price.toLocaleString("en-IN")}</td>
      <td><i class="fa-solid fa-star" style="color:var(--orange)"></i> ${p.rating.toFixed(1)}</td>
      <td>
        <div class="row-actions">
          <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join("");

  productsTableBody.querySelectorAll("tr").forEach(row=>{
    const id = Number(row.dataset.id);
    row.querySelector(".edit-btn").addEventListener("click", ()=>openProductModal(id));
    row.querySelector(".delete-btn").addEventListener("click", ()=>deleteProduct(id));
  });
}

function deleteProduct(id){
  if(!confirm("Remove this software from the catalog?")) return;
  products = products.filter(p=>p.id !== id);
  saveProducts(products);
  renderProductsTable();
  renderDashboard();
}

/* Product add/edit modal */
const productOverlay = document.getElementById("productOverlay");
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const productModalTitle = document.getElementById("productModalTitle");

function openProductModal(id){
  productForm.reset();
  if(id){
    const p = products.find(p=>p.id === id);
    productModalTitle.textContent = "Edit software";
    document.getElementById("prodId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodCategory").value = p.category;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("prodDesc").value = p.desc;
    document.getElementById("prodIcon").value = p.icon;
  } else {
    productModalTitle.textContent = "Add software";
    document.getElementById("prodId").value = "";
  }
  productOverlay.classList.add("show");
  productModal.classList.add("open");
}
function closeProductModal(){
  productOverlay.classList.remove("show");
  productModal.classList.remove("open");
}
document.getElementById("addProductBtn").addEventListener("click", ()=>openProductModal(null));
document.getElementById("productModalClose").addEventListener("click", closeProductModal);
productOverlay.addEventListener("click", closeProductModal);

productForm.addEventListener("submit", e=>{
  e.preventDefault();
  const idVal = document.getElementById("prodId").value;
  const name = document.getElementById("prodName").value.trim();
  const category = document.getElementById("prodCategory").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const desc = document.getElementById("prodDesc").value.trim();
  const icon = document.getElementById("prodIcon").value.trim() || "fa-cube";

  if(idVal){
    const p = products.find(p=>p.id === Number(idVal));
    Object.assign(p, { name, category, price, desc, icon });
  } else {
    products.push({
      id: nextProductId(products),
      name, category, price, desc, icon,
      rating: 4.5, reviews: 0, popularity: 50,
      added: new Date().toISOString().slice(0,10)
    });
  }
  saveProducts(products);
  renderProductsTable();
  renderDashboard();
  closeProductModal();
});

/* ----------------------- ORDERS TABLE ----------------------- */
function renderOrdersTable(){
  const orders = getOrders().slice().reverse();
  const body = document.getElementById("ordersTableBody");
  document.getElementById("ordersEmpty").classList.toggle("hidden", orders.length !== 0);

  body.innerHTML = orders.map(o=>{
    const softwareList = (o.items||[]).map(i=>`${i.name} ×${i.qty}`).join(", ");
    const dateLabel = new Date(o.date).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
    return `
      <tr>
        <td><span style="font-family:var(--font-mono); font-size:.78rem;">${o.id}</span></td>
        <td>${o.customer?.name || "—"}</td>
        <td>${o.customer?.mobile || "—"}</td>
        <td>${o.customer?.email || "—"}</td>
        <td>${softwareList}</td>
        <td>₹${(o.total||0).toLocaleString("en-IN")}</td>
        <td><span class="status-pill">${o.status || "Paid"}</span></td>
        <td>${dateLabel}</td>
      </tr>
    `;
  }).join("");
}

/* ----------------------- CUSTOMERS TABLE ----------------------- */
function renderCustomersTable(){
  const customers = getCustomers().slice().reverse();
  const body = document.getElementById("customersTableBody");
  document.getElementById("customersEmpty").classList.toggle("hidden", customers.length !== 0);

  body.innerHTML = customers.map(c=>`
    <tr>
      <td>${c.name}</td>
      <td>${c.mobile}</td>
      <td>${c.email}</td>
      <td>${new Date(c.since).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
    </tr>
  `).join("");
}
