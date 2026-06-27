const userAccountList = document.getElementById("user-account-list");
const userDataSearchInput = document.getElementById("user-data-search-input");
const userDataSortSelect = document.querySelector("[data-user-data-sort]");
let allAppAccounts = [];
let currentSort = "newest";

function readSuperAdminSession() {
  try {
    const rawSession = window.sessionStorage.getItem("gms-super-admin-session");
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    return null;
  }
}

function getSuperAdminHeaders() {
  const token = String(readSuperAdminSession()?.token ?? "").trim();
  return token ? { "X-GMS-Super-Admin-Token": token } : {};
}

const userDataColumns = [
  { key: "userId", label: "User ID" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "mobileNumber", label: "Phone Number" },
  { key: "createdAt", label: "Created" },
  { key: "faceVerification", label: "Face Verification" },
];

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatText(value, fallback = "-") {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
}

function formatPhone(account) {
  const mobileNumber = String(account.mobileNumber ?? "").trim();
  if (!mobileNumber) {
    return "-";
  }

  const countryCode = String(account.countryCode ?? "").trim();
  return `${countryCode || "+63"} ${mobileNumber}`;
}

function hasRegisteredFaceProfile(account) {
  if (!account) {
    return false;
  }

  if (account.faceVerified || account.faceProfileRegistered) {
    return true;
  }

  if (account.verifiedAt) {
    return true;
  }

  const registeredFaceProfile = account.registeredFaceProfile;
  if (registeredFaceProfile && typeof registeredFaceProfile === "object") {
    return true;
  }

  const faceAttendanceProfile = account.face_attendance_lh || account.faceAttendanceLh;
  if (faceAttendanceProfile && typeof faceAttendanceProfile === "object") {
    const sampleCount = Number(faceAttendanceProfile.sampleCount ?? faceAttendanceProfile.sample_count ?? 0);
    return Boolean(faceAttendanceProfile.registeredAt || faceAttendanceProfile.registered_at || sampleCount > 0);
  }

  return Boolean(faceAttendanceProfile);
}

function createEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function createCell(value, options = {}) {
  const cell = document.createElement("td");
  cell.textContent = formatText(value);

  if (options.isMuted) {
    cell.classList.add("employee-data-table__cell--muted");
  }

  return cell;
}

function createFaceVerificationCell(account) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "user-account-badge";

  if (hasRegisteredFaceProfile(account)) {
    badge.classList.add("is-success");
    badge.textContent = "Verified";
  } else {
    badge.textContent = "Pending";
  }

  cell.appendChild(badge);
  return cell;
}

function createUserDataRow(account, index) {
  const row = document.createElement("tr");

  row.append(
    createCell(account.accountCode || account.employeeId || account.id),
    createCell(account.firstName),
    createCell(account.lastName),
    createCell(account.email),
    createCell(formatPhone(account)),
    createCell(formatDateTime(account.createdAt)),
    createFaceVerificationCell(account),
  );

  row.dataset.userRow = String(index + 1);
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  return row;
}

function createUserDataTable(accounts) {
  const tableShell = document.createElement("div");
  tableShell.className = "employee-data-table-shell";

  const table = document.createElement("table");
  table.className = "employee-data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  userDataColumns.forEach((column) => {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = column.label;
    headerRow.appendChild(header);
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  accounts.forEach((account, index) => {
    tbody.appendChild(createUserDataRow(account, index));
  });

  table.append(thead, tbody);
  tableShell.appendChild(table);
  return tableShell;
}

function renderAccounts(accounts) {
  userAccountList.replaceChildren();

  if (!accounts.length) {
    userAccountList.appendChild(createEmptyState("No registered app users yet."));
    return;
  }

  userAccountList.appendChild(createUserDataTable(accounts));
}

function sortUserAccounts(accounts) {
  const sorted = [...accounts];
  const sort = currentSort || "newest";

  sorted.sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case "oldest":
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case "a-z":
        return (`${a.firstName || ""} ${a.lastName || ""}`.toLowerCase())
          .localeCompare(`${b.firstName || ""} ${b.lastName || ""}`.toLowerCase());
      case "z-a":
        return (`${b.firstName || ""} ${b.lastName || ""}`.toLowerCase())
          .localeCompare(`${a.firstName || ""} ${a.lastName || ""}`.toLowerCase());
      default:
        return 0;
    }
  });

  return sorted;
}

function getFilteredUserAccounts(accounts = allAppAccounts) {
  const query = String(userDataSearchInput?.value ?? "").trim().toLowerCase();
  let filtered = accounts;

  if (query) {
    filtered = accounts.filter((account) => {
      const fullName = `${account.firstName || ""} ${account.lastName || ""}`.toLowerCase();
      const email = (account.email || "").toLowerCase();
      const mobileNumber = [account.countryCode || "", account.mobileNumber || ""].join(" ").trim().toLowerCase();
      const userId = (account.accountCode || account.employeeId || account.id || "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        mobileNumber.includes(query) ||
        userId.includes(query)
      );
    });
  }

  return sortUserAccounts(filtered);
}

async function loadAccounts() {
  try {
    const response = await fetch("/api/accounts", {
      cache: "no-store",
      headers: getSuperAdminHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load created accounts.");
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    allAppAccounts = accounts.filter((account) => account.source === "app");
    const filteredAccounts = getFilteredUserAccounts();
    renderAccounts(filteredAccounts);
  } catch (error) {
    console.error(error);
    userAccountList.replaceChildren();
    userAccountList.appendChild(createEmptyState("Unable to load registered app users right now."));
  }
}

let userDataSearchTimer = 0;

function handleUserSearchInput(event) {
  window.clearTimeout(userDataSearchTimer);
  userDataSearchTimer = window.setTimeout(() => {
    const searchQuery = event.target.value.toLowerCase().trim();

    if (!searchQuery) {
      renderAccounts(allAppAccounts);
      return;
    }

    const filteredAccounts = getFilteredUserAccounts();
    renderAccounts(filteredAccounts);
  }, 500);
}

if (userDataSearchInput) {
  userDataSearchInput.addEventListener("input", handleUserSearchInput);
}

if (userDataSortSelect) {
  userDataSortSelect.addEventListener("change", (event) => {
    currentSort = event.target.value;
    const filteredAccounts = getFilteredUserAccounts();
    renderAccounts(filteredAccounts);
  });
}

loadAccounts();
