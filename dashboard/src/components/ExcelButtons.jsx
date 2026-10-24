import { useState } from 'react'
import { Button } from '@mui/material'
import { api } from '../api/client.js'
import { saveFile } from '../utils/saveFile.js'
import ImportDialog from './ImportDialog.jsx'

// Look of the Import / Export buttons (same as the GIP page).
const excelButtonSx = {
  minHeight: 40,
  borderRadius: '8px',
  borderColor: '#b9d4c1',
  color: '#183d2d',
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const HINT =
  'Upload an Excel file exported from this page (.xlsx). Columns are matched by their header names, ' +
  'and headers marked * are required. A check mark (✓ or /) means selected. Dates use DD/MM/YYYY. ' +
  'Nothing is saved until you confirm on the next step.'

/**
 * Import + Export buttons for one batch.
 *   basePath    e.g. '/guwip/batches'
 *   onImported  called with the batch's applicants (raw API rows) after a successful import
 *   onError     called with a message when the export fails
 */
export default function ExcelButtons({ basePath, batch, isClosed, onImported, onError }) {
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportToExcel = async () => {
    setExporting(true)
    onError('')
    try {
      const file = await api.download(`${basePath}/${batch.id}/export`)
      saveFile(file, `${batch.name}.xlsx`)
    } catch (exportError) {
      onError(exportError.message)
    } finally {
      setExporting(false)
    }
  }

  const reload = async () => onImported(await api.get(`${basePath}/${batch.id}/applicants`))

  return (
    <>
      <Button sx={excelButtonSx} variant="outlined" disabled={isClosed} onClick={() => setImportOpen(true)}>
        Import
      </Button>
      <Button sx={excelButtonSx} variant="outlined" disabled={exporting} onClick={exportToExcel}>
        {exporting ? 'Exporting...' : 'Export'}
      </Button>
      {importOpen && (
        <ImportDialog
          batch={batch}
          basePath={basePath}
          hint={HINT}
          onClose={() => setImportOpen(false)}
          onImported={reload}
        />
      )}
    </>
  )
}
