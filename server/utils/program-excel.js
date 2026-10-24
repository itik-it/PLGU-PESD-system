// Excel export / import for GUWIP, DOKTOR, TRPATU and SAGUT.
// The export fills templates/<program>-template.xlsx (like gip-export.js does for GIP);
// the columns come from constants/program-excel.js.
const path = require('path')
const ExcelJS = require('exceljs')

const { HttpError } = require('../errors')
const { FIRST_DATA_ROW, LAST_TEMPLATE_ROW, MARK, MARK_CHARACTERS, HEADER_SEARCH_ROWS, MAX_IMPORT_ROWS } = require('../constants/gip-excel')
const { LAYOUT, PROGRAMS } = require('../constants/program-excel')
const { calculateAge } = require('./applicant.utils')

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates')
const DATE_FORMAT = 'dd/mm/yyyy'
const pad = (n) => String(n).padStart(2, '0')

function getProgram(key) {
  const program = PROGRAMS[key]
  if (!program) throw new Error(`Unknown program: ${key}`)
  return program
}

// ---------- small helpers ----------

const str = (v) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim())
const fold = (v) => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
const normalizeHeader = (v) => String(v ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
const todayIso = () => {
  const n = new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
}
const toSheetName = (name) => name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
const toExcelDate = (value) => {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

// ---------- reading cells ----------

const rawText = (cell) => (cell.value === null || cell.value === undefined ? '' : String(cell.text ?? '').trim())
const cellText = (cell) => rawText(cell).replace(/\s+/g, ' ')

const isoFromUtc = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
function isoFromParts(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day))
  const ok = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  return ok ? isoFromUtc(d) : null
}

// Excel date cell, Excel serial number, YYYY-MM-DD or DD/MM/YYYY text.
function readDate(cell, label) {
  let raw = cell.value
  if (raw && typeof raw === 'object' && !(raw instanceof Date) && 'result' in raw) raw = raw.result
  if (raw === null || raw === undefined || raw === '') return { value: '' }
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? { error: `${label} is not a valid date.` } : { value: isoFromUtc(raw) }
  if (typeof raw === 'number') {
    const d = new Date(Math.round((raw - 25569) * 86400000))
    return Number.isNaN(d.getTime()) ? { error: `${label} is not a valid date.` } : { value: isoFromUtc(d) }
  }
  const text = (typeof raw === 'object' ? cellText(cell) : String(raw)).trim()
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const iso = isoFromParts(+m[1], +m[2], +m[3])
    return iso ? { value: iso } : { error: `${label} "${text}" is not a valid date.` }
  }
  m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/)
  if (m) {
    let year = +m[3]
    if (m[3].length === 2) year += year <= new Date().getFullYear() % 100 ? 2000 : 1900
    const iso = isoFromParts(year, +m[2], +m[1])
    if (iso) return { value: iso }
  }
  return { error: `${label} "${text}" is not a valid date. Use DD/MM/YYYY.` }
}

const MARKS = new Set([...MARK_CHARACTERS, 'x', 'yes', 'y', 'true'])
const isMarked = (text) => MARKS.has(text.toLowerCase())

// "Title | Hours | Date" per line -> [{ title, hours, dateConducted }]
function parseTrainings(raw) {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = '', hours = '', ...rest] = line.split('|').map((p) => p.trim())
      return { title, hours, dateConducted: rest.join(' | ') }
    })
}

// ---------- validation (used for the Excel file AND again when saving) ----------

function normalizePhone(value) {
  const compact = value.replace(/[\s\-().]/g, '')
  const intl = compact.match(/^\+?63(9\d{9})$/)
  if (intl) return `0${intl[1]}`
  if (/^9\d{9}$/.test(compact)) return `0${compact}`
  return compact.length === value.length || /^\+?\d+$/.test(compact) ? compact : value
}

/**
 * Checks one record (keys as in the app's API) and returns { data, errors }.
 * `data` holds every column of the program in its clean form.
 */
function validateRecord(programKey, input) {
  const program = getProgram(programKey)
  const data = {}
  const errors = []
  const today = todayIso()

  for (const col of program.columns) {
    const raw = input?.[col.key]
    const label = col.header
    const fail = (message) => errors.push(message)

    if (col.type === 'check') {
      data[col.key] = raw === true
      continue
    }

    if (col.type === 'trainings') {
      const list = Array.isArray(raw) ? raw : []
      data[col.key] = []
      list.forEach((t, i) => {
        const title = str(t?.title)
        if (!title) return
        const hours = str(t?.hours)
        const dateConducted = str(t?.dateConducted)
        if (title.length > 200) fail(`Training ${i + 1}: title must be 200 characters or fewer.`)
        else if (hours !== '' && (!Number.isFinite(Number(hours)) || Number(hours) < 0)) fail(`Training "${title}": hours must be a number.`)
        else if (dateConducted.length > 100) fail(`Training "${title}": date must be 100 characters or fewer.`)
        else data[col.key].push({ title, hours: hours === '' ? '' : Number(hours), dateConducted })
      })
      continue
    }

    let value = str(raw)
    if (!value && col.default) value = col.default
    if (!value) {
      data[col.key] = ''
      if (col.required) fail(`${label} is required.`)
      continue
    }

    switch (col.type) {
      case 'phone':
        value = normalizePhone(value)
        break
      case 'email':
        value = value.toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(`${label} "${value}" is not a valid email address.`)
        break
      case 'enum': {
        const match = col.lookup.get(value.toLowerCase())
        if (match) value = match
        else fail(`${label} must be one of: ${col.options.join(', ')} (found "${value}").`)
        break
      }
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isoFromParts(+value.slice(0, 4), +value.slice(5, 7), +value.slice(8, 10))) {
          fail(`${label} "${value}" is not a valid date.`)
        } else if (!col.allowFuture && value > today) fail(`${label} cannot be in the future.`)
        break
      case 'number': {
        const n = Number(value.replace(/[,\s₱]|php/gi, ''))
        if (!Number.isFinite(n)) fail(`${label} must be a number (found "${value}").`)
        else if (n < (col.min ?? 0)) fail(`${label} must be ${col.min ?? 0} or more.`)
        else if (col.max !== undefined && n > col.max) fail(`${label} must be ${col.max} or less.`)
        else if (col.int && !Number.isInteger(n)) fail(`${label} must be a whole number.`)
        else value = n
        break
      }
      default:
        break
    }

    if (typeof value === 'string' && col.max && value.length > col.max) fail(`${label} must be ${col.max} characters or fewer.`)
    data[col.key] = value
  }

  if (program.deriveAge && data.age === '' && /^\d{4}-\d{2}-\d{2}$/.test(data.birthdate || '')) {
    const age = calculateAge(data.birthdate)
    if (age >= 0 && age <= 120) data.age = age
  }

  return { data, errors }
}

// ---------- export ----------
// Same idea as gip-export.js: the program's own template (server/templates/<program>-template.xlsx)
// is filled in. Letterhead, logos, column widths and header rows are NOT touched; the data goes
// under the header row, and every form row gets the GIP data-row look (20 pt, thin borders,
// middle-aligned).

const GIP_TEMPLATE = path.join(TEMPLATE_DIR, 'gip-template.xlsx')
const CLONE = (v) => (v ? JSON.parse(JSON.stringify(v)) : undefined)
const THIN_BORDER = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
const FALLBACK_FONT = { name: 'Aptos Narrow', size: 20, color: { theme: 1 }, family: 2, scheme: 'minor' }

function templatePath(programKey) {
  return path.join(TEMPLATE_DIR, `${programKey}-template.xlsx`)
}

// Font, border and row height of the GIP form's data rows (the look every program copies).
async function readGipDataLook() {
  const look = { font: FALLBACK_FONT, border: THIN_BORDER, height: 51.6 }
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(GIP_TEMPLATE)
    const sheet = workbook.worksheets[0]
    const cell = sheet.getCell(FIRST_DATA_ROW, 3)
    if (cell.font?.name) look.font = { ...CLONE(cell.font), size: 20 }
    if (cell.border?.top) look.border = CLONE(cell.border)
    if (sheet.getRow(FIRST_DATA_ROW).height) look.height = sheet.getRow(FIRST_DATA_ROW).height
  } catch {
    // no GIP template: the fallback look above is used
  }
  return look
}

const CENTERED_TYPES = new Set(['date', 'enum', 'number', 'check'])
const alignmentFor = (col) => ({
  horizontal: CENTERED_TYPES.has(col.type) ? 'center' : 'left',
  vertical: 'middle',
  wrapText: col.type === 'trainings',
})

function toCellValue(col, row) {
  const v = row[col.key]
  switch (col.type) {
    case 'check':
      return v ? MARK : null
    case 'date':
      return toExcelDate(v)
    case 'number':
      return v === '' || v === null || v === undefined ? null : Number(v)
    case 'trainings':
      return (v || []).map((t) => [t.title, t.hours ?? '', t.dateConducted ?? ''].join(' | ')).join('\n') || null
    default:
      return v === '' || v === null || v === undefined ? null : String(v)
  }
}

function numFmtOf(col) {
  if (col.type === 'date') return DATE_FORMAT
  if (col.type === 'number') return col.money ? '#,##0.00' : 'General'
  if (col.type === 'phone') return '@'
  return undefined
}

// The template's Admin/Staff placeholder (top-left cell of a merged block) becomes the exporter's role.
function writeRole(ws, role) {
  const label = role === 'admin' ? 'Admin' : 'Staff'
  for (let r = 1; r < LAYOUT.groupRow; r++) {
    ws.getRow(r).eachCell((cell) => {
      if (cell.master.address !== cell.address) return
      if (/^(admin|staff)$/i.test(String(cell.value ?? '').trim())) cell.value = label
    })
  }
}

/**
 * @param {{ programKey: string, batch: { name: string, batch_year: number }, rows: object[], role: string }} input
 * @returns {Promise<Buffer>} the .xlsx file
 */
async function buildProgramWorkbook({ programKey, batch, rows, role }) {
  const program = getProgram(programKey)

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.readFile(templatePath(programKey))
  } catch {
    throw new HttpError(500, `Template not found: server/templates/${programKey}-template.xlsx`)
  }
  const ws = workbook.worksheets[0]
  for (const sheet of workbook.worksheets.slice(1)) workbook.removeWorksheet(sheet.id)

  const header = locateHeader(ws, headerLookup(program))
  if (!header) {
    throw new HttpError(500, `server/templates/${programKey}-template.xlsx has no header row matching the ${program.acronym} columns.`)
  }

  ws.name = toSheetName(batch.name)
  ws.getCell(LAYOUT.title.split(':')[0]).value = `${program.acronym} DATA ${batch.batch_year}`
  writeRole(ws, role)

  const look = await readGipDataLook()
  const firstRow = header.row + 1
  const lastRow = Math.max(LAST_TEMPLATE_ROW, firstRow + rows.length - 1)
  const noColumn = findNoColumn(ws, header.row)

  for (let r = firstRow; r <= lastRow; r++) {
    const row = rows[r - firstRow]
    const lines = row ? Math.max(1, ...program.columns.filter((c) => c.type === 'trainings').map((c) => (row[c.key] || []).length)) : 1
    ws.getRow(r).height = Math.max(look.height, lines * 28)

    const no = ws.getCell(r, noColumn)
    no.value = row ? r - firstRow + 1 : null
    no.style = { font: look.font, border: look.border, alignment: { horizontal: 'center', vertical: 'middle' } }

    for (const [colNumber, col] of header.map) {
      const cell = ws.getCell(r, colNumber)
      cell.value = row ? toCellValue(col, row) : null
      const numFmt = numFmtOf(col)
      cell.style = { font: look.font, border: look.border, alignment: alignmentFor(col), ...(numFmt ? { numFmt } : {}) }
    }
  }

  return workbook.xlsx.writeBuffer()
}

// Column that holds the running number ("NO.") in the header rows.
function findNoColumn(ws, headerRow) {
  for (const r of [headerRow, headerRow - 1]) {
    let found = 0
    ws.getRow(r).eachCell((cell, n) => {
      if (!found && cell.master.address === cell.address && normalizeHeader(cell.text) === 'NO.') found = n
    })
    if (found) return found
  }
  return LAYOUT.noColumn
}

// ---------- header lookup (shared by export and import) ----------

const headerLookup = (program) => new Map(program.columns.map((col) => [normalizeHeader(col.header), col]))

// Finds the header row by column names, so the column order can differ from our config.
function locateHeader(sheet, known) {
  let best = null
  const lastRow = Math.min(sheet.rowCount, HEADER_SEARCH_ROWS)
  for (let r = 1; r <= lastRow; r++) {
    const map = new Map()
    const used = new Set()
    sheet.getRow(r).eachCell((cell, colNumber) => {
      const col = known.get(normalizeHeader(cellText(cell)))
      if (col && !used.has(col)) {
        used.add(col)
        map.set(colNumber, col)
      }
    })
    if (map.size >= 3 && (!best || map.size > best.map.size)) best = { row: r, map }
  }
  return best
}

// ---------- import ----------

function readRow(program, sheet, rowNumber, headerMap) {
  const record = {}
  const cellErrors = []
  const warnings = []

  for (const [colNumber, col] of headerMap) {
    const cell = sheet.getCell(rowNumber, colNumber)
    if (col.type === 'date') {
      const result = readDate(cell, col.header)
      if (result.error) cellErrors.push(result.error)
      record[col.key] = result.value || ''
    } else if (col.type === 'check') {
      const text = cellText(cell)
      record[col.key] = Boolean(text) && isMarked(text)
      if (text && !record[col.key]) warnings.push(`"${text}" in ${col.header} is not a check mark, so it was left unchecked.`)
    } else if (col.type === 'trainings') {
      record[col.key] = parseTrainings(rawText(cell))
    } else {
      record[col.key] = cellText(cell)
    }
  }

  const { data, errors } = validateRecord(program.key, record)
  const name = [record.lastName && `${record.lastName},`, record.firstName].filter(Boolean).join(' ')

  return {
    row: rowNumber,
    name: name || '(no name)',
    data: errors.length || cellErrors.length ? null : data,
    errors: [...cellErrors, ...errors],
    warnings,
  }
}

async function readProgramWorkbook(programKey, buffer) {
  const program = { ...getProgram(programKey), key: programKey }
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    throw new HttpError(400, 'The file could not be read. Make sure it is a valid .xlsx file.')
  }

  const known = headerLookup(program)
  let best = null
  for (const sheet of workbook.worksheets) {
    const found = locateHeader(sheet, known)
    if (found && (!best || found.map.size > best.map.size)) best = { sheet, ...found }
  }
  if (!best) throw new HttpError(400, 'No header row was found. Use a file exported from this page.')

  const present = new Set(best.map.values())
  const missing = program.columns.filter((c) => c.required && !present.has(c)).map((c) => c.header)
  if (missing.length) throw new HttpError(400, `Missing required column(s): ${missing.join(', ')}.`)

  const rows = []
  const columnNumbers = [...best.map.keys()]
  for (let r = best.row + 1; r <= best.sheet.rowCount; r++) {
    if (columnNumbers.every((c) => cellText(best.sheet.getCell(r, c)) === '')) continue
    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new HttpError(400, `The file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`)
    }
    rows.push(readRow(program, best.sheet, r, best.map))
  }
  if (!rows.length) throw new HttpError(400, 'No applicant rows were found in this file.')
  return rows
}

const dupKey = (program, record) => program.dupKeys.map((k) => fold(record[k])).join('|')

/** Reads the file and reports what WOULD happen. Nothing is saved. */
async function buildImportPreview(programKey, buffer, existingRows) {
  const program = getProgram(programKey)
  const parsed = await readProgramWorkbook(programKey, buffer)
  const existing = new Set(existingRows.map((r) => dupKey(program, r)))
  const seen = new Map()

  const rows = parsed.map((item) => {
    const base = { row: item.row, name: item.name, warnings: item.warnings }
    if (!item.data) return { ...base, status: 'error', messages: item.errors, data: null }

    const key = dupKey(program, item.data)
    if (existing.has(key)) {
      return { ...base, status: 'duplicate', messages: ['Already in this batch. It will be skipped.'], data: null }
    }
    if (seen.has(key)) {
      return { ...base, status: 'duplicate', messages: [`Same person as row ${seen.get(key)} in this file. It will be skipped.`], data: null }
    }
    seen.set(key, item.row)
    return { ...base, status: 'new', messages: [], data: item.data }
  })

  const count = (status) => rows.filter((r) => r.status === status).length
  return { summary: { total: rows.length, new: count('new'), duplicates: count('duplicate'), errors: count('error') }, rows }
}

/** Re-checks the rows the user confirmed. Throws on the first bad row (all-or-nothing). */
function prepareImport(programKey, rawRows, existingRows) {
  const program = getProgram(programKey)
  const existing = new Set(existingRows.map((r) => dupKey(program, r)))
  const accepted = []
  let skipped = 0

  rawRows.forEach((raw, index) => {
    const { data, errors } = validateRecord(programKey, raw)
    if (errors.length) throw new HttpError(400, `Row ${index + 1}: ${errors[0]}`)
    const key = dupKey(program, data)
    if (existing.has(key)) {
      skipped += 1
      return
    }
    existing.add(key)
    accepted.push(data)
  })

  return { accepted, skipped }
}

module.exports = { buildProgramWorkbook, buildImportPreview, prepareImport, validateRecord }
