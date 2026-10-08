// One place for talking to the server. Every request sends the login cookie.
export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))

    // Session expired while using a page -> AuthContext sends the user back to login.
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'))
    }

    // GIP validation errors arrive as a list of { message } items.
    const listedErrors = Array.isArray(body.errors)
      ? body.errors.map((issue) => issue.message).filter(Boolean).join(' ')
      : ''

    const error = new Error(
      listedErrors || body.message || 'The server could not complete the request.',
    )
    error.status = response.status
    throw error
  }

  return response.status === 204 ? null : response.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
