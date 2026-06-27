(function () {
  if (window.GMSEmployeeRegisterInlineReady) {
    return;
  }

  const form = document.getElementById("employee-register-form");
  const submitButton = document.getElementById("submit-register-button");
  const modalOverlay = document.getElementById("register-validation-modal-overlay");
  const modalTitle = document.getElementById("register-validation-modal-title");
  const modalCopy = document.getElementById("register-validation-modal-copy");
  const modalAction = document.getElementById("register-validation-modal-action");
  const modalClose = document.getElementById("register-validation-modal-close");
  const modalIcon = modalOverlay?.querySelector(".validation-modal__icon");

  if (!form || !submitButton || !modalOverlay || !modalTitle || !modalCopy || !modalAction) {
    return;
  }

  let isSaving = false;
  let emailValidationTimer = 0;
  let emailValidationRequestId = 0;
  let lastDuplicateEmailPopupValue = "";
  let fallbackEmployeeIdSuffix = "";
  let passwordMismatchTimer = 0;
  let lastPasswordMismatchKey = "";
  const employeeIdPattern = /^(?:[A-Z0-9]{2,8}-)?\d{6}$/;

  const field = {
    employeeId: document.getElementById("register-employee-id"),
    employeeIdNumber: document.getElementById("register-employee-id-number"),
    companyAcronym: document.getElementById("register-company-acronym"),
    companyAcronymDropdown: document.getElementById("register-company-acronym-dropdown"),
    companyAcronymTrigger: document.getElementById("register-company-acronym-trigger"),
    companyAcronymSummary: document.getElementById("register-company-acronym-summary"),
    companyAcronymMenu: document.getElementById("register-company-acronym-menu"),
    position: document.getElementById("register-position"),
    positionTrigger: document.getElementById("register-position-trigger"),
    positionSummary: document.getElementById("register-position-summary"),
    positionMenu: document.getElementById("register-position-menu"),
    timeIn: document.getElementById("register-time-in"),
    timeInTrigger: document.getElementById("register-time-in-trigger"),
    timeInSummary: document.getElementById("register-time-in-summary"),
    timeInMenu: document.getElementById("register-time-in-menu"),
    timeOut: document.getElementById("register-time-out"),
    timeOutDisplay: document.getElementById("register-time-out-display"),
    workHours: document.getElementById("register-work-hours"),
    firstName: document.getElementById("register-first-name"),
    middleName: document.getElementById("register-middle-name"),
    lastName: document.getElementById("register-last-name"),
    suffix: document.getElementById("register-suffix"),
    email: document.getElementById("register-email"),
    emailField: document.getElementById("register-email")?.closest(".register-email-field"),
    emailStatus: document.getElementById("register-email-status"),
    address: document.getElementById("register-address"),
    phone: document.getElementById("register-phone-number"),
    password: document.getElementById("register-password"),
    confirmPassword: document.getElementById("register-confirm-password"),
  };

  const iconMarkup = {
    notice: `
      <svg viewBox="0 0 24 24" width="140" height="140" fill="none">
        <circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.8"></circle>
        <path d="M12 10.4v5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <circle cx="12" cy="7.6" r="1.1" fill="currentColor"></circle>
      </svg>
    `,
    success: `
      <svg viewBox="0 0 24 24" width="140" height="140" fill="none">
        <circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.8"></circle>
        <path d="m8.2 12.2 2.6 2.6 5.8-6.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    error: `
      <svg viewBox="0 0 24 24" width="140" height="140" fill="none">
        <circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.8"></circle>
        <path d="m8.6 8.6 6.8 6.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
        <path d="m15.4 8.6-6.8 6.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
      </svg>
    `,
  };

  function openModal(title, message, options = {}) {
    const mode = ["notice", "success", "error"].includes(options.mode) ? options.mode : "notice";
    modalTitle.textContent = title;
    modalCopy.textContent = message;
    modalAction.textContent = options.actionLabel || "Go Back";
    modalAction.disabled = Boolean(options.actionDisabled);

    if (modalClose) {
      modalClose.hidden = Boolean(options.hideClose);
    }

    if (modalIcon) {
      modalIcon.className = `validation-modal__icon validation-modal__icon--${mode}`;
      modalIcon.innerHTML = iconMarkup[mode] || iconMarkup.notice;
    }

    modalOverlay.hidden = false;
    modalOverlay.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      modalOverlay.classList.add("is-open");
    });
    document.body.classList.add("modal-open");

    window.setTimeout(() => {
      if (!modalAction.disabled) {
        modalAction.focus();
      }
    }, 0);
  }

  function closeModal() {
    if (modalAction.disabled) {
      return;
    }

    modalOverlay.classList.remove("is-open");
    modalOverlay.hidden = true;
    modalOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    submitButton.focus();
  }

  function clearPasswordMismatchTimer() {
    if (passwordMismatchTimer) {
      window.clearTimeout(passwordMismatchTimer);
      passwordMismatchTimer = 0;
    }
  }

  function setPasswordTooltip(input, message = "") {
    const fieldShell = input?.closest?.(".password-field");
    if (!fieldShell) {
      return;
    }

    if (message) {
      fieldShell.dataset.passwordTooltip = message;
      fieldShell.classList.add("is-invalid");
      input?.setAttribute?.("aria-invalid", "true");
      return;
    }

    delete fieldShell.dataset.passwordTooltip;
    fieldShell.classList.remove("is-invalid");
    input?.removeAttribute?.("aria-invalid");
  }

  function showPasswordMismatchTooltip() {
    setPasswordTooltip(field.confirmPassword, "Confirm password not match");
  }

  function validatePasswordMatchNow(options = {}) {
    const password = text(field.password);
    const confirmPassword = text(field.confirmPassword);
    if (!password || !confirmPassword) {
      lastPasswordMismatchKey = "";
      setPasswordTooltip(field.confirmPassword, "");
      return;
    }

    if (password === confirmPassword) {
      lastPasswordMismatchKey = "";
      setPasswordTooltip(field.confirmPassword, "");
      return;
    }

    if (!options.force && confirmPassword.length < password.length) {
      return;
    }

    const mismatchKey = `${password}\n${confirmPassword}`;
    if (mismatchKey === lastPasswordMismatchKey) {
      return;
    }

    lastPasswordMismatchKey = mismatchKey;
    showPasswordMismatchTooltip();
  }

  function schedulePasswordMatchValidation(options = {}) {
    clearPasswordMismatchTimer();
    const delay = options.force ? 0 : 520;
    passwordMismatchTimer = window.setTimeout(() => {
      passwordMismatchTimer = 0;
      validatePasswordMatchNow(options);
    }, delay);
  }

  function text(input) {
    return String(input?.value ?? "").trim();
  }

  function uppercaseNameInitials(value) {
    return String(value ?? "").replace(/(^|[\s'-])([a-zñ])/gi, (match, prefix, letter) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
  }

  function uppercaseNameInput(input) {
    if (!input) {
      return;
    }

    const currentValue = String(input.value ?? "");
    const nextValue = uppercaseNameInitials(currentValue);
    if (nextValue === currentValue) {
      return;
    }

    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    input.value = nextValue;
    if (document.activeElement === input && selectionStart !== null && selectionEnd !== null) {
      input.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  function normalizePhone(value) {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("63") && digits.length > 10) {
      digits = digits.slice(2);
    }
    if (digits.startsWith("0") && digits.length > 10) {
      digits = digits.slice(1);
    }
    return digits.slice(0, 10);
  }

  function normalizeCompanyAcronym(value) {
    if (window.GMSCompanyAcronyms?.normalize) {
      return window.GMSCompanyAcronyms.normalize(value);
    }

    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
  }

  function loadCompanyAcronyms() {
    if (window.GMSCompanyAcronyms?.load) {
      const acronyms = window.GMSCompanyAcronyms.load();
      if (Array.isArray(acronyms)) {
        return acronyms.map(normalizeCompanyAcronym).filter(Boolean);
      }
    }

    return [];
  }

  function normalizeEmployeeIdNumber(value) {
    return String(value ?? "").replace(/\D/g, "").slice(0, 6);
  }

  function formatEmployeeIdNumber(value) {
    const number = normalizeEmployeeIdNumber(value);
    return number ? number.padStart(6, "0") : "";
  }

  function parseEmployeeId(value) {
    const normalized = String(value ?? "").trim().toUpperCase();
    const fullMatch = normalized.match(/^([A-Z0-9]{2,8})-(\d{1,6})$/);
    if (fullMatch) {
      return {
        acronym: normalizeCompanyAcronym(fullMatch[1]),
        number: normalizeEmployeeIdNumber(fullMatch[2]),
      };
    }

    return {
      acronym: "",
      number: normalizeEmployeeIdNumber(normalized),
    };
  }

  function composeEmployeeId(acronym, number) {
    const employeeNumber = formatEmployeeIdNumber(number);
    if (!employeeNumber) {
      return "";
    }

    const normalizedAcronym = normalizeCompanyAcronym(acronym);
    return normalizedAcronym ? `${normalizedAcronym}-${employeeNumber}` : employeeNumber;
  }

  function syncCompanyAcronym() {
    const acronyms = loadCompanyAcronyms();
    const currentValue = normalizeCompanyAcronym(field.companyAcronym?.value);
    const selectedValue = acronyms.includes(currentValue) ? currentValue : acronyms[0] || "";
    const hasAcronyms = acronyms.length > 0;
    if (field.companyAcronym) {
      field.companyAcronym.value = selectedValue;
    }
    if (field.companyAcronymSummary) {
      field.companyAcronymSummary.textContent = selectedValue || "No acronym";
      field.companyAcronymSummary.classList.toggle("is-placeholder", !selectedValue);
    }
    field.companyAcronymDropdown?.closest(".register-employee-id-control")
      ?.classList.toggle("has-no-acronym", !hasAcronyms);
    if (field.companyAcronymDropdown) {
      field.companyAcronymDropdown.hidden = !hasAcronyms;
    }
    if (field.companyAcronymTrigger) {
      field.companyAcronymTrigger.disabled = !hasAcronyms;
      if (!hasAcronyms) {
        field.companyAcronymTrigger.setAttribute("aria-expanded", "false");
      }
    }
    if (!hasAcronyms) {
      if (field.companyAcronymMenu) {
        field.companyAcronymMenu.hidden = true;
      }
      field.companyAcronymMenu?.parentElement?.classList.remove("is-open");
    }
    field.companyAcronymMenu?.querySelectorAll("[data-company-acronym-value]").forEach((option) => {
      const isSelected = option.dataset.companyAcronymValue === selectedValue;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
    return selectedValue;
  }

  function setCompanyAcronym(value) {
    if (field.companyAcronym) {
      field.companyAcronym.value = normalizeCompanyAcronym(value);
    }
    syncCompanyAcronym();
    syncEmployeeIdField();
  }

  function renderCompanyAcronymOptions() {
    if (!field.companyAcronymMenu) {
      return;
    }

    const acronyms = loadCompanyAcronyms();
    if (!acronyms.length) {
      field.companyAcronymMenu.replaceChildren();
      setCompanyAcronym("");
      return;
    }

    const currentValue = normalizeCompanyAcronym(field.companyAcronym?.value || acronyms[0]);
    const selectedValue = acronyms.includes(currentValue) ? currentValue : acronyms[0];
    field.companyAcronymMenu.replaceChildren(
      ...acronyms.map((acronym) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "product-category-multiselect__option";
        option.dataset.companyAcronymValue = acronym;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.textContent = acronym;
        return option;
      }),
    );
    setCompanyAcronym(selectedValue);
  }

  function syncEmployeeIdField(options = {}) {
    const number = normalizeEmployeeIdNumber(field.employeeIdNumber?.value);
    const displayNumber = options.pad ? formatEmployeeIdNumber(number) : number;
    if (field.employeeIdNumber) {
      field.employeeIdNumber.value = displayNumber;
    }

    const employeeId = composeEmployeeId(syncCompanyAcronym(), displayNumber);
    if (field.employeeId) {
      field.employeeId.value = employeeId;
    }

    return employeeId;
  }

  function normalizeEmployeePosition(value) {
    if (window.GMSEmployeePositions?.normalize) {
      return window.GMSEmployeePositions.normalize(value);
    }

    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  }

  function loadEmployeePositions() {
    if (window.GMSEmployeePositions?.load) {
      const positions = window.GMSEmployeePositions.load();
      if (Array.isArray(positions) && positions.length) {
        return positions.map(normalizeEmployeePosition).filter(Boolean);
      }
    }

    return ["Packing", "Admin Employee"];
  }

  function isEmployeePosition(value) {
    const normalizedValue = normalizeEmployeePosition(value).toLowerCase();
    return loadEmployeePositions().some((position) => position.toLowerCase() === normalizedValue);
  }

  function generateEmployeeId() {
    if (!fallbackEmployeeIdSuffix) {
      fallbackEmployeeIdSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    }

    if (field.employeeIdNumber && !field.employeeIdNumber.value.trim()) {
      field.employeeIdNumber.value = fallbackEmployeeIdSuffix;
    }

    return composeEmployeeId(field.companyAcronym?.value || loadCompanyAcronyms()[0] || "", field.employeeIdNumber?.value || fallbackEmployeeIdSuffix);
  }

  function parseTime(value) {
    const match = String(value ?? "").trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  }

  function formatTime(totalMinutes) {
    const minutesInDay = 24 * 60;
    const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatTimeLabel(value) {
    const minutes = parseTime(value);
    if (minutes === null) {
      return "";
    }

    const hours = Math.floor(minutes / 60);
    const displayHours = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    return `${displayHours}:${String(minutes % 60).padStart(2, "0")} ${period}`;
  }

  function syncSchedule() {
    const timeInMinutes = parseTime(field.timeIn?.value);
    const timeOut = timeInMinutes === null ? "" : formatTime(timeInMinutes + 9 * 60);
    if (field.timeOut) {
      field.timeOut.value = timeOut;
    }
    if (field.timeOutDisplay) {
      field.timeOutDisplay.value = formatTimeLabel(timeOut) || "--";
    }
    if (field.workHours) {
      field.workHours.value = timeOut ? "8" : "";
    }
  }

  function setPosition(value, label) {
    if (field.position) {
      field.position.value = value;
    }
    if (field.positionSummary) {
      field.positionSummary.textContent = label || "Select position";
      field.positionSummary.classList.toggle("is-placeholder", !value);
    }
    if (field.positionMenu) {
      field.positionMenu.hidden = true;
    }
    field.positionTrigger?.setAttribute("aria-expanded", "false");
    field.positionMenu?.parentElement?.classList.remove("is-open");
  }

  function setTimeIn(value, label) {
    if (field.timeIn) {
      field.timeIn.value = value;
    }
    if (field.timeInSummary) {
      field.timeInSummary.textContent = label || "Select time";
      field.timeInSummary.classList.toggle("is-placeholder", !value);
    }
    if (field.timeInMenu) {
      field.timeInMenu.hidden = true;
    }
    field.timeInTrigger?.setAttribute("aria-expanded", "false");
    field.timeInMenu?.parentElement?.classList.remove("is-open");
    syncSchedule();
  }

  function ensureInitialState() {
    const parsedEmployeeId = parseEmployeeId(field.employeeId?.value);
    if (field.employeeIdNumber && !field.employeeIdNumber.value.trim() && parsedEmployeeId.number) {
      field.employeeIdNumber.value = parsedEmployeeId.number;
    }
    if (field.companyAcronym && !field.companyAcronym.value.trim() && parsedEmployeeId.acronym) {
      field.companyAcronym.value = parsedEmployeeId.acronym;
    }
    renderCompanyAcronymOptions();
    if (field.employeeId && !employeeIdPattern.test(text(field.employeeId))) {
      field.employeeId.value = generateEmployeeId();
    }
    syncEmployeeIdField({ pad: true });
    if (field.phone) {
      field.phone.value = normalizePhone(field.phone.value);
    }
    syncSchedule();
  }

  function showError(message, focusTarget) {
    openModal("Registration Failed", message, {
      actionLabel: "Review Form",
      mode: "error",
    });
    if (focusTarget instanceof HTMLElement) {
      window.setTimeout(() => focusTarget.focus(), 0);
    }
  }

  function validatePayload(payload, confirmPassword) {
    const requiredChecks = [
      [payload.employeeId, 'Please fill up "employee ID".', field.employeeIdNumber || field.employeeId],
      [payload.position, 'Please select "employee position".', field.positionTrigger],
      [payload.timeIn, 'Please select "time in".', field.timeInTrigger],
      [payload.timeOut, 'Please select "time in" so "time out" can be computed.', field.timeInTrigger],
      [payload.firstName, 'Please fill up "first name".', field.firstName],
      [payload.lastName, 'Please fill up "last name".', field.lastName],
      [payload.email, 'Please fill up "email address".', field.email],
      [payload.mobileNumber, 'Please fill up "phone number".', field.phone],
      [payload.password, 'Please fill up "password".', field.password],
      [confirmPassword, 'Please fill up "confirm password".', field.confirmPassword],
    ];

    for (const [value, message, focusTarget] of requiredChecks) {
      if (!value) {
        return { valid: false, message, focusTarget };
      }
    }

    if (!employeeIdPattern.test(payload.employeeId)) {
      return {
        valid: false,
        message: 'Generated "employee ID" is invalid. Please reload the page and try again.',
        focusTarget: field.employeeIdNumber || field.employeeId,
      };
    }
    if (!isEmployeePosition(payload.position)) {
      return { valid: false, message: 'Please select a valid "employee position".', focusTarget: field.positionTrigger };
    }
    if (parseTime(payload.timeIn) === null || payload.timeOut !== formatTime(parseTime(payload.timeIn) + 9 * 60)) {
      return { valid: false, message: '"time out" must be computed automatically from "time in".', focusTarget: field.timeInTrigger };
    }
    if (payload.firstName.length < 2 || payload.lastName.length < 2) {
      return {
        valid: false,
        message: payload.firstName.length < 2
          ? '"first name" must be at least 2 characters long.'
          : '"last name" must be at least 2 characters long.',
        focusTarget: payload.firstName.length < 2 ? field.firstName : field.lastName,
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return { valid: false, message: 'Please enter a valid "email address".', focusTarget: field.email };
    }
    if (!/^9\d{9}$/.test(payload.mobileNumber)) {
      return { valid: false, message: "Phone number must start with 9 and be 10 digits long.", focusTarget: field.phone };
    }
    if (payload.password.length < 6) {
      return { valid: false, message: '"password" must be at least 6 characters long.', focusTarget: field.password };
    }
    if (payload.password !== confirmPassword) {
      return { valid: false, message: '"password" and "confirm password" must match.', focusTarget: field.confirmPassword };
    }

    return { valid: true, message: "" };
  }

  function buildPayload() {
    const phone = normalizePhone(field.phone?.value);
    if (field.phone) {
      field.phone.value = phone;
    }
    syncSchedule();
    syncEmployeeIdField({ pad: true });
    [field.firstName, field.middleName, field.lastName].forEach(uppercaseNameInput);

    return {
      employeeId: text(field.employeeId),
      position: text(field.position),
      timeIn: text(field.timeIn),
      timeOut: text(field.timeOut),
      workHours: 8,
      firstName: uppercaseNameInitials(text(field.firstName)),
      middleName: uppercaseNameInitials(text(field.middleName)),
      lastName: uppercaseNameInitials(text(field.lastName)),
      suffix: text(field.suffix),
      email: text(field.email),
      address: text(field.address),
      countryCode: "+63",
      mobileNumber: phone,
      password: text(field.password),
      source: "web",
    };
  }

  function getAccountLabel(account) {
    const employeeId = String(account?.employeeId || account?.accountCode || account?.id || "Unknown ID").trim();
    const fullName = `${account?.firstName || ""} ${account?.lastName || ""}`.trim();
    return fullName ? `${employeeId} - ${fullName}` : employeeId;
  }

  function getApplicantNameKey(input) {
    return [
      input?.firstName,
      input?.middleName,
      input?.lastName,
      input?.suffix,
    ].map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ).join("|");
  }

  async function findExistingAccountConflict(payload) {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return null;
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const normalizedEmail = payload.email.toLowerCase();
    const applicantNameKey = getApplicantNameKey(payload);
    const existingEmployeeId = accounts.find((account) =>
      String(account?.employeeId || account?.accountCode || "").trim().toLowerCase() ===
      payload.employeeId.toLowerCase(),
    );
    if (existingEmployeeId) {
      return {
        message: `Employee ID is already registered under ${getAccountLabel(existingEmployeeId)}.`,
        focusTarget: field.employeeId,
      };
    }

    const existingEmail = accounts.find((account) =>
      String(account?.email || "").trim().toLowerCase() === normalizedEmail,
    );
    if (existingEmail) {
      return {
        message: `Email address is already registered under ${getAccountLabel(existingEmail)}.`,
        focusTarget: field.email,
      };
    }

    const existingPhone = accounts.find((account) =>
      normalizePhone(account?.mobileNumber || account?.phoneNumber || "") === payload.mobileNumber,
    );
    if (existingPhone) {
      return {
        message: `Phone number is already registered under ${getAccountLabel(existingPhone)}.`,
        focusTarget: field.phone,
      };
    }

    const existingApplicant = accounts.find((account) => getApplicantNameKey(account) === applicantNameKey);
    if (existingApplicant) {
      return {
        message: `Applicant already exist under ${getAccountLabel(existingApplicant)}.`,
        focusTarget: field.firstName,
      };
    }

    return null;
  }

  async function findExistingEmailAccount(emailValue) {
    const normalizedEmail = String(emailValue || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return null;
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    return accounts.find((account) =>
      String(account?.email || "").trim().toLowerCase() === normalizedEmail,
    ) || null;
  }

  function clearEmailDuplicateState() {
    field.email?.classList.remove("is-invalid");
    field.emailField?.classList.remove("is-invalid");
    if (field.emailStatus) {
      delete field.emailStatus.dataset.emailTooltip;
      field.emailStatus.removeAttribute("aria-label");
      field.emailStatus.removeAttribute("tabindex");
    }
    lastDuplicateEmailPopupValue = "";
  }

  async function validateEmailDuplicateNow(options = {}) {
    const emailValue = text(field.email);
    const requestId = ++emailValidationRequestId;
    const shouldShowPopup = options.showPopup ?? true;

    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      clearEmailDuplicateState();
      return { duplicate: false };
    }

    try {
      const existingEmailAccount = await findExistingEmailAccount(emailValue);
      if (requestId !== emailValidationRequestId) {
        return { duplicate: false, stale: true };
      }

      if (!existingEmailAccount) {
        clearEmailDuplicateState();
        return { duplicate: false };
      }

      const message = "Email already exists";
      field.email?.classList.add("is-invalid");
      field.emailField?.classList.add("is-invalid");
      if (field.emailStatus) {
        field.emailStatus.dataset.emailTooltip = message;
        field.emailStatus.setAttribute("aria-label", message);
        field.emailStatus.setAttribute("tabindex", "0");
      }
      const normalizedEmail = emailValue.toLowerCase();
      if (shouldShowPopup && normalizedEmail !== lastDuplicateEmailPopupValue) {
        lastDuplicateEmailPopupValue = normalizedEmail;
        openModal("Duplicate Email", message, {
          actionLabel: "Review Email",
          mode: "error",
        });
        window.setTimeout(() => field.email?.focus(), 0);
      }

      return { duplicate: true, account: existingEmailAccount };
    } catch (error) {
      console.warn("Unable to scan registered emails.", error);
      return { duplicate: false };
    }
  }

  function scheduleEmailDuplicateValidation() {
    window.clearTimeout(emailValidationTimer);
    field.email?.classList.remove("is-invalid");
    lastDuplicateEmailPopupValue = "";

    emailValidationTimer = window.setTimeout(() => {
      void validateEmailDuplicateNow({ showPopup: true });
    }, 450);
  }

  function resetForm() {
    form.reset();
    if (field.employeeId) {
      fallbackEmployeeIdSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      if (field.employeeIdNumber) {
        field.employeeIdNumber.value = fallbackEmployeeIdSuffix;
      }
      if (field.companyAcronym) {
        field.companyAcronym.value = loadCompanyAcronyms()[0] || "";
      }
      renderCompanyAcronymOptions();
      field.employeeId.value = generateEmployeeId();
      window.dispatchEvent(new CustomEvent("gms:register-employee-id-regenerate"));
    }
    setPosition("", "Select position");
    setTimeIn("", "Select time");
    lastPasswordMismatchKey = "";
    clearPasswordMismatchTimer();
    setPasswordTooltip(field.confirmPassword, "");
  }

  async function submitFallback(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isSaving) {
      return;
    }

    ensureInitialState();
    const payload = buildPayload();
    const confirmPassword = text(field.confirmPassword);
    const validation = validatePayload(payload, confirmPassword);
    if (!validation.valid) {
      if (validation.focusTarget === field.confirmPassword && /password.*confirm password.*match/i.test(validation.message)) {
        showPasswordMismatchTooltip();
        field.confirmPassword?.focus();
        return;
      }
      showError(validation.message, validation.focusTarget);
      return;
    }

    isSaving = true;
    submitButton.disabled = true;

    try {
      const conflict = await findExistingAccountConflict(payload);
      if (conflict) {
        showError(conflict.message, conflict.focusTarget);
        return;
      }

      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Unable to create employee account. Server returned ${response.status}.`);
      }

      resetForm();
      if (window.GMSAdminSuccessModal?.show) {
        window.GMSAdminSuccessModal.show({
          title: "Success",
          copy: "Employee account created successfully.",
        });
      } else {
        openModal("Success", "Employee account created successfully.", {
          actionLabel: "Done",
          mode: "success",
        });
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to create employee account.", submitButton);
    } finally {
      isSaving = false;
      submitButton.disabled = false;
    }
  }

  modalAction.addEventListener("click", closeModal);
  modalClose?.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });

  field.employeeIdNumber?.addEventListener("input", () => {
    field.employeeIdNumber.value = normalizeEmployeeIdNumber(field.employeeIdNumber.value);
    syncEmployeeIdField();
  });

  field.employeeIdNumber?.addEventListener("blur", () => {
    syncEmployeeIdField({ pad: true });
  });

  field.companyAcronymTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (field.companyAcronymTrigger.disabled || !loadCompanyAcronyms().length) {
      return;
    }
    if (field.companyAcronymMenu) {
      const shouldOpen = field.companyAcronymMenu.hidden;
      field.companyAcronymMenu.hidden = !shouldOpen;
      field.companyAcronymTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      field.companyAcronymMenu.parentElement?.classList.toggle("is-open", shouldOpen);
    }
  }, true);

  field.companyAcronymMenu?.addEventListener("click", (event) => {
    const option = event.target?.closest?.("[data-company-acronym-value]");
    if (!(option instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    setCompanyAcronym(option.dataset.companyAcronymValue || "");
    field.companyAcronymMenu.hidden = true;
    field.companyAcronymTrigger?.setAttribute("aria-expanded", "false");
    field.companyAcronymMenu.parentElement?.classList.remove("is-open");
    field.companyAcronymTrigger?.focus();
  }, true);

  field.positionTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (field.positionMenu) {
      const shouldOpen = field.positionMenu.hidden;
      field.positionMenu.hidden = !shouldOpen;
      field.positionTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      field.positionMenu.parentElement?.classList.toggle("is-open", shouldOpen);
    }
  }, true);
  field.positionMenu?.addEventListener("click", (event) => {
    const option = event.target?.closest?.("[data-position-value]");
    if (!(option instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    setPosition(option.dataset.positionValue || "", option.textContent.trim());
  }, true);

  field.timeInTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (field.timeInMenu) {
      const shouldOpen = field.timeInMenu.hidden;
      field.timeInMenu.hidden = !shouldOpen;
      field.timeInTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      field.timeInMenu.parentElement?.classList.toggle("is-open", shouldOpen);
    }
  }, true);
  field.timeInMenu?.querySelectorAll("[data-time-in-value]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTimeIn(option.dataset.timeInValue || "", option.textContent.trim());
    }, true);
  });

  field.phone?.addEventListener("input", () => {
    field.phone.value = normalizePhone(field.phone.value);
  });

  [field.firstName, field.middleName, field.lastName].forEach((input) => {
    input?.addEventListener("input", () => {
      uppercaseNameInput(input);
    });
    input?.addEventListener("change", () => {
      uppercaseNameInput(input);
    });
  });

  field.email?.addEventListener("input", scheduleEmailDuplicateValidation);
  field.email?.addEventListener("change", () => {
    void validateEmailDuplicateNow({ showPopup: true });
  });
  field.email?.addEventListener("blur", () => {
    void validateEmailDuplicateNow({ showPopup: true });
  });

  field.password?.addEventListener("input", () => {
    schedulePasswordMatchValidation();
  });
  field.confirmPassword?.addEventListener("input", () => {
    schedulePasswordMatchValidation();
  });
  field.password?.addEventListener("blur", () => {
    schedulePasswordMatchValidation({ force: true });
  });
  field.confirmPassword?.addEventListener("blur", () => {
    schedulePasswordMatchValidation({ force: true });
  });

  form.addEventListener("submit", submitFallback, true);
  submitButton.addEventListener("click", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    submitFallback(event);
  }, true);

  ensureInitialState();
}());
