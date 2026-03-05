
(function () {
  const STORAGE_KEY = "vms_state_v2";
  const ROLE_TO_DASH = {
    admin: "../dashboards/admin.html",
    client: "../dashboards/client.html",
    technician: "../dashboards/technician.html",
    "service-manager": "../dashboards/service-manager.html",
    "stock-keeper": "../dashboards/stock-keeper.html",
    "finance-manager": "../dashboards/finance-manager.html",
    "data-analyst": "../dashboards/data-analyst.html",
    "general-manager": "../dashboards/general-manager.html",
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Handle any errors here
    }
    return null;
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function seed() {
    const s = {
      currentUser: null,
      users: [
        { email: "admin@vms.com", password: "password", role: "admin", name: "Admin User" },
        { email: "client@vms.com", password: "password", role: "client", name: "Jane Doe" },
        { email: "tech@vms.com", password: "password", role: "technician", name: "Mike Thompson" },
      ],
      inventory: [
        { sku: "OIL-5W30", name: "Synthetic Oil 5W-30", category: "Fluids", qty: 45, unit: "L", price: 8.5, reorder: 20 },
        { sku: "BP-1002", name: "Brake Pads (Front)", category: "Brakes", qty: 2, unit: "Units", price: 45, reorder: 15 },
        { sku: "SP-102", name: "Spark Plugs (Set)", category: "Ignition", qty: 24, unit: "Sets", price: 12, reorder: 10 },
      ],
      workOrders: [
        {
          id: "WO-4592", vehicle: "2019 Toyota Camry", license: "CAM-112", service: "Engine Diagnostics", status: "In Progress", priority: "High", complaint: "Check engine light is on, and the car shudders when accelerating above 40 mph.", notes: [
            { at: "Oct 24, 10:30 AM", text: "Scanned OBD-II, pulled code P0301 (Cylinder 1 Misfire). Inspecting spark plugs and ignition coil." }
          ]
        },
        { id: "WO-4595", vehicle: "2021 Ford Bronco", license: "XYZ-1234", service: "Brake Pad Rep.", status: "Waiting on Parts", priority: "Medium", complaint: "Grinding noise while braking." },
      ],
      appointments: [],
      payments: [],
    };
    saveState(s);
    return s;
  }
  function state() { return loadState() || seed(); }

  function toast(msg) {
    try {
      if (window.bootstrap) {
        const wrap = document.createElement("div");
        wrap.className = "toast-container position-fixed bottom-0 end-0 p-3";
        wrap.style.zIndex = 99999;
        wrap.innerHTML = `
          <div class="toast align-items-center border-0 glass-toast custom-toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
              <div class="toast-body fw-semibold">${msg}</div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        const t = wrap.querySelector(".toast");
        const bs = new bootstrap.Toast(t, { delay: 2200 });
        bs.show();
        t.addEventListener("hidden.bs.toast", () => wrap.remove());
      } else {
        alert(msg);
      }
    } catch { alert(msg); }
  }

  function dashboardHref() {
    const s = state();
    const role = s.currentUser?.role || "admin";
    return ROLE_TO_DASH[role] || ROLE_TO_DASH.admin;
  }

  function addDashboardButton() {
    // Skip adding dashboard button on authentication pages
    const authPages = [/login\.html$/, /register\.html$/, /forgot-password\.html$/, /change-password\.html$/];
    if (authPages.some(p => p.test(location.pathname))) return;
    if (document.querySelector(".global-home-btn")) return;
    const a = document.createElement("a");
    a.className = "global-home-btn";
    a.href = dashboardHref();
    a.title = "Back to Dashboard";
    a.setAttribute("aria-label", "Back to Dashboard");
    a.innerHTML = '<i class="bi bi-speedometer2"></i>';
    document.body.appendChild(a);
  }

  function wireTheme() {
    const btn = document.getElementById("themeSwitch");
    if (!btn) return;
    const k = "vms_theme";
    const saved = localStorage.getItem(k);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(k, next);
    });
  }


  function wireLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const selectedRole = form.querySelector("#roleSelect")?.value || "admin";

      const s = state();
      s.currentUser = {
        email: "demo@vms.com",
        name: "Demo User",
        role: selectedRole
      };
      saveState(s);

      const dashUrl = ROLE_TO_DASH[selectedRole] || ROLE_TO_DASH.admin;

      toast("Logged in!");
      setTimeout(() => location.href = dashUrl, 250);
    });
  }
  function wireRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll("input");
      const first = inputs[0]?.value?.trim() || "User";
      const last = inputs[1]?.value?.trim() || "";
      const email = inputs[2]?.value?.trim() || "";
      const p1 = inputs[3]?.value || "";
      const p2 = inputs[4]?.value || "";
      if (p1 !== p2) { toast("Passwords do not match."); return; }

      const s = state();
      if (s.users.some(u => u.email.toLowerCase() === email.toLowerCase())) { toast("Email already exists."); return; }
      s.users.push({ email, password: p1, role: "client", name: `${first} ${last}`.trim() });
      saveState(s);
      toast("Account created. Please login.");
      setTimeout(() => location.href = "login.html", 250);
    });
  }

  // ---- Work Orders ----
  function wireWorkOrders() {
    const table = document.getElementById("workOrdersTable");
    const search = document.getElementById("woSearch");
    if (!table || !search) return;

    const s = state();

    function priBadge(p) { return p === "High" ? "bg-danger" : (p === "Medium" ? "bg-warning text-dark" : "bg-secondary"); }
    function stBadge(st) { return st === "In Progress" ? "bg-primary" : (st === "Waiting on Parts" ? "bg-warning text-dark" : "bg-secondary"); }

    function render(rows) {
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = rows.map(wo => `
        <tr>
          <td>#${wo.id}</td>
          <td>${wo.vehicle}</td>
          <td>${wo.service}</td>
          <td><span class="badge ${priBadge(wo.priority)}">${wo.priority}</span></td>
          <td><span class="badge ${stBadge(wo.status)}">${wo.status}</span></td>
          <td><a class="btn btn-sm btn-outline-primary" href="work-order-details.html?wo=${encodeURIComponent(wo.id)}">Open</a></td>
        </tr>
      `).join("");
    }

    render(s.workOrders);

    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      render(s.workOrders.filter(w =>
        w.id.toLowerCase().includes(q) ||
        w.vehicle.toLowerCase().includes(q) ||
        w.service.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q)
      ));
    });
  }

  function wireWorkOrderDetails() {
    if (!location.pathname.includes("work-order-details.html")) return;
    const s = state();
    const url = new URL(location.href);
    const id = url.searchParams.get("wo") || "WO-4592";
    const wo = s.workOrders.find(w => w.id === id) || s.workOrders[0];
    if (!wo) return;

    // Header title "WO-xxxx Details"
    const header = document.querySelector(".topbar h5");
    if (header) header.innerHTML = `<a href="work-orders.html" class="text-decoration-none text-muted me-3"><i class="bi bi-arrow-left"></i></a>${wo.id} Details`;

    // Service title
    const title = document.querySelector("h4.fw-bold");
    if (title) title.textContent = wo.service;

    // Vehicle info
    const info = document.querySelectorAll(".row.mb-4 .col-sm-4 strong");
    if (info.length >= 2) {
      info[0].textContent = wo.vehicle;
      info[1].textContent = wo.license || "-";
    }

    // Complaint
    const complaint = document.querySelector("p.bg-light-subtle");
    if (complaint) complaint.textContent = `"${wo.complaint || "No complaint provided."}"`;

    // Notes render
    const notesArea = document.querySelector("h6:contains('Technician Notes')");
    const container = document.querySelector(".card-body");
    const existingAlerts = container ? container.querySelectorAll(".alert.alert-secondary") : [];
    if (container && existingAlerts.length) {
      const wrap = existingAlerts[0].parentElement;
      wrap.innerHTML = (wo.notes || []).map(n => `<div class="alert alert-secondary"><strong>${n.at}:</strong> ${n.text}</div>`).join("") || `<div class="alert alert-light border">No notes yet.</div>`;
    }

    // Mark complete
    const btn = document.querySelector(".btn.btn-success");
    if (btn) {
      btn.addEventListener("click", () => {
        wo.status = "Completed";
        saveState(s);
        toast("Work order completed.");
        setTimeout(() => location.href = "work-orders.html", 250);
      });
    }
  }

  // ---- Appointments ----
  function wireAppointments() {
    const form = document.getElementById("appointmentForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const s = state();
      const fields = form.querySelectorAll("input, select, textarea");
      const data = {};
      fields.forEach(el => {
        if (!el.name && !el.id) return;
        const key = el.name || el.id;
        if (el.type === "checkbox") data[key] = el.checked;
        else data[key] = el.value;
      });
      s.appointments.push({ at: new Date().toISOString(), ...data });
      saveState(s);
      toast("Appointment booked (demo).");
      setTimeout(() => location.href = ROLE_TO_DASH.client, 250);
    });
  }

  // ---- Payments (demo) ----
  function wirePayments() {
    const form = document.getElementById("paymentForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const s = state();
      s.payments.push({ at: new Date().toISOString(), amount: "demo" });
      saveState(s);
      toast("Payment processed (demo).");
      setTimeout(() => location.href = ROLE_TO_DASH.client, 250);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.classList.contains("vms-app")) document.body.classList.add("vms-app");
    addDashboardButton();
    wireTheme();

    wireLogin();
    wireRegister();

    wireWorkOrders();
    wireWorkOrderDetails();

    wireAppointments();
    wirePayments();
  });
})();


/* ===== GLOBAL_BACK_BUTTON_V1: universal Back button (bottom-left) ===== */
(function () {
  function addGlobalBackButton() {
    // Do not add back button on authentication pages or dashboard homepages
    const authPages = [/login\.html$/, /register\.html$/, /forgot-password\.html$/, /change-password\.html$/];
    const isDashboard = location.pathname.includes('/dashboards/');
    if (isDashboard || authPages.some(p => p.test(location.pathname))) return;

    // Don't add twice
    if (document.querySelector('.global-back-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'global-back-btn';
    btn.setAttribute('aria-label', 'Back');
    btn.title = 'Back';

    btn.innerHTML = '<i class="bi bi-arrow-left"></i>';

    btn.addEventListener('click', () => {
      // If there is no history, fallback to dashboard
      if (window.history.length > 1) window.history.back();
      else {
        // Try to go to dashboard button href if present
        const dash = document.querySelector('.global-home-btn');
        if (dash && dash.getAttribute('href')) location.href = dash.getAttribute('href');
        else location.href = (location.pathname.includes('/inventory/') ? '../dashboards/stock-keeper.html'
          : location.pathname.includes('/technician/') ? '../dashboards/technician.html'
            : location.pathname.includes('/client/') ? '../dashboards/client.html'
              : '../dashboards/admin.html');
      }
    });

    document.body.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', addGlobalBackButton);
})();
