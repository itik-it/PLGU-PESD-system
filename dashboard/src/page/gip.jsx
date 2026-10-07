import { useEffect, useMemo, useState } from 'react'
import { Paper } from '@mui/material'

import GipHeader from '../gip/ui/GipHeader'
import GipToolbar from '../gip/ui/GipToolbar'
import GipTable from '../gip/ui/GipTable'
import GipDetailsDialog from '../gip/ui/GipDetailsDialog'
import GipFormDialog from '../gip/ui/GipFormDialog'
import GipDeleteDialog from '../gip/ui/GipDeleteDialog'

import { columns, createEmptyRow } from '../gip/gipSettings'
import { fromApiApplicant, toApiApplicant } from '../gip/gipTranslator'
import {
  getApplicants, createApplicant, updateApplicant, deleteApplicant,
} from '../gip/gipServer'

function Gip() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)   // details dialog
  const [formRow, setFormRow] = useState(null)           // add/edit dialog
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const list = await getApplicants()
        setRows(list.map(fromApiApplicant))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter by search term
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      columns.some((c) => String(row[c.key]).toLowerCase().includes(q)),
    )
  }, [rows, search])

  // --- Handlers ---
  const openAdd = () => setFormRow(createEmptyRow())
  const openEdit = (row) => setFormRow({ ...row })

  const saveRow = async () => {
    setSaving(true)
    setError('')
    try {
      const isNew = formRow.id === null

      if (isNew) {
        const res = await createApplicant(toApiApplicant(formRow))
        setRows((cur) => [...cur, { ...formRow, id: res.applicantId }])
      } else {
        await updateApplicant(formRow.id, toApiApplicant(formRow))
        // Reload just to be safe (matches old behaviour)
        const list = await getApplicants()
        setRows(list.map(fromApiApplicant))
      }

      setSearch('')
      setFormRow(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      setError('')
      await deleteApplicant(deleteTarget.id)
      setRows((cur) => cur.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main className="gip-page">
      <GipHeader totalRecords={rows.length} />

      <Paper className="gip-table-card" elevation={0}>
        <GipToolbar
          search={search}
          onSearchChange={setSearch}
          shownCount={filteredRows.length}
          error={error}
          onAdd={openAdd}
        />
        <GipTable
          rows={filteredRows}
          loading={loading}
          search={search}
          onRowClick={setSelectedRow}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </Paper>

      <GipDetailsDialog row={selectedRow} onClose={() => setSelectedRow(null)} />

      <GipFormDialog
        row={formRow}
        saving={saving}
        onClose={() => setFormRow(null)}
        onChange={setFormRow}
        onSave={saveRow}
      />

      <GipDeleteDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  )
}

export default Gip