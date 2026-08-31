import { useCallback, useEffect, useState } from 'react'
import echo from '../echo'
import { fetchDrivers, fetchDriverStatusCounts, mapDriver } from '../services/adminApi'

const DEFAULT_STATUS_COUNTS = {
  all: 0,
  approved: 0,
  pending: 0,
  rejected: 0,
  suspended: 0,
  updated: 0,
}

const useDrivers = (token) => {
  const [drivers, setDrivers] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [statusCounts, setStatusCounts] = useState(DEFAULT_STATUS_COUNTS)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const loadStatusCounts = useCallback(async () => {
    if (!token) return

    try {
      const counts = await fetchDriverStatusCounts(token)
      setStatusCounts((prev) => ({ ...prev, ...counts }))
    } catch {
      // Non-critical: leave the previous counts in place if this fails.
    }
  }, [token])

  const loadDrivers = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const data = await fetchDrivers(token, {
        page,
        perPage: pagination.perPage,
        search: debouncedSearch,
        status: statusFilter,
      })
      setDrivers(data.drivers || [])
      if (data.pagination) {
        setPagination((prev) => ({
          ...prev,
          ...data.pagination,
        }))
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [token, page, pagination.perPage, debouncedSearch, statusFilter])

  useEffect(() => {
    if (!token) {
      setStatusCounts(DEFAULT_STATUS_COUNTS)
      return
    }

    loadStatusCounts()
  }, [token, loadStatusCounts])

  useEffect(() => {
    if (!token) {
      setDrivers([])
      setPagination({ page: 1, perPage: 10, total: 0, totalPages: 1 })
      setPage(1)
      return
    }

    loadDrivers()
  }, [token, loadDrivers])

  useEffect(() => {
    if (!token) return

    const channel = echo.channel('admin.drivers')
    const handleCreated = (payload) => {
      const nextDriver = mapDriver(payload?.driver ?? payload)
      if (!nextDriver?.id) return

      loadStatusCounts()

      setDrivers((prev) => {
        const exists = prev.some((driver) => driver.id === nextDriver.id)
        if (exists) {
          return prev.map((driver) =>
            driver.id === nextDriver.id ? nextDriver : driver,
          )
        }
        const matchesFilter = statusFilter === 'all' || nextDriver.status === statusFilter
        if (!matchesFilter) {
          return prev
        }
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: prevPagination.total + 1,
        }))
        if (page !== 1) {
          return prev
        }
        return [nextDriver, ...prev]
      })
    }

    channel.listen('DriverCreated', handleCreated)

    return () => {
      channel.stopListening('DriverCreated', handleCreated)
      echo.leave('admin.drivers')
    }
  }, [token, page, statusFilter, loadStatusCounts])

  // Listen for real-time driver availability updates
  useEffect(() => {
    if (!token) return

    const channel = echo.channel('admin.dashboard')
    const handleDashboardUpdate = (payload) => {
      // Update driver availability when DashboardUpdated event is received
      if (payload?.event === 'driver.account' && payload?.data?.driver_id) {
        const driverId = payload.data.driver_id
        const availability = payload.data.availability

        setDrivers((prev) =>
          prev.map((driver) =>
            driver.id === driverId
              ? { ...driver, availability }
              : driver,
          ),
        )
      }
    }

    channel.listen('DashboardUpdated', handleDashboardUpdate)

    return () => {
      channel.stopListening('DashboardUpdated', handleDashboardUpdate)
      echo.leave('admin.dashboard')
    }
  }, [token])

  const updateDriver = useCallback((nextDriver) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === nextDriver.id ? nextDriver : driver,
      ),
    )
    loadStatusCounts()
  }, [loadStatusCounts])

  return {
    drivers,
    pagination,
    page,
    setPage,
    loading,
    error,
    refresh: loadDrivers,
    updateDriver,
    setDrivers,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    statusCounts,
  }
}

export default useDrivers
