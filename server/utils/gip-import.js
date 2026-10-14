// Reads an uploaded GIP Excel form and turns each row into applicant data.
const ExcelJS = require("exceljs");

const { HttpError } = require("../errors");
const { importApplicantSchema } = require("../schemas/import-applicant.schema");
const {
  COLUMNS,
  REQUIREMENT_COLUMNS,
  CLASSIFICATION_COLUMNS,
  HEADER_SEARCH_ROWS,
  MARK_CHARACTERS,
  MAX_IMPORT_ROWS,
} = require("../constants/gip-excel");

// ---------- small helpers ----------

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

// Text of a cell. cell.text also handles rich text, formulas and hyperlinks.
function cellText(cell) {
  if (cell.value === null || cell.value === undefined) return "";
  return String(cell.text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Peña" and "Pena" are treated as the same name when looking for duplicates.
const foldText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const personKey = (lastName, firstName, birthdate) =>
  `${foldText(lastName)}|${foldText(firstName)}|${birthdate}`;

const pad = (number) => String(number).padStart(2, "0");

function isoFromUtc(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// Builds YYYY-MM-DD, or null if the day/month do not exist (like 31/02).
function isoFromParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? isoFromUtc(date) : null;
}

// Excel date cells, Excel serial numbers, or text like 25/12/2003 (day first).
// Returns { value: 'YYYY-MM-DD' | '' } or { error: 'message' }.
function readDate(cell, label) {
  let raw = cell.value;

  if (
    raw &&
    typeof raw === "object" &&
    !(raw instanceof Date) &&
    "result" in raw
  ) {
    raw = raw.result; // formula cell
  }

  if (raw === null || raw === undefined || raw === "") return { value: "" };

  if (raw instanceof Date) return { value: isoFromUtc(raw) };

  if (typeof raw === "number") {
    const date = new Date(Math.round((raw - 25569) * 86400000));
    return Number.isNaN(date.getTime())
      ? { error: `${label} is not a valid date.` }
      : { value: isoFromUtc(date) };
  }

  const text = String(raw).trim();

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const iso = isoFromParts(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );
    return iso
      ? { value: iso }
      : { error: `${label} "${text}" is not a valid date.` };
  }

  match = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (match) {
    let year = Number(match[3]);
    if (match[3].length === 2) {
      year += year <= new Date().getFullYear() % 100 ? 2000 : 1900;
    }
    const iso = isoFromParts(year, Number(match[2]), Number(match[1]));
    if (iso) return { value: iso };
  }

  return { error: `${label} "${text}" is not a valid date. Use DD/MM/YYYY.` };
}

// "0912 345 6789" -> "09123456789", "+639123456789" -> "09123456789".
// A number that is a digit short is NOT fixed. It is reported instead.
function normalizeContact(text) {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("63"))
    return `0${digits.slice(2)}`;
  return digits;
}

function normalizeSex(text) {
  const value = text.toLowerCase();
  if (["male", "m"].includes(value)) return "Male";
  if (["female", "f"].includes(value)) return "Female";
  return null;
}

// S / M / W / SP (any case) or the full word.
const CIVIL_STATUS = {
  s: "Single",
  single: "Single",
  m: "Married",
  married: "Married",
  w: "Widowed",
  widowed: "Widowed",
  widow: "Widowed",
  widower: "Widowed",
  sp: "Separated",
  separated: "Separated",
};

function normalizeCivilStatus(text) {
  return CIVIL_STATUS[text.toLowerCase()] || null;
}

// ---------- reading the worksheet ----------

// Finds the sub-header row ("Last Name" | "First Name") so the import does not
// depend on a fixed row number. Returns 0 when the sheet has no header row.
function findHeaderRow(worksheet) {
  const lastRow = Math.min(worksheet.rowCount, HEADER_SEARCH_ROWS);

  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber++) {
    const last = normalizeHeader(
      worksheet.getCell(rowNumber, COLUMNS.lastName).text,
    );
    const first = normalizeHeader(
      worksheet.getCell(rowNumber, COLUMNS.firstName).text,
    );

    if (last.startsWith("LAST NAME") && first.startsWith("FIRST NAME")) {
      return rowNumber;
    }
  }

  return 0;
}

// A row counts as empty when none of the data columns has anything in it
// (NO. and Age are ignored because blank forms may already have them).
function isBlankRow(worksheet, rowNumber) {
  const columns = [
    COLUMNS.lastName,
    COLUMNS.firstName,
    COLUMNS.middleName,
    COLUMNS.extensionName,
    COLUMNS.birthdate,
    COLUMNS.barangay,
    COLUMNS.municipality,
    COLUMNS.province,
    COLUMNS.course,
    COLUMNS.email,
    COLUMNS.contactNumber,
    COLUMNS.sex,
    COLUMNS.civilStatus,
    COLUMNS.remarks,
    COLUMNS.supportingDocuments,
    COLUMNS.dateApplied,
    ...Object.values(REQUIREMENT_COLUMNS),
    ...CLASSIFICATION_COLUMNS.map((item) => item.column),
  ];

  return columns.every(
    (column) => cellText(worksheet.getCell(rowNumber, column)) === "",
  );
}

// Reads one row. Returns { row, name, data, errors, warnings }.
function readRow(worksheet, rowNumber) {
  const cell = (column) => worksheet.getCell(rowNumber, column);
  const text = (column) => cellText(cell(column));

  const fieldErrors = {}; // field name -> message (our own checks)
  const warnings = [];

  // Marks: a check mark means yes. Other text is ignored with a warning.
  const isMarked = (column, label) => {
    const value = text(column);
    if (!value) return false;
    if (MARK_CHARACTERS.includes(value)) return true;
    warnings.push(
      `"${value}" in ${label} is not a check mark, so it was left unchecked.`,
    );
    return false;
  };

  const requirementLabels = {
    gipForm: "GUWIP FORM",
    resume: "RESUME",
    validId: "VALID ID",
    psa: "PSA",
    diploma: "DIPLOMA",
    tor: "TOR",
  };
  const requirements = {};
  for (const [key, column] of Object.entries(REQUIREMENT_COLUMNS)) {
    requirements[key] = isMarked(column, requirementLabels[key]);
  }

  const classifications = CLASSIFICATION_COLUMNS.filter(({ column, name }) =>
    isMarked(column, name.toUpperCase()),
  ).map(({ name }) => name);

  const birthday = readDate(cell(COLUMNS.birthdate), "Birthday");
  if (birthday.error) fieldErrors.birthdate = birthday.error;
  else if (!birthday.value) fieldErrors.birthdate = "Birthday is required.";

  const applied = readDate(cell(COLUMNS.dateApplied), "Date applied");
  if (applied.error) fieldErrors.dateApplied = applied.error;

  const sexText = text(COLUMNS.sex);
  const sex = normalizeSex(sexText);
  if (sexText && !sex)
    fieldErrors.sex = `Sex must be Male or Female (found "${sexText}").`;

  const civilText = text(COLUMNS.civilStatus);
  const civilStatus = normalizeCivilStatus(civilText);
  if (civilText && !civilStatus) {
    fieldErrors.civilStatus = `Civil status must be Single (S), Married (M), Widowed (W) or Separated (SP) (found "${civilText}").`;
  }

  let contactNumber = normalizeContact(text(COLUMNS.contactNumber));

  if (contactNumber.length === 10 && contactNumber.startsWith("9")) {
    contactNumber = `0${contactNumber}`;
  }

  if (!/^09\d{9}$/.test(contactNumber)) {
    fieldErrors.contactNumber =
      "Contact number must be 10 digits starting with 9 or 11 digits starting with 09.";
  }

  const raw = {
    lastName: text(COLUMNS.lastName),
    firstName: text(COLUMNS.firstName),
    middleName: text(COLUMNS.middleName),
    extensionName: text(COLUMNS.extensionName),
    birthdate: birthday.value || "",
    sex: sex || "",
    civilStatus: civilStatus || "",
    barangay: text(COLUMNS.barangay),
    municipality: text(COLUMNS.municipality),
    province: text(COLUMNS.province),
    course: text(COLUMNS.course),
    email: text(COLUMNS.email).toLowerCase(),
    contactNumber,
    classifications,
    dateApplied: applied.value || "",
    remarks: text(COLUMNS.remarks),
    requirements,
    supportingDocuments: text(COLUMNS.supportingDocuments),
  };

  const result = importApplicantSchema.safeParse(raw);
  const errors = { ...fieldErrors };

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] ?? "row";
      if (!errors[field]) errors[field] = issue.message; // our friendlier message wins
    }
  }

  const name = [
    raw.lastName && `${raw.lastName},`,
    raw.firstName,
    raw.middleName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    row: rowNumber,
    name: name || "(no name)",
    birthdate: raw.birthdate,
    data: result.success && !Object.keys(errors).length ? result.data : null,
    raw,
    errors: Object.values(errors),
    warnings,
  };
}

async function readGipWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new HttpError(
      400,
      "The file could not be read. Make sure it is a valid .xlsx file.",
    );
  }

  // Use the first sheet that has a header row, otherwise the first sheet.
  const worksheet =
    workbook.worksheets.find((sheet) => findHeaderRow(sheet) > 0) ||
    workbook.worksheets[0];

  if (!worksheet) {
    throw new HttpError(400, "The file has no sheets.");
  }

  // People start right after the header row (or on row 1 without a header).
  const firstDataRow = findHeaderRow(worksheet) + 1;
  const rows = [];

  for (
    let rowNumber = firstDataRow;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    if (isBlankRow(worksheet, rowNumber)) continue;

    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new HttpError(
        400,
        `The file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`,
      );
    }

    rows.push(readRow(worksheet, rowNumber));
  }

  if (!rows.length) {
    throw new HttpError(400, "No applicant rows were found in this file.");
  }

  return rows;
}

// ---------- duplicates ----------

// Looks up people who are already in the database (any batch).
// Returns Map(personKey -> batch names).
async function findExistingPeople(executor, people) {
  const tuples = [
    ...new Map(
      people.map((p) => [
        personKey(p.lastName, p.firstName, p.birthdate),
        [p.lastName, p.firstName, p.birthdate],
      ]),
    ).values(),
  ];

  const existing = new Map();
  if (!tuples.length) return existing;

  const [rows] = await executor.query(
    `SELECT a.last_name, a.first_name, a.birthdate, b.name AS batch_name
     FROM applicants a
     LEFT JOIN applications ap ON ap.applicant_id = a.id
     LEFT JOIN gip_batches b ON b.id = ap.batch_id
     WHERE (a.last_name, a.first_name, a.birthdate) IN (?)`,
    [tuples],
  );

  for (const row of rows) {
    const key = personKey(row.last_name, row.first_name, row.birthdate);
    if (!existing.has(key)) existing.set(key, []);
    if (row.batch_name) existing.get(key).push(row.batch_name);
  }

  return existing;
}

// ---------- preview ----------

/**
 * Reads the file and reports what WOULD happen. Nothing is saved.
 * Row statuses: 'new', 'duplicate' (will be skipped) or 'error'.
 */
async function buildImportPreview(executor, buffer) {
  const parsed = await readGipWorkbook(buffer);

  const valid = parsed.filter((item) => item.data);
  const existing = await findExistingPeople(
    executor,
    valid.map((item) => item.data),
  );

  const seenInFile = new Map();
  const rows = parsed.map((item) => {
    const base = {
      row: item.row,
      name: item.name,
      birthdate: item.birthdate,
      warnings: item.warnings,
    };

    if (!item.data) {
      return { ...base, status: "error", messages: item.errors, data: null };
    }

    const key = personKey(
      item.data.lastName,
      item.data.firstName,
      item.data.birthdate,
    );

    if (existing.has(key)) {
      const where = [...new Set(existing.get(key))].join(", ");
      return {
        ...base,
        status: "duplicate",
        messages: [
          `Already in the system${where ? ` (${where})` : ""}. It will be skipped.`,
        ],
        data: null,
      };
    }

    if (seenInFile.has(key)) {
      return {
        ...base,
        status: "duplicate",
        messages: [
          `Same name and birthday as row ${seenInFile.get(key)} in this file. It will be skipped.`,
        ],
        data: null,
      };
    }

    seenInFile.set(key, item.row);
    return { ...base, status: "new", messages: [], data: item.data };
  });

  const count = (status) => rows.filter((row) => row.status === status).length;

  return {
    summary: {
      total: rows.length,
      new: count("new"),
      duplicates: count("duplicate"),
      errors: count("error"),
    },
    rows,
  };
}

module.exports = { buildImportPreview, findExistingPeople, personKey };
