const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8000/api'
const TOKEN_KEY = 'admin_token'

const statusOptions = ['pending', 'approved', 'suspended', 'updated', 'rejected']

const apiFetch = async (path, { method = 'GET', body, token } = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

const resolveAssetUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url

  const origin = API_BASE.replace(/\/api$/, '')
  const normalized = url.startsWith('/') ? url : `/${url}`

  if (normalized.startsWith('/uploads/') || normalized.startsWith('/storage/')) {
    return `${origin}${normalized}`
  }

  return `${origin}/storage${normalized}`
}

const getStoredToken = () => localStorage.getItem(TOKEN_KEY)

const storeToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

const mapDriver = (d) => {
  if (!d) return d;
  return {
    ...d,
    name: d.user ? `${d.user.first_name || ''} ${d.user.last_name || ''}`.trim() : 'Unknown',
    email: d.user?.email,
    phone: d.user?.phone,
    profile_picture_path: d.user?.profile_picture_path,
    rides_count: d.rides_count || 0,
    vehicles: d.vehicles ? d.vehicles.map(v => ({
      ...v,
      plate_number: v.vehicle_number || v.plate_number,
      make: v.brand || v.make
    })) : [],
    vehicle: d.vehicles && d.vehicles.length > 0 ? {
      ...d.vehicles[0],
      plate_number: d.vehicles[0].vehicle_number || d.vehicles[0].plate_number,
      make: d.vehicles[0].brand || d.vehicles[0].make
    } : null,
  }
}

const mapVehicle = (v) => {
  if (!v) return v;
  return {
    ...v,
    plate_number: v.vehicle_number || v.plate_number,
    make: v.brand || v.make,
    driver: v.driver ? {
        ...v.driver,
        name: v.driver.user ? `${v.driver.user.first_name || ''} ${v.driver.user.last_name || ''}`.trim() : 'Unknown',
        email: v.driver.user?.email,
        phone: v.driver.user?.phone,
    } : null,
    images: v.images || null,
  }
}

const mapPagination = (payload, fallbackPage = 1, fallbackPerPage = 10) => {
  if (!payload || typeof payload !== 'object') {
    return {
      page: fallbackPage,
      perPage: fallbackPerPage,
      total: 0,
      totalPages: 1,
    }
  }

  return {
    page: payload.current_page || fallbackPage,
    perPage: payload.per_page || fallbackPerPage,
    total: payload.total || 0,
    totalPages: payload.last_page || 1,
  }
}

const loginAdmin = async (credentials) => {
  const payload = await apiFetch('/login', { method: 'POST', body: credentials })
  return payload.data
}

const verify2FA = async (data) => {
  const payload = await apiFetch('/login/verify-2fa', { method: 'POST', body: data })
  return payload.data
}

const updateAdminStatus = (id, status, token) =>
  apiFetch(`/admins/${id}/status`, {
    method: 'PUT',
    token,
    body: { is_active: status },
  })

const updateDriverActiveStatus = (id, status, token) =>
  apiFetch(`/drivers/${id}/active-status`, {
    method: 'PUT',
    token,
    body: { is_active: status },
  })

const logoutAdmin = (token) =>
  apiFetch('/logout', { method: 'POST', token })

const updatePassengerStatus = (id, status, token) =>
  apiFetch(`/passengers/${id}/status`, {
    method: 'PUT',
    token,
    body: { is_active: status },
  })

const fetchMe = async (token) => {
  const payload = await apiFetch('/user', { token })
  return payload.data || payload
}

const fetchDrivers = async (token, { page = 1, perPage = 10 } = {}) => {
  const payload = await apiFetch(`/drivers?page=${page}&per_page=${perPage}`, { token })
  const data = payload.data || {}
  return {
    drivers: (data.data || []).map(mapDriver),
    pagination: mapPagination(data, page, perPage),
  }
}

const fetchDriverDetails = async (token, driverId) => {
  const payload = await apiFetch(`/drivers/${driverId}`, { token })
  return { driver: mapDriver(payload.data), documents: {} }
}

const fetchVehicles = async (token, driverId, { page = 1, perPage = 10 } = {}) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', String(perPage))
  if (driverId) {
    params.set('driver_id', String(driverId))
  }
  const payload = await apiFetch(`/vehicles?${params.toString()}`, { token })
  const data = payload.data || {}
  return {
    vehicles: (data.data || []).map(mapVehicle),
    pagination: mapPagination(data, page, perPage),
  }
}

const fetchPassengers = async (token, { page = 1, perPage = 10 } = {}) => {
  const payload = await apiFetch(`/passengers?page=${page}&per_page=${perPage}`, { token })
  const data = payload.data || {}
  return {
    passengers: data.data || [],
    pagination: mapPagination(data, page, perPage),
  }
}

const fetchAdmins = async (token, { page = 1, perPage = 10 } = {}) => {
  const payload = await apiFetch(`/admins?page=${page}&per_page=${perPage}`, { token })
  const data = payload.data || {}
  return {
    admins: data.data || [],
    pagination: mapPagination(data, page, perPage),
  }
}

const fetchOperators = async (token, { page = 1, perPage = 10 } = {}) => {
  const payload = await apiFetch(`/operators?page=${page}&per_page=${perPage}`, { token })
  const data = payload.data || {}
  return {
    operators: data.data || [],
    pagination: mapPagination(data, page, perPage),
  }
}

const createOperator = async (token, operator) => {
  const payload = await apiFetch('/operators', {
    method: 'POST',
    token,
    body: operator,
  })
  return { operator: payload.data }
}

const updateOperator = async (token, operatorId, operator) => {
  const payload = await apiFetch(`/operators/${operatorId}`, {
    method: 'PUT',
    token,
    body: operator,
  })
  return { operator: payload.data }
}

const updateOperatorStatus = async (token, operatorId, status) => {
  const payload = await apiFetch(`/operators/${operatorId}/status`, {
    method: 'PUT',
    token,
    body: { is_active: status },
  })
  return { operator: payload.data }
}

const deleteOperator = async (token, operatorId) => {
  const payload = await apiFetch(`/operators/${operatorId}`, {
    method: 'DELETE',
    token,
  })
  return payload
}

const fetchRolePermissions = async (token) => {
  const payload = await apiFetch('/role-permissions', { token })
  return payload.data || { roles: [], available_permissions: [] }
}

const updateRolePermissions = async (token, role, permissions) => {
  const payload = await apiFetch(`/role-permissions/${role}`, {
    method: 'PUT',
    token,
    body: { permissions },
  })
  return payload.data
}

const fetchVehicleDetails = async (token, vehicleId) => {
  const payload = await apiFetch(`/vehicles/${vehicleId}`, { token })
  return { vehicle: mapVehicle(payload.data), documents: {} }
}

const updateVehicleStatus = async (token, vehicleId, status) => {
  const payload = await apiFetch(`/vehicles/${vehicleId}/status`, {
    method: 'PUT',
    token,
    body: { status },
  })
  return { vehicle: mapVehicle(payload.data) }
}

const updateDriverStatus = async (token, driverId, status) => {
  const payload = await apiFetch(`/drivers/${driverId}/status`, {
    method: 'PUT',
    token,
    body: { status },
  })
  return { driver: mapDriver(payload.data) }
}

const fetchDashboardStats = (token) => apiFetch('/dashboard/stats', { token })
const updatePassword = (token, passwords) =>
  apiFetch('/user/update-password', {
    method: 'POST',
    token,
    body: passwords,
  })

const fetchAdminNotifications = async (token, limit = 20) => {
  const payload = await apiFetch(`/admin/notifications?limit=${limit}`, { token })
  return { notifications: payload.data || [] }
}

const markAdminNotificationsRead = (token) =>
  apiFetch('/admin/notifications/read', {
    method: 'PUT',
    token,
  })

const clearAdminNotifications = (token) =>
  apiFetch('/admin/notifications', {
    method: 'DELETE',
    token,
  })

const fetchSuperAdminNotifications = async (token, limit = 20) => {
  const payload = await apiFetch(`/superadmin/notifications?limit=${limit}`, { token })
  return { notifications: payload.data || [] }
}

const markSuperAdminNotificationsRead = (token) =>
  apiFetch('/superadmin/notifications/read', {
    method: 'PUT',
    token,
  })

const clearSuperAdminNotifications = (token) =>
  apiFetch('/superadmin/notifications', {
    method: 'DELETE',
    token,
  })

const fetchFareConfigs = async (token) => {
  const payload = await apiFetch('/fare-configs', { token })
  return { fareConfigs: payload.data || [] }
}

const createFareConfig = async (token, fareConfig) => {
  const payload = await apiFetch('/fare-configs', {
    method: 'POST',
    token,
    body: fareConfig,
  })
  return { fareConfig: payload.data }
}

const updateFareConfig = async (token, fareConfigId, fareConfig) => {
  const payload = await apiFetch(`/fare-configs/${fareConfigId}`, {
    method: 'PUT',
    token,
    body: fareConfig,
  })
  return { fareConfig: payload.data }
}

const fetchVehicleTypes = async (token) => {
  const payload = await apiFetch('/vehicle-types', { token })
  return { vehicleTypes: payload.data || [] }
}

const createVehicleType = async (token, vehicleType) => {
  const payload = await apiFetch('/vehicle-types', {
    method: 'POST',
    token,
    body: vehicleType,
  })
  return { vehicleType: payload.data }
}

const updateVehicleType = async (token, vehicleTypeId, vehicleType) => {
  const payload = await apiFetch(`/vehicle-types/${vehicleTypeId}`, {
    method: 'PUT',
    token,
    body: vehicleType,
  })
  return { vehicleType: payload.data }
}

const deleteVehicleType = async (token, vehicleTypeId) => {
  const payload = await apiFetch(`/vehicle-types/${vehicleTypeId}`, {
    method: 'DELETE',
    token,
  })
  return payload
}

export {
  API_BASE,
  TOKEN_KEY,
  statusOptions,
  apiFetch,
  resolveAssetUrl,
  mapDriver,
  mapVehicle,
  getStoredToken,
  storeToken,
  clearToken,
  loginAdmin,
  logoutAdmin,
  fetchAdmins,
  fetchOperators,
  fetchDrivers,
  fetchMe,
  fetchDriverDetails,
  fetchPassengers,
  fetchVehicles,
  fetchVehicleDetails,
  updateDriverStatus,
  updateVehicleStatus,
  fetchDashboardStats,
  verify2FA,
  updateAdminStatus,
  updatePassengerStatus,
  updateDriverActiveStatus,
  updatePassword,
  fetchAdminNotifications,
  markAdminNotificationsRead,
  clearAdminNotifications,
  fetchSuperAdminNotifications,
  markSuperAdminNotificationsRead,
  clearSuperAdminNotifications,
  fetchFareConfigs,
  createFareConfig,
  updateFareConfig,
  fetchVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
  createOperator,
  updateOperator,
  updateOperatorStatus,
  deleteOperator,
  fetchRolePermissions,
  updateRolePermissions,
}
