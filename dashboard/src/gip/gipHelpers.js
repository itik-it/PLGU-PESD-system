export const displayValue = (value, fallback) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  return value || fallback
}

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
}

export const calculateAge = (birthday) => {
  if (!birthday) return ''
  const birthDate = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const birthdayThisYear = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  )
  if (today < birthdayThisYear) age -= 1
  return age >= 0 ? String(age) : ''
}