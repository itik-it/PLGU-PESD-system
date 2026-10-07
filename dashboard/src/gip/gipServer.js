const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'The server could not complete the request.')
  }
  return response.status === 204 ? null : response.json()
}

export const getApplicants = () => request('/gip/applicants')

export const createApplicant = (data) =>
  request('/gip/applicants', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateApplicant = (id, data) =>
  request(`/gip/applicants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteApplicant = (id) =>
  request(`/gip/applicants/${id}`, { method: 'DELETE' })