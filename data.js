/* ===========================================================
   NEBULA STORE — data.js
   Shared product catalog + localStorage helpers, used by both
   the storefront (script.js) and the admin panel (admin.js).
   =========================================================== */

const DEFAULT_PRODUCTS = [
  { id: 1,  name: "SecureGuard Antivirus Pro",     category: "Security",            price: 1499, rating: 4.7, reviews: 812, popularity: 95, added: "2026-01-12", icon: "fa-shield-halved",  desc: "Real-time malware & ransomware protection for up to 5 devices." },
  { id: 2,  name: "DocEdit Office Suite",           category: "Productivity",        price: 2999, rating: 4.6, reviews: 1190, popularity: 98, added: "2025-11-02", icon: "fa-file-word",      desc: "Word, sheets & slides — full offline office suite, one license." },
  { id: 3,  name: "PixelCraft Photo Editor",        category: "Graphic Design",      price: 3499, rating: 4.8, reviews: 940, popularity: 92, added: "2026-02-18", icon: "fa-palette",        desc: "Pro-grade layers, masks & AI retouching for photographers." },
  { id: 4,  name: "MotionForge Video Editor",       category: "Video Editing",       price: 4999, rating: 4.7, reviews: 605, popularity: 88, added: "2026-03-04", icon: "fa-film",           desc: "Timeline editing, color grading & 4K export, made simple." },
  { id: 5,  name: "CleanSpeed PC Optimizer",        category: "Utilities",           price: 999,  rating: 4.3, reviews: 2210, popularity: 80, added: "2025-09-21", icon: "fa-gauge-high",     desc: "One-click junk cleanup, startup manager & speed boost." },
  { id: 6,  name: "VaultSync Backup & Recovery",    category: "Backup Tools",        price: 1999, rating: 4.5, reviews: 430, popularity: 70, added: "2025-12-10", icon: "fa-box-archive",    desc: "Automated, encrypted backups to local & cloud destinations." },
  { id: 7,  name: "NetShield VPN",                  category: "Privacy & Security",  price: 1299, rating: 4.6, reviews: 1740, popularity: 90, added: "2026-01-29", icon: "fa-user-shield",    desc: "No-log VPN with 60+ server locations and kill-switch." },
  { id: 8,  name: "CodeForge IDE Pro",               category: "Developer Tools",     price: 2499, rating: 4.8, reviews: 1530, popularity: 96, added: "2026-02-02", icon: "fa-code",           desc: "Smart autocomplete, debugging & Git tools for every stack." },
  { id: 9,  name: "SoundWave Audio Studio",          category: "Audio Editing",       price: 3299, rating: 4.5, reviews: 380, popularity: 65, added: "2025-10-15", icon: "fa-waveform",       desc: "Multi-track recording & mastering for podcasts and music." },
  { id: 10, name: "DriveFix Driver Updater",         category: "Utilities",           price: 799,  rating: 4.1, reviews: 990, popularity: 60, added: "2025-08-30", icon: "fa-microchip",      desc: "Scans & updates outdated drivers automatically." },
  { id: 11, name: "TaskFlow Project Manager",        category: "Productivity",        price: 2199, rating: 4.6, reviews: 720, popularity: 84, added: "2026-01-05", icon: "fa-list-check",     desc: "Boards, timelines & team collaboration in one workspace." },
  { id: 12, name: "LedgerPro Accounting Software",   category: "Business/Finance",    price: 3999, rating: 4.7, reviews: 510, popularity: 78, added: "2025-11-22", icon: "fa-chart-pie",      desc: "Invoicing, GST filing & financial reports for small business." },
  { id: 13, name: "WebCraft Website Builder",        category: "Web Design",          price: 2799, rating: 4.5, reviews: 660, popularity: 82, added: "2026-02-27", icon: "fa-globe",          desc: "Drag-and-drop site builder with responsive templates." },
  { id: 14, name: "RenderMax 3D Studio",             category: "3D & CAD",            price: 5999, rating: 4.9, reviews: 290, popularity: 75, added: "2026-03-10", icon: "fa-cube",           desc: "Industry-grade 3D modeling, sculpting & photoreal rendering." },
  { id: 15, name: "DataMiner Recovery Tool",         category: "Data Recovery",       price: 1599, rating: 4.4, reviews: 845, popularity: 68, added: "2025-09-08", icon: "fa-magnifying-glass", desc: "Recover deleted files from drives, SD cards & USBs." },
  { id: 16, name: "PartitionPro Disk Manager",       category: "Utilities",           price: 899,  rating: 4.2, reviews: 530, popularity: 58, added: "2025-07-19", icon: "fa-hard-drive",     desc: "Resize, merge & manage disk partitions without data loss." },
  { id: 17, name: "ScreenCast Pro Recorder",         category: "Multimedia",          price: 1199, rating: 4.5, reviews: 1020, popularity: 86, added: "2026-01-17", icon: "fa-video",          desc: "Screen + webcam recording with built-in editor." },
  { id: 18, name: "MailSecure Client",               category: "Communication",       price: 999,  rating: 4.3, reviews: 410, popularity: 55, added: "2025-06-25", icon: "fa-envelope-open-text", desc: "Encrypted email client with smart spam filtering." },
  { id: 19, name: "ZipMaster Compression Tool",      category: "Utilities",           price: 499,  rating: 4.4, reviews: 1880, popularity: 89, added: "2025-05-30", icon: "fa-file-zipper",    desc: "Fast, secure file compression & extraction, all formats." },
  { id: 20, name: "PresentPro Slide Maker",          category: "Productivity",        price: 1799, rating: 4.5, reviews: 670, popularity: 76, added: "2026-02-11", icon: "fa-display",        desc: "Beautiful slide decks with smart layout suggestions." },
  { id: 21, name: "DBManager Pro",                   category: "Database Tools",      price: 3599, rating: 4.7, reviews: 320, popularity: 64, added: "2025-12-29", icon: "fa-database",       desc: "Visual query builder & admin tool for SQL databases." },
  { id: 22, name: "FormBuilder Suite",               category: "Business Tools",      price: 1999, rating: 4.4, reviews: 290, popularity: 60, added: "2025-08-14", icon: "fa-rectangle-list", desc: "Drag-and-drop forms, surveys & response analytics." },
  { id: 23, name: "AntiSpy Mobile Security",         category: "Mobile Security",     price: 699,  rating: 4.3, reviews: 1340, popularity: 81, added: "2026-03-01", icon: "fa-mobile-screen",  desc: "App scanning, anti-theft & privacy advisor for mobile." },
  { id: 24, name: "CloudSync Storage Manager",       category: "Cloud Tools",         price: 1399, rating: 4.5, reviews: 480, popularity: 69, added: "2025-10-02", icon: "fa-cloud",          desc: "Unify Drive, Dropbox & OneDrive into one synced folder." },
  { id: 25, name: "AI Assist Writer Pro",            category: "AI Productivity",     price: 2999, rating: 4.8, reviews: 1660, popularity: 99, added: "2026-03-20", icon: "fa-feather",        desc: "AI writing, rewriting & grammar assistant for every doc." }
];

// Products live in localStorage so the admin panel's Add/Edit/Delete
// actions are picked up by the storefront immediately.
function loadProducts(){
  const stored = localStorage.getItem("nebula_products");
  if(stored){
    try { return JSON.parse(stored); } catch(e){ /* fall through to defaults */ }
  }
  localStorage.setItem("nebula_products", JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}
function saveProducts(products){
  localStorage.setItem("nebula_products", JSON.stringify(products));
}
function nextProductId(products){
  return products.length ? Math.max(...products.map(p=>p.id)) + 1 : 1;
}

// Cycle of icon-tile gradients so cards feel varied, not flat.
const ICON_GRADIENTS = [
  "linear-gradient(135deg,#7C5CFC,#3FA9FF)",
  "linear-gradient(135deg,#1FC8A6,#34E0E0)",
  "linear-gradient(135deg,#FF8A4C,#FF5E5E)",
  "linear-gradient(135deg,#3FA9FF,#7C5CFC)",
  "linear-gradient(135deg,#34E0E0,#1FC8A6)"
];
function gradientFor(id){ return ICON_GRADIENTS[id % ICON_GRADIENTS.length]; }
