// Fills the official GIP Excel form (templates/gip-template.xlsx) with one batch.
const path = require('path')
const ExcelJS = require('exceljs')

const {
  COLUMNS,
  REQUIREMENT_COLUMNS,
  CLASSIFICATION_COLUMNS,
  MERGED_PAIR_STARTS,
  FIRST_DATA_ROW,
  LAST_TEMPLATE_ROW,
  MARK,
} = require('../constants/gip-excel')
const { calculateAge } = require('./applicant.utils')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'gip-template.xlsx')
const DATE_FORMAT = 'dd/mm/yyyy'

// '2003-05-05' -> midnight UTC, so Excel shows the same day in any time zone.
function toExcelDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

// Excel sheet names: max 31 characters, no \ / ? * [ ] :
function toSheetName(name) {
  return name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
}

// The template has 176 formatted rows. For more people, copy the look of the
// last template row (borders, fonts, merged requirement cells).
function addDataRow(worksheet, rowNumber) {
  const templateRow = worksheet.getRow(LAST_TEMPLATE_ROW)
  const row = worksheet.getRow(rowNumber)

  // Row 186 has no custom height in the template, so use a normal data row's.
  row.height = templateRow.height ?? worksheet.getRow(FIRST_DATA_ROW).height
  templateRow.eachCell({ includeEmpty: true }, (cell, column) => {
    row.getCell(column).style = { ...cell.style }
  })

  for (const start of MERGED_PAIR_STARTS) {
    worksheet.mergeCells(rowNumber, start, rowNumber, start + 1)
  }
}

/**
 * @param {{ batch: { name: string, batch_year: number }, applicants: object[] }} input
 * @returns {Promise<Buffer>} the .xlsx file
 */
async function buildGipWorkbook({ batch, applicants }) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(TEMPLATE_PATH)

  const worksheet = workbook.worksheets[0]

  // The template has a leftover scratch sheet; the export only needs the form.
  for (const sheet of workbook.worksheets.slice(1)) {
    workbook.removeWorksheet(sheet.id)
  }

  worksheet.name = toSheetName(batch.name)
  worksheet.getCell('A1').value = `GUWIP DATA ${batch.batch_year}`

  // Oldest entry first, so NO. 1 is the first person encoded.
  const ordered = [...applicants].sort((a, b) => a.applicationId - b.applicationId)

  ordered.forEach((applicant, index) => {
    const rowNumber = FIRST_DATA_ROW + index

    if (rowNumber > LAST_TEMPLATE_ROW) addDataRow(worksheet, rowNumber)

    const set = (column, value) => {
      worksheet.getCell(rowNumber, column).value = value
    }
    const setDate = (column, isoDate) => {
      const date = toExcelDate(isoDate)
      if (!date) return
      const cell = worksheet.getCell(rowNumber, column)
      cell.value = date
      cell.numFmt = DATE_FORMAT
    }

    set(COLUMNS.no, index + 1)
    set(COLUMNS.lastName, applicant.lastName)
    set(COLUMNS.firstName, applicant.firstName)
    set(COLUMNS.middleName, applicant.middleName || null)
    set(COLUMNS.extensionName, applicant.extensionName || null)
    setDate(COLUMNS.birthdate, applicant.birthdate)
    set(COLUMNS.barangay, applicant.barangay)
    set(COLUMNS.municipality, applicant.municipality)
    set(COLUMNS.province, applicant.province)
    set(COLUMNS.course, applicant.course || null)
    set(COLUMNS.email, applicant.email || null)
    set(COLUMNS.contactNumber, applicant.contactNumber || null)
    set(COLUMNS.sex, applicant.sex)
    set(COLUMNS.civilStatus, applicant.civilStatus)
    set(COLUMNS.age, calculateAge(applicant.birthdate))
    set(COLUMNS.remarks, applicant.remarks || null)

    for (const [key, column] of Object.entries(REQUIREMENT_COLUMNS)) {
      if (applicant.requirements[key]) set(column, MARK)
    }

    set(COLUMNS.supportingDocuments, applicant.supportingDocuments || null)

    for (const { column, name } of CLASSIFICATION_COLUMNS) {
      if (applicant.classifications.includes(name)) set(column, MARK)
    }

    setDate(COLUMNS.dateApplied, applicant.dateApplied)
  })

  return workbook.xlsx.writeBuffer()
}

module.exports = { buildGipWorkbook }
