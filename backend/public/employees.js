(function () {
  const PAGE_SIZE = 8;
  const ADMIN_SESSION_KEY = "gms-admin-session";
  const ADMIN_SCOPE_KEY = "gms-admin-id";
  const ICONS = Object.freeze({
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-icon lucide-users" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-check-icon lucide-user-check" aria-hidden="true"><path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-range-icon lucide-calendar-range" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 2v3"/><path d="M3 9h18"/><path d="M8 2v3"/><path d="M17 13h-6"/><path d="M13 17H7"/><path d="M7 13h.01"/><path d="M17 17h.01"/></svg>',
    userX: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-x-icon lucide-user-x" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
  });

  const refs = {
    summary: document.querySelector("[data-employee-summary]"),
    list: document.querySelector("[data-employee-list]"),
    pagination: document.querySelector("[data-employee-pagination]"),
    search: document.querySelector("[data-employee-search]"),
    statusFilter: document.querySelector("[data-employee-status-filter]"),
    departmentFilter: document.querySelector("[data-employee-department-filter]"),
    addButton: document.querySelector("[data-employee-add]"),
    drawerOverlay: document.querySelector("[data-employee-drawer-overlay]"),
    drawer: document.querySelector("[data-employee-drawer]"),
    drawerContent: document.querySelector("[data-employee-drawer-content]"),
    drawerClose: document.querySelector("[data-employee-drawer-close]"),
    modalOverlay: document.querySelector("[data-employee-modal-overlay]"),
    modalClose: document.querySelector("[data-employee-modal-close]"),
    modalCancel: document.querySelector("[data-employee-modal-cancel]"),
    modalTitle: document.getElementById("employee-modal-title"),
    modalSubtitle: document.querySelector("[data-employee-modal-subtitle]"),
    form: document.querySelector("[data-employee-form]"),
    submit: document.querySelector("[data-employee-submit]"),
    feedback: document.querySelector("[data-employee-form-feedback]"),
    statusCopy: document.querySelector("[data-employee-status-copy]"),
    documentInput: document.querySelector("[data-employee-document-input]"),
    documentFileName: document.querySelector("[data-employee-document-file-name]"),
    toast: document.querySelector("[data-employee-toast]"),
  };

  let accounts = [];
  let searchTerm = "";
  let statusFilter = "all";
  let departmentFilter = "all";
  let currentPage = 1;
  let selectedAccountId = "";
  let editingAccountId = "";
  let requestInFlight = false;
  let accountsRenderSignature = "";
  let toastTimer = 0;
  let searchTimer = 0;
  let employeeControlSequence = 0;
  let activeEmployeeDropdown = null;
  let activeEmployeeDatePicker = null;
  const employeeSelectControls = [];
  const employeeDateControls = [];
  const employeePageParams = new URLSearchParams(window.location.search);
  const isMainEmployeesEmbedded = employeePageParams.get("main_employees") === "1";
  const isMainEmployeesDrawerPortal = employeePageParams.get("main_employees_drawer") === "1";
  const requestedDrawerEmployeeId = normalizeText(employeePageParams.get("employee_id"));
  let requestedDrawerOpened = false;

  if (isMainEmployeesEmbedded) {
    document.documentElement.classList.add("main-employees-embedded");
    document.body.classList.add("main-employees-embedded");
  }

  function syncWorkspaceColorFromSuperAdmin() {
    let savedColor = "";
    try {
      savedColor = String(window.localStorage?.getItem("gms-workspace-color") || "").trim().toLowerCase();
    } catch (error) {
      savedColor = "";
    }

    const root = document.documentElement;
    const fallbackColor = String(
      getComputedStyle(root).getPropertyValue("--employee-accent") || "#08989d",
    ).trim();
    const color = /^#[0-9a-f]{6}$/i.test(savedColor) ? savedColor : fallbackColor;
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) {
      return;
    }

    const rgb = match.slice(1).map((part) => String(Number.parseInt(part, 16))).join(", ");
    const contrast = color === "#ffffff" ? "#000000" : "#ffffff";

    root.style.setProperty("--employee-accent", color);
    root.style.setProperty("--employee-accent-dark", color);
    root.style.setProperty("--employee-accent-rgb", rgb);
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-rgb", rgb);
    root.style.setProperty("--accent-strong", color);
    root.style.setProperty("--accent-text", color);
    root.style.setProperty("--accent-button-bg", color);
    root.style.setProperty("--accent-button-hover-bg", color);
    root.style.setProperty("--accent-contrast", contrast);
    root.style.setProperty("--table-row-hover-bg", `rgba(${rgb}, 0.055)`);
    root.style.setProperty(
      "--table-row-hover-shadow",
      `inset 3px 0 0 rgba(${rgb}, 0.55)`,
    );
  }

  function readJsonStorage(storage, key) {
    try {
      const value = storage?.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function getAdminId() {
    const session = readJsonStorage(window.sessionStorage, ADMIN_SESSION_KEY) || {};
    return String(
      session.adminId || session.ownerAdminId || session.tenantId || session.id ||
      window.localStorage?.getItem(ADMIN_SCOPE_KEY) || "",
    ).trim();
  }

  function withAdminHeaders(headers = {}) {
    const adminId = getAdminId();
    return adminId ? { ...headers, "X-GMS-Admin-ID": adminId } : { ...headers };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function getAccountId(account) {
    return normalizeText(account?.id || account?.accountCode || account?.employeeId);
  }

  function getAccountsRenderSignature(list) {
    return (Array.isArray(list) ? list : [])
      .map((account) => [
        getAccountId(account),
        String(account?.updatedAt || "").trim(),
        String(account?.createdAt || "").trim(),
        String(account?.status || "").trim(),
        String(account?.firstName || "").trim(),
        String(account?.middleName || "").trim(),
        String(account?.lastName || "").trim(),
        String(account?.email || "").trim(),
        String(account?.phone || account?.contactNumber || "").trim(),
        String(account?.position || "").trim(),
        String(account?.department || "").trim(),
        String(account?.profileImageUrl || "").trim(),
        String(account?.employeeId || account?.accountCode || "").trim(),
        String(account?.dateHired || account?.hiredAt || "").trim(),
        String(account?.faceVerified ?? "").trim(),
      ].join("\u001f"))
      .join("\u001e");
  }

  function getEmployeeName(account) {
    return normalizeText([
      account?.firstName,
      account?.middleName,
      account?.lastName,
      account?.suffix,
    ].filter(Boolean).join(" ")) || normalizeText(account?.employeeId) || "Employee";
  }

  function getEmployeeInitials(account) {
    const parts = getEmployeeName(account).split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || "E"}${parts.length > 1 ? parts.at(-1)?.[0] || "" : ""}`.toUpperCase();
  }

  function getEmployeeDepartment(account) {
    const direct = normalizeText(account?.department);
    if (direct) {
      return direct;
    }
    const attendance = account?.face_attendance_lh?.attendanceRecords || account?.face_attendance_lh?.attendance_records;
    const fromAttendance = Array.isArray(attendance)
      ? normalizeText([...attendance].reverse().find((entry) => normalizeText(entry?.department))?.department)
      : "";
    if (fromAttendance) {
      return fromAttendance;
    }
    const position = normalizeText(account?.position).toLowerCase();
    if (position.includes("pack") || position.includes("inventory") || position.includes("warehouse")) return "Warehouse";
    if (position.includes("market")) return "Marketing";
    if (position.includes("sale")) return "Sales";
    if (position.includes("account") || position.includes("finance")) return "Finance";
    if (position.includes("support")) return "Customer Support";
    if (position.includes("human") || position === "hr") return "HR";
    if (position.includes("it ") || position.startsWith("it") || position.includes("developer")) return "IT";
    return normalizeText(account?.position) || "Operations";
  }

  function getEmployeeStatus(account) {
    const value = normalizeText(account?.status || account?.accountStatus).toLowerCase().replace(/\s+/g, "-");
    if (["inactive", "disabled", "deactivated"].includes(value) || account?.isActive === false) return "inactive";
    if (["on-leave", "leave"].includes(value)) return "on-leave";
    if (["probation", "probationary"].includes(value)) return "probation";
    return "active";
  }

  function getEmployeeStatusLabel(status) {
    return ({ active: "", inactive: "Inactive", "on-leave": "On Leave", probation: "Probation" })[status] || "";
  }

  function getHireDateValue(account) {
    return account?.startDate || account?.dateHired || account?.createdAt || "";
  }

  function formatDate(value, fallback = "Not provided") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatPhone(account) {
    const digits = String(account?.mobileNumber || "").replace(/\D/g, "");
    const local = digits.startsWith("63") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
    if (local.length === 10) {
      return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return normalizeText([account?.countryCode, digits].filter(Boolean).join(" ")) || "No phone";
  }

  function formatTime(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "Not set";
    const hours = Number(match[1]);
    const minutes = match[2];
    return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
  }

  function addScheduleHours(value, hoursToAdd = 9) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const total = ((Number(match[1]) * 60) + Number(match[2]) + (hoursToAdd * 60)) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function createAvatar(account, className = "") {
    const avatar = document.createElement("span");
    avatar.className = `employee-avatar${className ? ` ${className}` : ""}`;
    const imageUrl = String(account?.profileImageUrl || "").trim();
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        avatar.replaceChildren(document.createTextNode(getEmployeeInitials(account)));
      }, { once: true });
      avatar.appendChild(image);
    } else {
      avatar.textContent = getEmployeeInitials(account);
    }
    return avatar;
  }

  function getSummaryData() {
    const total = accounts.length;
    const active = accounts.filter((account) => getEmployeeStatus(account) === "active").length;
    const onLeave = accounts.filter((account) => getEmployeeStatus(account) === "on-leave").length;
    const inactive = accounts.filter((account) => getEmployeeStatus(account) === "inactive").length;
    const now = new Date();
    const newThisMonth = accounts.filter((account) => {
      const date = new Date(account?.createdAt || account?.startDate || "");
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const percent = (value) => total ? `${((value / total) * 100).toFixed(1)}% of workforce` : "0% of workforce";
    return [
      { key: "total", label: "Total Employees", value: total, note: "100% of workforce", icon: ICONS.users },
      { key: "active", label: "Active", value: active, note: percent(active), icon: ICONS.check },
      { key: "leave", label: "On Leave", value: onLeave, note: percent(onLeave), icon: ICONS.clock },
      { key: "inactive", label: "Inactive", value: inactive, note: percent(inactive), icon: ICONS.userX },
      { key: "new", label: "New This Month", value: newThisMonth, note: percent(newThisMonth), icon: ICONS.userPlus },
    ];
  }

  function renderSummary() {
    if (!refs.summary) {
      return;
    }

    const toneMap = {
      total: "total",
      active: "active",
      leave: "leave",
      inactive: "inactive",
      new: "new",
    };
    const cards = getSummaryData().map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: entry.value,
      note: entry.note,
      icon: entry.icon,
      tone: toneMap[entry.key] || entry.key,
    }));

    refs.summary.classList.add("super-admin-stats", "employee-summary");
    if (window.GmsAdminSummaryCards?.render) {
      window.GmsAdminSummaryCards.render(refs.summary, cards);
      return;
    }

    refs.summary.replaceChildren(...cards.map((entry) => {
      const card = document.createElement("article");
      card.className = "employee-summary-card";
      card.dataset.adminSummaryTone = entry.tone;
      card.innerHTML = `<span class="employee-summary-card__icon">${entry.icon}</span><span class="employee-summary-card__copy"><span>${escapeHtml(entry.label)}</span><strong>${entry.value}</strong><small>${escapeHtml(entry.note)}</small></span>`;
      return card;
    }));
  }

  function getFilteredAccounts() {
    const normalizedQuery = searchTerm.toLowerCase();
    return accounts.filter((account) => {
      const status = getEmployeeStatus(account);
      const department = getEmployeeDepartment(account);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (departmentFilter !== "all" && department.toLowerCase() !== departmentFilter) return false;
      if (!normalizedQuery) return true;
      return [
        account?.employeeId,
        account?.accountCode,
        getEmployeeName(account),
        account?.email,
        account?.mobileNumber,
        department,
        account?.position,
      ].some((value) => normalizeText(value).toLowerCase().includes(normalizedQuery));
    });
  }

  function createIconButton(label, icon, action, accountId, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `employee-icon-button${danger ? " is-danger" : ""}`;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.dataset.employeeAction = action;
    button.dataset.employeeId = accountId;
    button.innerHTML = icon;
    return button;
  }

    function createEmployeeRow(account) {
    const accountId = getAccountId(account);
    const row = document.createElement("article");
    row.className = "employee-table employee-row";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `View ${getEmployeeName(account)}`);
    row.dataset.employeeId = accountId;

    const check = document.createElement("span");
    check.setAttribute("aria-hidden", "true");
    const id = document.createElement("span");
    id.className = "employee-row__id";
    id.dataset.label = "Employee ID";
    id.textContent = normalizeText(account.employeeId || account.accountCode || account.id) || "-";
    const person = document.createElement("div");
    person.className = "employee-row__person";
    person.appendChild(createAvatar(account));
    const personCopy = document.createElement("span");
    personCopy.className = "employee-row__person-copy";
    const name = document.createElement("strong");
    name.textContent = getEmployeeName(account);
    const email = document.createElement("small");
    email.textContent = normalizeText(account.email) || "No email";
    personCopy.append(name, email);
    person.appendChild(personCopy);

    const department = document.createElement("span");
    department.className = "employee-row__department";
    department.dataset.label = "Department";
    department.textContent = getEmployeeDepartment(account);
    const position = document.createElement("span");
    position.className = "employee-row__position";
    position.dataset.label = "Position";
    position.textContent = normalizeText(account.position) || "Employee";
    const contact = document.createElement("span");
    contact.className = "employee-row__contact";
    contact.dataset.label = "Contact";
    contact.textContent = formatPhone(account);
    const date = document.createElement("span");
    date.className = "employee-row__date";
    date.dataset.label = "Date Hired";
    date.textContent = formatDate(getHireDateValue(account));
    const status = getEmployeeStatus(account);
    const statusCell = document.createElement("span");
    statusCell.appendChild(createStatusPill(status));
    const actions = document.createElement("div");
    actions.className = "employee-row__actions";
    actions.append(
      createIconButton(`View ${getEmployeeName(account)}`, ICONS.eye, "view", accountId),
      createIconButton(`Edit ${getEmployeeName(account)}`, ICONS.edit, "edit", accountId),
      createIconButton(`Delete ${getEmployeeName(account)}`, ICONS.trash, "delete", accountId, true),
    );
    row.append(check, id, person, department, position, contact, date, statusCell, actions);
    return row;
  }

  function createStatusPill(status) {
    const pill = document.createElement("span");
    pill.className = `employee-status-pill is-${status}`;
    pill.textContent = getEmployeeStatusLabel(status);
    return pill;
  }

  function renderDepartmentOptions() {
    if (!(refs.departmentFilter instanceof HTMLSelectElement)) return;
    const previous = refs.departmentFilter.value || "all";
    const departments = Array.from(new Set(accounts.map(getEmployeeDepartment).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    refs.departmentFilter.replaceChildren();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All departments";
    refs.departmentFilter.appendChild(all);
    departments.forEach((department) => {
      const option = document.createElement("option");
      option.value = department.toLowerCase();
      option.textContent = department;
      refs.departmentFilter.appendChild(option);
    });
    refs.departmentFilter.value = Array.from(refs.departmentFilter.options).some((option) => option.value === previous) ? previous : "all";
    departmentFilter = refs.departmentFilter.value;
  }

  function renderPagination(total) {
    if (!refs.pagination) return;
    const totalItems = Math.max(0, Number(total) || 0);
    refs.pagination.replaceChildren();
    if (totalItems <= PAGE_SIZE) {
      refs.pagination.hidden = true;
      return;
    }

    refs.pagination.hidden = false;
    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), pages);
    const first = ((currentPage - 1) * PAGE_SIZE) + 1;
    const last = Math.min(totalItems, currentPage * PAGE_SIZE);
    const copy = document.createElement("span");
    copy.textContent = `Showing ${first} to ${last} of ${totalItems} employees`;
    const buttons = document.createElement("div");
    buttons.className = "employee-pagination__buttons";
    const createButton = (label, page, options = {}) => {
      const button = document.createElement("button");
      button.type = "button";
      if (options.icon) {
        button.innerHTML = label;
      } else {
        button.textContent = label;
      }
      button.disabled = options.disabled;
      button.classList.toggle("is-active", options.active === true);
      button.setAttribute("aria-label", options.ariaLabel || `Page ${page}`);
      if (options.active === true) {
        button.setAttribute("aria-current", "page");
      }
      button.addEventListener("click", () => {
        if (button.disabled || currentPage === page) return;
        currentPage = page;
        renderDirectory();
      });
      return button;
    };
    buttons.appendChild(createButton(
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
      Math.max(1, currentPage - 1),
      { disabled: currentPage === 1, ariaLabel: "Previous page", icon: true },
    ));
    Array.from({ length: pages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.max(5, currentPage + 2)).forEach((page) => {
      buttons.appendChild(createButton(String(page), page, { active: page === currentPage }));
    });
    buttons.appendChild(createButton(
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
      Math.min(pages, currentPage + 1),
      { disabled: currentPage === pages, ariaLabel: "Next page", icon: true },
    ));
    refs.pagination.append(copy, buttons);
  }

  function renderDirectory() {
    if (!refs.list) return;
    const filtered = getFilteredAccounts();
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    refs.list.replaceChildren();
    if (!visible.length) {
      const empty = searchTerm && window.GMS_ADMIN_SEARCH_NOT_FOUND
        ? window.GMS_ADMIN_SEARCH_NOT_FOUND.create({ className: "employee-empty" })
        : document.createElement("div");
      if (!empty.dataset.gmsAdminSearchNotFound) {
        const lottieEmpty = window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create?.({
          className: "employee-empty",
          label: "No employees found",
          copy: "Employee accounts will appear here once they are added.",
        });
        if (lottieEmpty) {
          refs.list.appendChild(lottieEmpty);
          renderPagination(filtered.length);
          return;
        }
        empty.className = "employee-empty";
        empty.innerHTML = `<strong>No employees found</strong><span>Adjust the current filters.</span>`;
      }
      refs.list.appendChild(empty);
    } else {
      refs.list.append(...visible.map(createEmployeeRow));
    }
    renderPagination(filtered.length);
  }

  function findAccount(accountId) {
    const normalizedId = normalizeText(accountId).toLowerCase();
    return accounts.find((account) => getAccountId(account).toLowerCase() === normalizedId) || null;
  }

  function createDetailRows(rows) {
    return `<dl class="employee-detail-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Not provided")}</dd></div>`).join("")}</dl>`;
  }

  function createEmployeeDrawerOverviewRow(iconMarkup, label, value, tone = "") {
    const row = document.createElement("div");
    row.className = "employee-drawer__overview-row";
    const icon = document.createElement("span");
    icon.className = "employee-drawer__overview-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = iconMarkup;
    const labelElement = document.createElement("span");
    labelElement.className = "employee-drawer__overview-label";
    labelElement.textContent = label;
    const chip = document.createElement("span");
    chip.className = `employee-drawer__status-chip${tone ? ` is-${tone}` : ""}`;
    chip.textContent = value || "Not provided";
    row.append(icon, labelElement, chip);
    return row;
  }

  function createEmployeeDrawerInfoRow(label, value) {
    const row = document.createElement("div");
    row.className = "employee-drawer__info-row";
    const labelElement = document.createElement("span");
    labelElement.className = "employee-drawer__info-label";
    labelElement.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.className = "employee-drawer__info-value";
    valueElement.textContent = value || "Not provided";
    row.append(labelElement, valueElement);
    return row;
  }

  function getEmployeeDrawerStatusTone(status) {
    if (status === "on-leave") return "warning";
    if (status === "inactive") return "danger";
    if (status === "probation") return "info";
    return "success";
  }

  function renderDrawer(account) {
    if (!refs.drawerContent || !account) return;
    const status = getEmployeeStatus(account);
    const statusLabel = getEmployeeStatusLabel(status);
    const documentInfo = account.eDocument && typeof account.eDocument === "object" ? account.eDocument : {};
    const documentUrl = String(documentInfo.url || documentInfo.documentUrl || "").trim();
    const email = normalizeText(account.email) || "No email";
    const phone = formatPhone(account) || "No mobile number";
    const position = normalizeText(account.position) || "Employee";
    const department = getEmployeeDepartment(account);
    const employeeId = normalizeText(account.employeeId || account.accountCode || account.id) || "-";
    refs.drawerContent.replaceChildren();

    const summary = document.createElement("div");
    summary.className = "employee-drawer__summary";
    const logoWrap = document.createElement("span");
    logoWrap.className = "employee-drawer__logo-wrap";
    const avatar = createAvatar(account, "employee-drawer__logo");
    const statusDot = document.createElement("span");
    statusDot.className = `employee-drawer__profile-status is-${getEmployeeDrawerStatusTone(status)}`;
    statusDot.title = statusLabel;
    logoWrap.append(avatar, statusDot);
    const summaryCopy = document.createElement("div");
    summaryCopy.className = "employee-drawer__summary-copy";
    const summaryName = document.createElement("strong");
    summaryName.textContent = getEmployeeName(account);
    const summaryEmail = document.createElement("span");
    summaryEmail.textContent = email;
    const summaryPhone = document.createElement("span");
    summaryPhone.textContent = phone;
    summaryCopy.append(summaryName, summaryEmail, summaryPhone);
    summary.append(logoWrap, summaryCopy);

    const overview = document.createElement("div");
    overview.className = "employee-drawer__overview";
    overview.append(
      createEmployeeDrawerOverviewRow(
        ICONS.check,
        "Account Status",
        statusLabel,
        getEmployeeDrawerStatusTone(status),
      ),
      createEmployeeDrawerOverviewRow(ICONS.users, "Position", position, "info"),
      createEmployeeDrawerOverviewRow(ICONS.file, "Department", department, "info"),
      createEmployeeDrawerOverviewRow(ICONS.edit, "Employee ID", employeeId, "info"),
    );

    const information = document.createElement("div");
    information.className = "employee-drawer__information";
    [
      ["Email", email],
      ["Phone", phone],
      ["Address", account.address],
      ["Birthday", account.dateOfBirth ? formatDate(account.dateOfBirth) : ""],
      ["Gender", account.gender],
      ["Date Hired", formatDate(getHireDateValue(account))],
      ["Shift Schedule", `${formatTime(account.timeIn)} - ${formatTime(account.timeOut)}`],
      ["Employment Type", account.employmentType || "Regular"],
      ["Role", account.employeeRole || account.position || "Employee"],
      ["Supervisor", account.supervisor],
    ].forEach(([label, value]) => {
      information.appendChild(createEmployeeDrawerInfoRow(label, value));
    });

    const documentsSection = document.createElement("section");
    documentsSection.className = "employee-drawer__section";
    const documentsHeading = document.createElement("div");
    documentsHeading.className = "employee-drawer__section-heading";
    const documentsTitle = document.createElement("h3");
    documentsTitle.textContent = "Documents";
    documentsHeading.appendChild(documentsTitle);
    const documentsList = document.createElement("div");
    documentsList.className = "employee-document-list";
    const primaryDocument = documentUrl
      ? `<a href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener">Uploaded</a>`
      : "<small>Not uploaded</small>";
    documentsList.innerHTML = `
      <div class="employee-document">${ICONS.file}<span>${escapeHtml(documentInfo.label || documentInfo.fileName || "Primary Document")}</span>${primaryDocument}</div>
      <div class="employee-document">${ICONS.file}<span>Face Verification</span><small>${account.faceVerified ? "Verified" : "Not verified"}</small></div>
      <div class="employee-document">${ICONS.file}<span>Account Credentials</span><small>Created</small></div>
      <div class="employee-document">${ICONS.file}<span>Access Profile</span><small>${Array.isArray(account.accessPermissions) ? `${account.accessPermissions.length} access` : "Default"}</small></div>
    `;
    documentsSection.append(documentsHeading, documentsList);

    const actionsSection = document.createElement("section");
    actionsSection.className = "employee-drawer__section employee-drawer__actions-section";
    const actionsHeading = document.createElement("div");
    actionsHeading.className = "employee-drawer__section-heading";
    const actionsTitle = document.createElement("h3");
    actionsTitle.textContent = "Action";
    actionsHeading.appendChild(actionsTitle);
    const actions = document.createElement("div");
    actions.className = "employee-drawer__actions-grid";
    actions.setAttribute("aria-label", `Actions for ${getEmployeeName(account)}`);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "employee-drawer__action-button";
    edit.innerHTML = `${ICONS.edit}<span>Edit Employee</span>`;
    edit.addEventListener("click", () => openEmployeeModal(account));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "employee-drawer__action-button employee-drawer__action-button--primary";
    close.innerHTML = `${ICONS.check}<span>Done</span>`;
    close.addEventListener("click", closeDrawer);
    actions.append(edit, close);
    actionsSection.append(actionsHeading, actions);

    refs.drawerContent.append(summary, overview, information, documentsSection, actionsSection);
  }

  function isEmployeesModalOpen() {
    return Boolean(refs.modalOverlay && !refs.modalOverlay.hidden);
  }

  function isEmployeesDrawerOpen() {
    return Boolean(refs.drawerOverlay && !refs.drawerOverlay.hidden);
  }

  function notifyMainEmployeesLayerState(overrides = {}) {
    if (window.parent === window) {
      return;
    }

    const modalOpen = overrides.modalOpen ?? isEmployeesModalOpen();
    const drawerOpen = overrides.drawerOpen ?? isEmployeesDrawerOpen();
    window.parent.postMessage(
      {
        type: "gms-main-employees-layer-state",
        modalOpen: Boolean(modalOpen),
        drawerOpen: Boolean(drawerOpen) && !Boolean(modalOpen),
        accountId: selectedAccountId,
      },
      window.location.origin,
    );
  }

  function syncLayerOpenState() {
    const modalOpen = isEmployeesModalOpen();
    const drawerOpen = isEmployeesDrawerOpen();
    document.body.classList.toggle("employee-layer-open", modalOpen || drawerOpen);
    document.body.classList.toggle("employee-register-modal-surface", modalOpen);
    document.body.classList.toggle("employee-drawer-surface", drawerOpen && !modalOpen);
    notifyMainEmployeesLayerState();
  }

  function openDrawer(account) {
    if (!account || !refs.drawerOverlay) return;
    const accountId = getAccountId(account);
    if (isMainEmployeesEmbedded && !isMainEmployeesDrawerPortal) {
      window.parent.postMessage(
        {
          type: "gms-main-employees-drawer-request",
          accountId,
        },
        window.location.origin,
      );
      return;
    }
    selectedAccountId = accountId;
    renderDrawer(account);
    document.body.classList.add("employee-layer-open", "employee-drawer-surface");
    document.body.classList.remove("employee-register-modal-surface");
    notifyMainEmployeesLayerState({ modalOpen: false, drawerOpen: true });
    refs.drawerOverlay.hidden = false;
    window.requestAnimationFrame(() => {
      refs.drawerOverlay.classList.add("is-open");
      refs.drawerClose?.focus({ preventScroll: true });
    });
  }

  function closeDrawer() {
    if (!refs.drawerOverlay || refs.drawerOverlay.hidden) return;
    refs.drawerOverlay.classList.remove("is-open");
    window.setTimeout(() => {
      refs.drawerOverlay.hidden = true;
      selectedAccountId = "";
      syncLayerOpenState();
    }, 190);
  }

  function generateEmployeeId() {
    const used = new Set(accounts.map((account) => normalizeText(account.employeeId).toUpperCase()));
    let value = "";
    do {
      value = `EMP-${String(Date.now() + Math.floor(Math.random() * 1000)).slice(-6)}`;
    } while (used.has(value));
    return value;
  }

  function toDateInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function syncPrimaryDocumentField(file = null, account = null) {
    const documentInfo = account?.eDocument && typeof account.eDocument === "object"
      ? account.eDocument
      : {};
    const selectedName = normalizeText(file?.name);
    const existingName = normalizeText(
      documentInfo.fileName
      || documentInfo.label
      || (documentInfo.url || documentInfo.documentUrl ? "Primary document uploaded" : ""),
    );
    const displayName = selectedName || existingName || "No file selected";
    if (refs.documentFileName) {
      refs.documentFileName.textContent = displayName;
      refs.documentFileName.title = displayName;
    }
    refs.documentInput?.classList.toggle("has-file", Boolean(selectedName || existingName));
  }

  function getEmployeeDropdownChevronMarkup() {
    return '<svg class="employee-select-dropdown__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function closeEmployeeDropdown({ restoreFocus = false } = {}) {
    const control = activeEmployeeDropdown;
    if (!control) return false;
    control.wrapper.classList.remove("is-open");
    control.trigger.setAttribute("aria-expanded", "false");
    control.menu.hidden = true;
    activeEmployeeDropdown = null;
    if (restoreFocus) control.trigger.focus({ preventScroll: true });
    return true;
  }

  function positionEmployeeDropdown(control) {
    if (!control || control.menu.hidden) return;
    const viewportPadding = 12;
    const gap = 8;
    const triggerRect = control.trigger.getBoundingClientRect();
    const maxWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
    control.menu.style.width = "max-content";
    control.menu.style.minWidth = `${Math.round(triggerRect.width)}px`;
    control.menu.style.maxWidth = `${maxWidth}px`;
    const menuWidth = Math.min(
      maxWidth,
      Math.max(triggerRect.width, control.menu.scrollWidth + 2),
    );
    control.menu.style.width = `${Math.ceil(menuWidth)}px`;
    const menuHeight = control.menu.offsetHeight;
    const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const roomAbove = triggerRect.top - viewportPadding;
    const opensUp = roomBelow < menuHeight + gap && roomAbove > roomBelow;
    const top = opensUp
      ? Math.max(viewportPadding, triggerRect.top - menuHeight - gap)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, triggerRect.bottom + gap);
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
    );
    control.menu.dataset.openDirection = opensUp ? "up" : "down";
    control.menu.style.left = `${Math.round(left)}px`;
    control.menu.style.top = `${Math.round(top)}px`;
  }

  function syncEmployeeSelectControl(control) {
    if (!control) return;
    const selectedOption = Array.from(control.select.options).find(
      (option) => option.value === control.select.value,
    ) || control.select.options[0];
    const label = normalizeText(selectedOption?.textContent) || "Select option";
    control.value.textContent = label;
    control.trigger.title = label;
    control.options.forEach((optionButton) => {
      const isSelected = optionButton.dataset.value === control.select.value;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function openEmployeeDropdown(control) {
    if (!control) return;
    if (activeEmployeeDropdown === control) {
      closeEmployeeDropdown();
      return;
    }
    closeEmployeeDropdown();
    closeEmployeeDatePicker();
    activeEmployeeDropdown = control;
    control.wrapper.classList.add("is-open");
    control.trigger.setAttribute("aria-expanded", "true");
    control.menu.hidden = false;
    positionEmployeeDropdown(control);
  }

  function initializeEmployeeSelect(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.employeeEnhanced === "true") return;
    select.dataset.employeeEnhanced = "true";
    const controlId = `employee-select-${++employeeControlSequence}`;
    const wrapper = document.createElement("span");
    wrapper.className = "employee-select-dropdown";
    const sizer = document.createElement("span");
    sizer.className = "employee-select-dropdown__sizer";
    sizer.setAttribute("aria-hidden", "true");
    sizer.textContent = Array.from(select.options).reduce((longest, option) => {
      const label = normalizeText(option.textContent);
      return label.length > longest.length ? label : longest;
    }, "Select option");
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "employee-select-dropdown__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${controlId}-menu`);
    const value = document.createElement("span");
    trigger.append(value);
    trigger.insertAdjacentHTML("beforeend", getEmployeeDropdownChevronMarkup());
    const menu = document.createElement("div");
    menu.id = `${controlId}-menu`;
    menu.className = "employee-select-dropdown__menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    const optionButtons = Array.from(select.options).map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "employee-select-dropdown__option";
      button.dataset.value = option.value;
      button.setAttribute("role", "option");
      button.textContent = normalizeText(option.textContent);
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncEmployeeSelectControl(control);
        closeEmployeeDropdown({ restoreFocus: true });
      });
      return button;
    });
    menu.append(...optionButtons);
    select.parentNode.insertBefore(wrapper, select);
    select.classList.add("employee-select-dropdown__native");
    wrapper.append(select, sizer, trigger);
    document.body.append(menu);
    const control = { select, wrapper, sizer, trigger, value, menu, options: optionButtons };
    employeeSelectControls.push(control);
    trigger.addEventListener("click", () => openEmployeeDropdown(control));
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      openEmployeeDropdown(control);
      const selectedIndex = Math.max(0, optionButtons.findIndex((button) => button.classList.contains("is-selected")));
      optionButtons[selectedIndex]?.focus({ preventScroll: true });
    });
    optionButtons.forEach((button, index) => {
      button.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Escape") {
          closeEmployeeDropdown({ restoreFocus: true });
          return;
        }
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? optionButtons.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + optionButtons.length) % optionButtons.length;
        optionButtons[nextIndex]?.focus({ preventScroll: true });
      });
    });
    select.addEventListener("change", () => syncEmployeeSelectControl(control));
    syncEmployeeSelectControl(control);
  }

  function parseEmployeeDateValue(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1])
      || date.getMonth() !== Number(match[2]) - 1
      || date.getDate() !== Number(match[3])
    ) return null;
    date.setHours(12, 0, 0, 0);
    return date;
  }

  function formatEmployeeDateValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatEmployeeDateDisplay(value) {
    const date = value instanceof Date ? value : parseEmployeeDateValue(value);
    if (!date) return "mm/dd/yyyy";
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function isSameEmployeeCalendarDay(left, right) {
    return left instanceof Date && right instanceof Date
      && left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  function getEmployeeDateIconMarkup() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>';
  }

  function getEmployeeCalendarNavMarkup(direction, double = false) {
    const first = direction < 0 ? "M27.5 15.5 18 24l9.5 8.5" : "M20.5 15.5 30 24l-9.5 8.5";
    const second = direction < 0 ? "M21 15.5 11.5 24 21 32.5" : "M27 15.5 36.5 24 27 32.5";
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${first}"/>${double ? `<path d="${second}"/>` : ""}</svg>`;
  }

  function closeEmployeeDatePicker({ restoreFocus = false } = {}) {
    const control = activeEmployeeDatePicker;
    if (!control) return false;
    control.wrapper.classList.remove("is-open");
    control.trigger.setAttribute("aria-expanded", "false");
    if (control.panel) control.panel.hidden = true;
    activeEmployeeDatePicker = null;
    if (restoreFocus) control.trigger.focus({ preventScroll: true });
    return true;
  }

  function positionEmployeeDatePicker(control) {
    if (!control?.panel || control.panel.hidden) return;
    const viewportPadding = 12;
    const gap = 8;
    const triggerRect = control.trigger.getBoundingClientRect();
    const panelRect = control.panel.getBoundingClientRect();
    const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const roomAbove = triggerRect.top - viewportPadding;
    const opensUp = roomBelow < panelRect.height + gap && roomAbove > roomBelow;
    const top = opensUp
      ? Math.max(viewportPadding, triggerRect.top - panelRect.height - gap)
      : Math.min(window.innerHeight - panelRect.height - viewportPadding, triggerRect.bottom + gap);
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding),
    );
    control.panel.dataset.openDirection = opensUp ? "up" : "down";
    control.panel.style.left = `${Math.round(left)}px`;
    control.panel.style.top = `${Math.round(top)}px`;
  }

  function syncEmployeeDateControl(control) {
    if (!control) return;
    const hasValue = Boolean(parseEmployeeDateValue(control.input.value));
    control.value.textContent = formatEmployeeDateDisplay(control.input.value);
    control.trigger.classList.toggle("is-empty", !hasValue);
    control.trigger.title = hasValue ? control.value.textContent : "Select date";
  }

  function renderEmployeeDateCalendar(control) {
    if (!control?.panel || !control.viewDate || !control.draftDate) return;
    control.month.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(control.viewDate);
    control.days.replaceChildren();
    const year = control.viewDate.getFullYear();
    const month = control.viewDate.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    for (let index = 0; index < firstWeekday; index += 1) {
      const placeholder = document.createElement("span");
      placeholder.className = "employee-date-calendar__placeholder";
      control.days.append(placeholder);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayDate = new Date(year, month, day, 12);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "employee-date-calendar__day";
      button.textContent = String(day);
      button.classList.toggle("is-today", isSameEmployeeCalendarDay(dayDate, today));
      button.classList.toggle("is-selected", isSameEmployeeCalendarDay(dayDate, control.draftDate));
      button.addEventListener("click", () => {
        control.draftDate = dayDate;
        renderEmployeeDateCalendar(control);
      });
      control.days.append(button);
    }
  }

  function openEmployeeDatePicker(control) {
    if (!control?.panel || control.readOnly) return;
    if (activeEmployeeDatePicker === control) {
      closeEmployeeDatePicker();
      return;
    }
    closeEmployeeDatePicker();
    closeEmployeeDropdown();
    const selectedDate = parseEmployeeDateValue(control.input.value) || new Date();
    selectedDate.setHours(12, 0, 0, 0);
    control.draftDate = new Date(selectedDate);
    control.viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    activeEmployeeDatePicker = control;
    control.wrapper.classList.add("is-open");
    control.trigger.setAttribute("aria-expanded", "true");
    control.panel.hidden = false;
    renderEmployeeDateCalendar(control);
    positionEmployeeDatePicker(control);
  }

  function initializeEmployeeDateInput(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.employeeEnhanced === "true") return;
    input.dataset.employeeEnhanced = "true";
    const readOnly = input.readOnly;
    const wrapper = document.createElement("span");
    wrapper.className = "employee-date-picker";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "employee-date-picker__trigger";
    trigger.setAttribute("aria-haspopup", readOnly ? "false" : "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-readonly", readOnly ? "true" : "false");
    const value = document.createElement("span");
    value.className = "employee-date-picker__value";
    const icon = document.createElement("span");
    icon.className = "employee-date-picker__icon";
    icon.innerHTML = getEmployeeDateIconMarkup();
    trigger.append(value, icon);
    input.parentNode.insertBefore(wrapper, input);
    input.classList.add("employee-date-picker__native");
    wrapper.append(input, trigger);
    const control = {
      input,
      wrapper,
      trigger,
      value,
      readOnly,
      panel: null,
      month: null,
      days: null,
      draftDate: null,
      viewDate: null,
    };
    if (!readOnly) {
      const panel = document.createElement("div");
      panel.className = "employee-date-calendar";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Choose date");
      panel.hidden = true;
      const header = document.createElement("div");
      header.className = "employee-date-calendar__header";
      const previousGroup = document.createElement("div");
      previousGroup.className = "employee-date-calendar__nav-group";
      const nextGroup = document.createElement("div");
      nextGroup.className = "employee-date-calendar__nav-group";
      const month = document.createElement("strong");
      month.className = "employee-date-calendar__month";
      const makeNav = (label, direction, double, deltaYears, deltaMonths) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "employee-date-calendar__nav";
        button.setAttribute("aria-label", label);
        button.innerHTML = getEmployeeCalendarNavMarkup(direction, double);
        button.addEventListener("click", () => {
          control.viewDate = new Date(
            control.viewDate.getFullYear() + deltaYears,
            control.viewDate.getMonth() + deltaMonths,
            1,
            12,
          );
          renderEmployeeDateCalendar(control);
        });
        return button;
      };
      previousGroup.append(
        makeNav("Previous year", -1, true, -1, 0),
        makeNav("Previous month", -1, false, 0, -1),
      );
      nextGroup.append(
        makeNav("Next month", 1, false, 0, 1),
        makeNav("Next year", 1, true, 1, 0),
      );
      header.append(previousGroup, month, nextGroup);
      const weekdays = document.createElement("div");
      weekdays.className = "employee-date-calendar__weekdays";
      ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach((weekday) => {
        const label = document.createElement("span");
        label.textContent = weekday;
        weekdays.append(label);
      });
      const days = document.createElement("div");
      days.className = "employee-date-calendar__days";
      const actions = document.createElement("div");
      actions.className = "employee-date-calendar__actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "employee-date-calendar__action";
      cancel.textContent = "Cancel";
      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "employee-date-calendar__action is-primary";
      apply.textContent = "Apply";
      cancel.addEventListener("click", () => closeEmployeeDatePicker({ restoreFocus: true }));
      apply.addEventListener("click", () => {
        input.value = formatEmployeeDateValue(control.draftDate);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        syncEmployeeDateControl(control);
        closeEmployeeDatePicker({ restoreFocus: true });
      });
      actions.append(cancel, apply);
      panel.append(header, weekdays, days, actions);
      document.body.append(panel);
      Object.assign(control, { panel, month, days });
      trigger.addEventListener("click", () => openEmployeeDatePicker(control));
    }
    input.addEventListener("change", () => syncEmployeeDateControl(control));
    employeeDateControls.push(control);
    syncEmployeeDateControl(control);
  }

  function syncEmployeeEnhancedFields() {
    employeeSelectControls.forEach(syncEmployeeSelectControl);
    employeeDateControls.forEach(syncEmployeeDateControl);
  }

  function initializeEmployeeFormControls() {
    refs.form?.querySelectorAll(".employee-form-grid select").forEach(initializeEmployeeSelect);
    refs.form?.querySelectorAll('.employee-form-grid input[type="date"]').forEach(initializeEmployeeDateInput);
  }

  function closeEmployeeFloatingControls() {
    const didCloseDropdown = closeEmployeeDropdown();
    const didCloseDate = closeEmployeeDatePicker();
    return didCloseDropdown || didCloseDate;
  }

  function setFormFeedback(message = "", type = "error") {
    if (!refs.feedback) return;
    refs.feedback.textContent = message;
    refs.feedback.classList.toggle("is-success", type === "success");
  }

  function setFormBusy(busy) {
    requestInFlight = busy;
    if (refs.submit) refs.submit.disabled = busy;
    if (refs.modalClose) refs.modalClose.disabled = busy;
    if (refs.modalCancel) refs.modalCancel.disabled = busy;
    const submitCopy = refs.submit?.querySelector("span");
    if (submitCopy) submitCopy.textContent = busy ? "Saving..." : editingAccountId ? "Save Changes" : "Register Employee";
  }

  function openEmployeeModal(account = null) {
    if (!refs.form || !refs.modalOverlay) return;
    editingAccountId = account ? getAccountId(account) : "";
    refs.form.reset();
    [refs.form.elements.password, refs.form.elements.confirmPassword].forEach((input) => {
      input.type = "password";
    });
    refs.modalOverlay.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.title = "Show password";
      button.setAttribute("aria-label", "Show password");
    });
    setFormFeedback();
    if (refs.modalTitle) refs.modalTitle.textContent = account ? "Edit Employee" : "Add Employee";
    if (refs.modalSubtitle) {
      refs.modalSubtitle.textContent = account
        ? "Update employee details, access, and work information."
        : "Create a new employee account and manage all the essential information.";
    }
    if (refs.modalClose) {
      refs.modalClose.setAttribute("aria-label", account ? "Close Edit Employee" : "Close Add Employee");
    }
    refs.form.elements.employeeId.value = account?.employeeId || account?.accountCode || generateEmployeeId();
    refs.form.elements.firstName.value = account?.firstName || "";
    refs.form.elements.middleName.value = account?.middleName || "";
    refs.form.elements.lastName.value = account?.lastName || "";
    refs.form.elements.email.value = account?.email || "";
    refs.form.elements.mobileNumber.value = String(account?.mobileNumber || "").replace(/\D/g, "").replace(/^63/, "").replace(/^0/, "");
    refs.form.elements.dateOfBirth.value = account?.dateOfBirth ? toDateInputValue(account.dateOfBirth) : "";
    refs.form.elements.gender.value = account?.gender || "";
    refs.form.elements.address.value = account?.address || "";
    refs.form.elements.position.value = account?.position || "";
    refs.form.elements.startDate.value = account
      ? toDateInputValue(getHireDateValue(account)) || toDateInputValue(new Date())
      : toDateInputValue(new Date());
    refs.form.elements.employmentType.value = account?.employmentType || "Regular";
    refs.form.elements.timeIn.value = account?.timeIn || "09:00";
    syncPrimaryDocumentField(null, account);
    refs.form.elements.password.value = "";
    refs.form.elements.confirmPassword.value = "";
    refs.form.elements.password.required = !account;
    refs.form.elements.confirmPassword.required = !account;
    refs.form.elements.active.checked = !account || getEmployeeStatus(account) !== "inactive";
    syncEmployeeEnhancedFields();
    syncStatusCopy();
    setFormBusy(false);
    document.body.classList.add("employee-layer-open", "employee-register-modal-surface");
    document.body.classList.remove("employee-drawer-surface");
    notifyMainEmployeesLayerState({ modalOpen: true, drawerOpen: false });
    refs.modalOverlay.hidden = false;
    window.requestAnimationFrame(() => {
      refs.modalOverlay.classList.add("is-open");
      refs.form.elements.firstName.focus({ preventScroll: true });
    });
  }

  function closeEmployeeModal() {
    if (!refs.modalOverlay || refs.modalOverlay.hidden || requestInFlight) return;
    closeEmployeeFloatingControls();
    refs.modalOverlay.classList.remove("is-open");
    window.setTimeout(() => {
      refs.modalOverlay.hidden = true;
      editingAccountId = "";
      setFormFeedback();
      syncLayerOpenState();
    }, 190);
  }

  function syncStatusCopy() {
    if (refs.statusCopy && refs.form) {
      refs.statusCopy.textContent = refs.form.elements.active.checked ? "Active" : "Inactive";
    }
  }

  async function uploadDocument(file) {
    const response = await fetch("/api/document-uploads", {
      method: "POST",
      headers: withAdminHeaders({
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name || "employee-document",
      }),
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Unable to upload the employee document.");
    return String(data.documentUrl || "").trim();
  }

  function normalizeMobileNumber(value) {
    return String(value || "").replace(/\D/g, "").replace(/^63/, "").replace(/^0/, "");
  }

  async function submitEmployeeForm(event) {
    event.preventDefault();
    if (!refs.form || requestInFlight) return;
    const fields = refs.form.elements;
    const firstName = normalizeText(fields.firstName.value);
    const lastName = normalizeText(fields.lastName.value);
    const email = normalizeText(fields.email.value).toLowerCase();
    const mobileNumber = normalizeMobileNumber(fields.mobileNumber.value);
    const password = String(fields.password.value || "");
    const confirmPassword = String(fields.confirmPassword.value || "");
    if (firstName.length < 2 || lastName.length < 2) {
      setFormFeedback("First name and last name must be at least 2 characters long.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFormFeedback("Enter a valid employee email address.");
      return;
    }
    if (!/^9\d{9}$/.test(mobileNumber)) {
      setFormFeedback("Enter a valid Philippine mobile number after +63.");
      return;
    }
    if (!editingAccountId && password.length < 6) {
      setFormFeedback("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormFeedback("Password and confirmation do not match.");
      return;
    }
    if (!normalizeText(fields.position.value)) {
      setFormFeedback("Complete the employee position.");
      return;
    }
    if (!normalizeText(fields.address.value)) {
      setFormFeedback("Employee address is required.");
      return;
    }

    setFormBusy(true);
    setFormFeedback();
    try {
      const existing = editingAccountId ? findAccount(editingAccountId) : null;
      const file = fields.documentFile.files?.[0] || null;
      let eDocument = existing?.eDocument || null;
      if (file) {
        const url = await uploadDocument(file);
        const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
        eDocument = {
          type: extension,
          label: "Primary Document",
          fileName: file.name,
          fileExtension: extension,
          url,
          uploadedAt: new Date().toISOString(),
        };
      }
      const timeIn = fields.timeIn.value;
      const registrationDate = toDateInputValue(new Date());
      const startDate = editingAccountId
        ? fields.startDate.value || registrationDate
        : registrationDate;
      fields.startDate.value = startDate;
      const payload = {
        ...(editingAccountId ? { id: editingAccountId } : {}),
        employeeId: fields.employeeId.value,
        firstName,
        middleName: normalizeText(fields.middleName.value),
        lastName,
        email,
        mobileNumber,
        countryCode: "+63",
        address: normalizeText(fields.address.value),
        dateOfBirth: fields.dateOfBirth.value,
        gender: fields.gender.value,
        position: normalizeText(fields.position.value),
        startDate,
        employmentType: fields.employmentType.value,
        timeIn,
        timeOut: addScheduleHours(timeIn),
        employeeRole: "Employee",
        status: fields.active.checked ? "active" : "inactive",
        source: "web",
        ...(password ? { password } : {}),
        ...(eDocument ? { eDocument } : {}),
      };
      const response = await fetch("/api/accounts", {
        method: editingAccountId ? "PUT" : "POST",
        cache: "no-store",
        headers: withAdminHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to save the employee account.");
      const successMessage = editingAccountId ? "Employee updated successfully." : "Employee registered successfully.";
      await loadAccounts({ preserveLayers: true });
      setFormBusy(false);
      closeEmployeeModal();
      showToast(successMessage);
      if (selectedAccountId) {
        const selected = findAccount(selectedAccountId);
        if (selected) renderDrawer(selected);
      }
    } catch (error) {
      setFormFeedback(error instanceof Error ? error.message : "Unable to save the employee account.");
    } finally {
      setFormBusy(false);
    }
  }

  async function deleteEmployee(account) {
    if (!account || requestInFlight) return;
    const accountId = getAccountId(account);
    if (!accountId || !window.confirm(`Delete ${getEmployeeName(account)}? This removes the employee account and face profile.`)) return;
    requestInFlight = true;
    try {
      const response = await fetch(`/api/accounts?id=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        headers: withAdminHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to delete the employee account.");
      closeDrawer();
      await loadAccounts();
      showToast("Employee deleted successfully.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete the employee account.", true);
    } finally {
      requestInFlight = false;
    }
  }

  function showToast(message, isError = false) {
    if (!refs.toast) return;
    window.clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.toggle("is-error", isError);
    refs.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      refs.toast.hidden = true;
    }, 3600);
  }

  async function loadAccounts(options = {}) {
    const preserveLayers = options.preserveLayers === true;

    const ownsLock = !requestInFlight;
    if (ownsLock) {
      requestInFlight = true;
    }

    try {
      const response = await fetch("/api/accounts", {
        cache: "no-store",
        headers: withAdminHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load employees.");
      const nextAccounts = (Array.isArray(data.accounts) ? data.accounts : [])
        .filter((account) => String(account?.source || "").toLowerCase() === "web")
        .sort((left, right) => new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0));
      const nextSignature = getAccountsRenderSignature(nextAccounts);
      accounts = nextAccounts;

      // Preserve the current layers when an explicit refresh returns unchanged data.
      if (preserveLayers && nextSignature === accountsRenderSignature) {
        return;
      }

      accountsRenderSignature = nextSignature;
      renderSummary();
      renderDepartmentOptions();
      renderDirectory();
      if (
        isMainEmployeesDrawerPortal
        && requestedDrawerEmployeeId
        && !requestedDrawerOpened
      ) {
        const requestedAccount = findAccount(requestedDrawerEmployeeId);
        if (requestedAccount) {
          requestedDrawerOpened = true;
          openDrawer(requestedAccount);
        }
      }
      if (preserveLayers && selectedAccountId) {
        const selected = findAccount(selectedAccountId);
        if (selected) renderDrawer(selected);
      }
    } catch (error) {
      accounts = [];
      accountsRenderSignature = "";
      renderSummary();
      renderDepartmentOptions();
      if (refs.list) {
        refs.list.innerHTML = `<div class="employee-empty"><strong>Unable to load employees</strong><span>${escapeHtml(error instanceof Error ? error.message : "Please try again.")}</span></div>`;
      }
      renderPagination(0);
    } finally {
      if (ownsLock) {
        requestInFlight = false;
      }
    }
  }

  refs.search?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTerm = refs.search.value.trim();
      currentPage = 1;
      renderDirectory();
    }, 250);
  });
  refs.statusFilter?.addEventListener("change", () => {
    statusFilter = refs.statusFilter.value;
    currentPage = 1;
    renderDirectory();
  });
  refs.departmentFilter?.addEventListener("change", () => {
    departmentFilter = refs.departmentFilter.value;
    currentPage = 1;
    renderDirectory();
  });
  initializeEmployeeFormControls();
  refs.addButton?.addEventListener("click", () => openEmployeeModal());
  refs.drawerClose?.addEventListener("click", closeDrawer);
  refs.modalClose?.addEventListener("click", closeEmployeeModal);
  refs.modalCancel?.addEventListener("click", closeEmployeeModal);
  refs.form?.addEventListener("submit", submitEmployeeForm);
  refs.form?.elements.active.addEventListener("change", syncStatusCopy);
  refs.form?.elements.mobileNumber?.addEventListener("input", (event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const normalizedValue = input.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
    if (input.value !== normalizedValue) input.value = normalizedValue;
  });
  refs.form?.elements.documentFile?.addEventListener("change", () => {
    const file = refs.form.elements.documentFile.files?.[0] || null;
    const account = editingAccountId ? findAccount(editingAccountId) : null;
    syncPrimaryDocumentField(file, account);
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = refs.form?.elements[button.dataset.passwordToggle];
      if (!(input instanceof HTMLInputElement)) return;
      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.title = shouldShow ? "Hide password" : "Show password";
      button.setAttribute("aria-label", button.title);
    });
  });

  refs.list?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const action = target?.closest("[data-employee-action]");
    if (action) {
      event.stopPropagation();
      const account = findAccount(action.dataset.employeeId);
      if (!account) return;
      if (action.dataset.employeeAction === "view") openDrawer(account);
      if (action.dataset.employeeAction === "edit") openEmployeeModal(account);
      if (action.dataset.employeeAction === "delete") void deleteEmployee(account);
      return;
    }
    const row = target?.closest(".employee-row[data-employee-id]");
    if (row) openDrawer(findAccount(row.dataset.employeeId));
  });

  refs.list?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest(".employee-row[data-employee-id]");
    if (!row || target?.closest("button")) return;
    event.preventDefault();
    openDrawer(findAccount(row.dataset.employeeId));
  });

  refs.drawerOverlay?.addEventListener("click", (event) => {
    if (event.target === refs.drawerOverlay) closeDrawer();
  });
  refs.modalOverlay?.addEventListener("click", (event) => {
    if (event.target === refs.modalOverlay) closeEmployeeModal();
  });
  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Node ? event.target : null;
    if (
      activeEmployeeDropdown
      && target
      && !activeEmployeeDropdown.wrapper.contains(target)
      && !activeEmployeeDropdown.menu.contains(target)
    ) {
      closeEmployeeDropdown();
    }
    if (
      activeEmployeeDatePicker
      && target
      && !activeEmployeeDatePicker.wrapper.contains(target)
      && !activeEmployeeDatePicker.panel?.contains(target)
    ) {
      closeEmployeeDatePicker();
    }
  });
  const repositionEmployeeFloatingControl = () => {
    if (activeEmployeeDropdown) positionEmployeeDropdown(activeEmployeeDropdown);
    if (activeEmployeeDatePicker) positionEmployeeDatePicker(activeEmployeeDatePicker);
  };
  window.addEventListener("resize", repositionEmployeeFloatingControl);
  document.addEventListener("scroll", repositionEmployeeFloatingControl, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (closeEmployeeFloatingControls()) return;
    if (refs.modalOverlay && !refs.modalOverlay.hidden) {
      closeEmployeeModal();
      return;
    }
    if (refs.drawerOverlay && !refs.drawerOverlay.hidden) closeDrawer();
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "gms-main-employees-modal-close") {
      closeEmployeeModal();
      return;
    }
    if (event.data?.type === "gms-main-employees-drawer-close") {
      closeDrawer();
      return;
    }
    if (event.data?.type === "gms-main-employees-refresh") {
      void loadAccounts({ preserveLayers: true });
    }
  });

  syncWorkspaceColorFromSuperAdmin();
  window.addEventListener("storage", (event) => {
    if (event.key === "gms-workspace-color") {
      syncWorkspaceColorFromSuperAdmin();
    }
  });
  window.addEventListener("gms:workspace-color-changed", syncWorkspaceColorFromSuperAdmin);

  void loadAccounts();
})();
