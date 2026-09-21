"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const { hashPassword, verifyPassword, looksLikeBcryptHash } = require("../db/password");
const {
  normalizeEmail,
  normalizePhone,
  toIso,
  coerceAccountStatus,
  stripInternalFields,
  asObject,
} = require("../db/accountHelpers");

const EMPLOYEE_SELECT = `
  SELECT
    a.id,
    a.account_code,
    a.role,
    a.email,
    a.password_hash,
    a.country_code,
    a.mobile_number,
    a.status::text AS status,
    a.profile_image_url,
    a.email_verified,
    a.mobile_verified,
    a.last_login_at,
    a.last_active_at,
    a.password_updated_at,
    a.is_online,
    a.presence_status,
    a.presence_updated_at,
    a.created_at,
    a.updated_at,
    e.admin_id,
    e.employee_id,
    e.position,
    e.department,
    e.employment_type,
    e.employee_role,
    e.time_in,
    e.time_out,
    e.work_hours,
    e.supervisor,
    e.start_date,
    e.face_verified,
    e.verified_at,
    e.first_name,
    e.middle_name,
    e.last_name,
    e.suffix,
    e.address,
    e.date_of_birth,
    e.gender,
    e.username,
    e.access_permissions,
    e.access_permission_granted_at,
    e.access_permissions_configured,
    e.e_document,
    e.profile_data
  FROM accounts a
  INNER JOIN employee_profiles e ON e.account_id = a.id
  WHERE a.role = 'employee'
`;

function parseEmployeeLoginId(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  const match = normalized.match(/^(?:([A-Z0-9]{2,8})-)?(\d{6})$/);
  if (!match) {
    return { hasAcronym: false, acronym: "", number: "" };
  }
  return {
    hasAcronym: Boolean(match[1]),
    acronym: match[1] || "",
    number: match[2] || "",
  };
}

function normalizeEmployeeLoginId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function isEmployeeLoginIdentifierMatch(inputValue, accountValue) {
  const inputId = parseEmployeeLoginId(inputValue);
  const accountId = parseEmployeeLoginId(accountValue);
  if (!inputId.number || !accountId.number) {
    return false;
  }
  if (inputId.hasAcronym) {
    return inputId.acronym === accountId.acronym && inputId.number === accountId.number;
  }
  return inputId.number === accountId.number;
}

function buildEmployeeAccount(row) {
  if (!row) {
    return null;
  }

  const extra = asObject(row.profile_data);
  const eDocument = asObject(row.e_document);
  const accessPermissions = Array.isArray(row.access_permissions)
    ? row.access_permissions
    : [];

  return {
    ...extra,
    id: row.id,
    accountCode: row.account_code || row.employee_id || "",
    employeeId: row.employee_id || "",
    position: row.position || "",
    timeIn: row.time_in || "",
    timeOut: row.time_out || "",
    workHours: Number(row.work_hours) || 0,
    firstName: row.first_name || "",
    middleName: row.middle_name || "",
    lastName: row.last_name || "",
    suffix: row.suffix || "",
    email: row.email || "",
    address: row.address || "",
    department: row.department || "",
    employmentType: row.employment_type || "Regular",
    dateOfBirth: row.date_of_birth || "",
    gender: row.gender || "",
    startDate: row.start_date || "",
    supervisor: row.supervisor || "",
    username: row.username || row.email || "",
    employeeRole: row.employee_role || "Employee",
    status: row.status || "active",
    countryCode: row.country_code || "+63",
    mobileNumber: row.mobile_number || "",
    password: "",
    eDocument: {
      type: eDocument.type || "",
      label: eDocument.label || "",
      fileName: eDocument.fileName || "",
      fileExtension: eDocument.fileExtension || "",
      url: eDocument.url || "",
      uploadedAt: eDocument.uploadedAt || null,
    },
    profileImageUrl: row.profile_image_url || "",
    gmailBinding: extra.gmailBinding || null,
    accessPermissions,
    accessPermissionGrantedAt: asObject(row.access_permission_granted_at),
    accessPermissionsConfigured: Boolean(row.access_permissions_configured),
    role: "employee",
    source: "web",
    faceVerified: Boolean(row.face_verified),
    verifiedAt: toIso(row.verified_at),
    passwordUpdatedAt: toIso(row.password_updated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    adminId: row.admin_id || "",
    lastLoginAt: toIso(row.last_login_at),
    lastActiveAt: toIso(row.last_active_at),
    isOnline: Boolean(row.is_online),
    online: Boolean(row.is_online),
    presenceStatus: row.presence_status || "offline",
    onlineStatus: row.presence_status || "offline",
    presenceUpdatedAt: toIso(row.presence_updated_at),
    _passwordHash: row.password_hash,
  };
}

async function isEmployeePostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    await getPool();
    return true;
  } catch (_) {
    return false;
  }
}

async function findEmployeeById(accountId) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return null;
  }
  const result = await query(`${EMPLOYEE_SELECT} AND a.id = $1 LIMIT 1`, [id]);
  return buildEmployeeAccount(result.rows[0]);
}

async function listEmployeeLoginMatches(employeeId) {
  const normalized = normalizeEmployeeLoginId(employeeId);
  if (!normalized) {
    return [];
  }

  const result = await query(EMPLOYEE_SELECT);
  const employees = result.rows.map(buildEmployeeAccount).filter(Boolean);

  const exactMatches = employees.filter(
    (candidate) => normalizeEmployeeLoginId(candidate.employeeId) === normalized,
  );
  const exactSet = new Set(exactMatches);
  const flexibleMatches = employees.filter(
    (candidate) =>
      !exactSet.has(candidate) &&
      isEmployeeLoginIdentifierMatch(normalized, candidate.employeeId),
  );

  return [...exactMatches, ...flexibleMatches];
}

async function findEmployeeLoginCandidate(employeeId) {
  const matches = await listEmployeeLoginMatches(employeeId);
  return matches[0] || null;
}

async function assertEmployeeUnique({
  adminId,
  employeeId,
  email,
  countryCode,
  mobileNumber,
  excludeId = null,
}) {
  const normalizedAdminId = String(adminId ?? "").trim();
  const normalizedEmployeeId = String(employeeId ?? "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizePhone(mobileNumber);
  const normalizedCountry = String(countryCode ?? "+63").trim() || "+63";

  if (normalizedEmployeeId) {
    const employeeIdResult = await query(
      `
        SELECT account_id FROM employee_profiles
        WHERE admin_id = $1 AND lower(employee_id) = lower($2)
          AND ($3::text IS NULL OR account_id <> $3)
        LIMIT 1
      `,
      [normalizedAdminId, normalizedEmployeeId, excludeId],
    );
    if (employeeIdResult.rowCount > 0) {
      throw new Error("Employee ID already exists.");
    }
  }

  if (normalizedEmail) {
    const emailResult = await query(
      `
        SELECT a.id
        FROM accounts a
        INNER JOIN employee_profiles e ON e.account_id = a.id
        WHERE a.role = 'employee'
          AND e.admin_id = $1
          AND lower(a.email) = $2
          AND ($3::text IS NULL OR a.id <> $3)
        LIMIT 1
      `,
      [normalizedAdminId, normalizedEmail, excludeId],
    );
    if (emailResult.rowCount > 0) {
      throw new Error("Email address is already registered.");
    }
  }

  if (normalizedMobile) {
    const mobileResult = await query(
      `
        SELECT a.id
        FROM accounts a
        INNER JOIN employee_profiles e ON e.account_id = a.id
        WHERE a.role = 'employee'
          AND e.admin_id = $1
          AND a.country_code = $2
          AND a.mobile_number = $3
          AND ($4::text IS NULL OR a.id <> $4)
        LIMIT 1
      `,
      [normalizedAdminId, normalizedCountry, normalizedMobile, excludeId],
    );
    if (mobileResult.rowCount > 0) {
      throw new Error("Phone number is already registered.");
    }
  }
}

async function createEmployeeAccount(normalizedAccount) {
  const email = normalizeEmail(normalizedAccount.email);
  const password = String(normalizedAccount.password ?? "").trim();
  const adminId = String(normalizedAccount.adminId ?? "").trim();
  const employeeId = String(normalizedAccount.employeeId ?? "").trim();
  const countryCode = String(normalizedAccount.countryCode ?? "+63").trim() || "+63";
  const mobileNumber = normalizePhone(normalizedAccount.mobileNumber);
  const firstName = String(normalizedAccount.firstName ?? "").trim();
  const lastName = String(normalizedAccount.lastName ?? "").trim();
  const position = String(normalizedAccount.position ?? "").trim();

  if (!adminId) {
    throw new Error("Admin workspace is required for employee accounts.");
  }
  if (firstName.length < 2 || lastName.length < 2) {
    throw new Error("First name and last name must be at least 2 characters long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (!/^(?:[A-Z0-9]{2,8}-)?\d{6}$/i.test(employeeId)) {
    throw new Error("Employee ID must be a 6-digit number or follow the ABC-012345 format.");
  }
  if (position.length < 2) {
    throw new Error("Position is required.");
  }

  await assertEmployeeUnique({
    adminId,
    employeeId,
    email,
    countryCode,
    mobileNumber,
  });

  const id = String(normalizedAccount.id ?? "").trim() || `acct-${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const accessPermissions = Array.isArray(normalizedAccount.accessPermissions)
    ? normalizedAccount.accessPermissions.map((value) => String(value))
    : [];

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          password_updated_at, created_at, updated_at
        ) VALUES (
          $1, $2, 'employee', $3, $4,
          $5, $6, $7::account_status, $8,
          $9, $10, $11
        )
      `,
      [
        id,
        String(normalizedAccount.accountCode ?? employeeId),
        email,
        passwordHash,
        countryCode,
        mobileNumber,
        coerceAccountStatus(normalizedAccount.status),
        String(normalizedAccount.profileImageUrl ?? "").trim(),
        toIso(normalizedAccount.passwordUpdatedAt) || now,
        toIso(normalizedAccount.createdAt) || now,
        toIso(normalizedAccount.updatedAt) || now,
      ],
    );

    await client.query(
      `
        INSERT INTO employee_profiles (
          account_id, admin_id, employee_id, position, department,
          employment_type, employee_role, time_in, time_out, work_hours,
          supervisor, start_date, face_verified, verified_at,
          first_name, middle_name, last_name, suffix, address,
          date_of_birth, gender, username,
          access_permissions, access_permission_granted_at,
          access_permissions_configured, e_document, profile_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22,
          $23, $24::jsonb,
          $25, $26::jsonb, $27::jsonb,
          $28, $29
        )
      `,
      [
        id,
        adminId,
        employeeId,
        position,
        String(normalizedAccount.department ?? "").trim(),
        String(normalizedAccount.employmentType ?? "Regular").trim() || "Regular",
        String(normalizedAccount.employeeRole ?? "Employee").trim() || "Employee",
        String(normalizedAccount.timeIn ?? "").trim(),
        String(normalizedAccount.timeOut ?? "").trim(),
        Number(normalizedAccount.workHours) || 8,
        String(normalizedAccount.supervisor ?? "").trim(),
        String(normalizedAccount.startDate ?? "").trim(),
        Boolean(normalizedAccount.faceVerified),
        toIso(normalizedAccount.verifiedAt),
        firstName,
        String(normalizedAccount.middleName ?? "").trim(),
        lastName,
        String(normalizedAccount.suffix ?? "").trim(),
        String(normalizedAccount.address ?? "").trim(),
        String(normalizedAccount.dateOfBirth ?? "").trim(),
        String(normalizedAccount.gender ?? "").trim(),
        String(normalizedAccount.username ?? email).trim().toLowerCase(),
        accessPermissions,
        JSON.stringify(asObject(normalizedAccount.accessPermissionGrantedAt)),
        Boolean(normalizedAccount.accessPermissionsConfigured),
        JSON.stringify(asObject(normalizedAccount.eDocument)),
        JSON.stringify({
          gmailBinding: normalizedAccount.gmailBinding || null,
        }),
        toIso(normalizedAccount.createdAt) || now,
        toIso(normalizedAccount.updatedAt) || now,
      ],
    );

    for (const permission of accessPermissions) {
      await client.query(
        `
          INSERT INTO employee_permissions (account_id, permission_key, granted_at)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `,
        [
          id,
          permission,
          toIso(normalizedAccount.accessPermissionGrantedAt?.[permission]) || now,
        ],
      );
    }
  });

  return findEmployeeById(id);
}

async function loginEmployee({ employeeId, password }) {
  const matches = await listEmployeeLoginMatches(employeeId);
  if (!matches.length) {
    return { ok: false, code: "not_found", message: "Employee ID or password is incorrect." };
  }

  for (const candidate of matches) {
    const valid = await verifyPassword(password, candidate._passwordHash);
    if (valid) {
      const now = new Date().toISOString();
      await query(
        `
          UPDATE accounts
          SET
            last_login_at = $2,
            last_active_at = $2,
            is_online = TRUE,
            presence_status = 'online',
            presence_updated_at = $2,
            updated_at = $2
          WHERE id = $1
        `,
        [candidate.id, now],
      );
      const updated = await findEmployeeById(candidate.id);
      return { ok: true, account: stripInternalFields(updated || candidate) };
    }
  }

  return { ok: false, code: "bad_password", message: "Employee ID or password is incorrect." };
}

async function upsertEmployeeFromLegacyRecord(legacyAccount, plainPassword = null) {
  if (!legacyAccount || typeof legacyAccount !== "object") {
    return null;
  }

  const email = normalizeEmail(legacyAccount.email);
  const adminId = String(legacyAccount.adminId ?? "").trim();
  const employeeId = String(legacyAccount.employeeId ?? legacyAccount.accountCode ?? "").trim();
  if (!email || !adminId || !employeeId) {
    throw new Error("Employee migration requires email, adminId, and employeeId.");
  }

  const existingMatches = await listEmployeeLoginMatches(employeeId);
  const existing =
    existingMatches.find((candidate) => candidate.adminId === adminId) ||
    existingMatches[0] ||
    null;

  const passwordSource = plainPassword ?? legacyAccount.password ?? "";
  const passwordHash = passwordSource
    ? looksLikeBcryptHash(passwordSource)
      ? String(passwordSource)
      : await hashPassword(String(passwordSource))
    : existing?._passwordHash;

  if (!passwordHash) {
    throw new Error(`Cannot migrate employee ${employeeId}: missing password.`);
  }

  const id = String(existing?.id ?? legacyAccount.id ?? `acct-${Date.now()}`).trim();
  const now = new Date().toISOString();
  const accessPermissions = Array.isArray(legacyAccount.accessPermissions)
    ? legacyAccount.accessPermissions.map((value) => String(value))
    : [];

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          password_updated_at, created_at, updated_at
        ) VALUES (
          $1, $2, 'employee', $3, $4,
          $5, $6, $7::account_status, $8,
          $9, $10, $11
        )
        ON CONFLICT (id) DO UPDATE SET
          account_code = EXCLUDED.account_code,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          country_code = EXCLUDED.country_code,
          mobile_number = EXCLUDED.mobile_number,
          status = EXCLUDED.status,
          profile_image_url = EXCLUDED.profile_image_url,
          password_updated_at = EXCLUDED.password_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        id,
        String(legacyAccount.accountCode ?? employeeId),
        email,
        passwordHash,
        String(legacyAccount.countryCode ?? "+63").trim() || "+63",
        normalizePhone(legacyAccount.mobileNumber),
        coerceAccountStatus(legacyAccount.status),
        String(legacyAccount.profileImageUrl ?? "").trim(),
        toIso(legacyAccount.passwordUpdatedAt) || now,
        toIso(legacyAccount.createdAt) || now,
        toIso(legacyAccount.updatedAt) || now,
      ],
    );

    await client.query(
      `
        INSERT INTO employee_profiles (
          account_id, admin_id, employee_id, position, department,
          employment_type, employee_role, time_in, time_out, work_hours,
          supervisor, start_date, face_verified, verified_at,
          first_name, middle_name, last_name, suffix, address,
          date_of_birth, gender, username,
          access_permissions, access_permission_granted_at,
          access_permissions_configured, e_document, profile_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22,
          $23, $24::jsonb,
          $25, $26::jsonb, $27::jsonb,
          $28, $29
        )
        ON CONFLICT (account_id) DO UPDATE SET
          admin_id = EXCLUDED.admin_id,
          employee_id = EXCLUDED.employee_id,
          position = EXCLUDED.position,
          department = EXCLUDED.department,
          employment_type = EXCLUDED.employment_type,
          employee_role = EXCLUDED.employee_role,
          time_in = EXCLUDED.time_in,
          time_out = EXCLUDED.time_out,
          work_hours = EXCLUDED.work_hours,
          supervisor = EXCLUDED.supervisor,
          start_date = EXCLUDED.start_date,
          face_verified = EXCLUDED.face_verified,
          verified_at = EXCLUDED.verified_at,
          first_name = EXCLUDED.first_name,
          middle_name = EXCLUDED.middle_name,
          last_name = EXCLUDED.last_name,
          suffix = EXCLUDED.suffix,
          address = EXCLUDED.address,
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          username = EXCLUDED.username,
          access_permissions = EXCLUDED.access_permissions,
          access_permission_granted_at = EXCLUDED.access_permission_granted_at,
          access_permissions_configured = EXCLUDED.access_permissions_configured,
          e_document = EXCLUDED.e_document,
          profile_data = EXCLUDED.profile_data,
          updated_at = EXCLUDED.updated_at
      `,
      [
        id,
        adminId,
        employeeId,
        String(legacyAccount.position ?? "Employee").trim() || "Employee",
        String(legacyAccount.department ?? "").trim(),
        String(legacyAccount.employmentType ?? "Regular").trim() || "Regular",
        String(legacyAccount.employeeRole ?? "Employee").trim() || "Employee",
        String(legacyAccount.timeIn ?? "").trim(),
        String(legacyAccount.timeOut ?? "").trim(),
        Number(legacyAccount.workHours) || 8,
        String(legacyAccount.supervisor ?? "").trim(),
        String(legacyAccount.startDate ?? "").trim(),
        Boolean(legacyAccount.faceVerified),
        toIso(legacyAccount.verifiedAt),
        String(legacyAccount.firstName ?? "").trim() || "Employee",
        String(legacyAccount.middleName ?? "").trim(),
        String(legacyAccount.lastName ?? "").trim() || "Account",
        String(legacyAccount.suffix ?? "").trim(),
        String(legacyAccount.address ?? "").trim(),
        String(legacyAccount.dateOfBirth ?? "").trim(),
        String(legacyAccount.gender ?? "").trim(),
        String(legacyAccount.username ?? email).trim().toLowerCase(),
        accessPermissions,
        JSON.stringify(asObject(legacyAccount.accessPermissionGrantedAt)),
        Boolean(legacyAccount.accessPermissionsConfigured),
        JSON.stringify(asObject(legacyAccount.eDocument)),
        JSON.stringify({ gmailBinding: legacyAccount.gmailBinding || null }),
        toIso(legacyAccount.createdAt) || now,
        toIso(legacyAccount.updatedAt) || now,
      ],
    );
  });

  return findEmployeeById(id);
}

async function listEmployees() {
  const result = await query(`${EMPLOYEE_SELECT} ORDER BY a.created_at DESC`);
  return result.rows.map(buildEmployeeAccount).filter(Boolean);
}

module.exports = {
  isEmployeePostgresReady,
  findEmployeeById,
  findEmployeeLoginCandidate,
  listEmployeeLoginMatches,
  createEmployeeAccount,
  loginEmployee,
  upsertEmployeeFromLegacyRecord,
  listEmployees,
  stripInternalFields,
};
