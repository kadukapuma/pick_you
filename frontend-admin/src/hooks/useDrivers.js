import { useCallback, useEffect, useState } from 'react'
import echo from '../echo'
import { fetchDrivers, mapDriver } from '../services/adminApi'

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

  const loadDrivers = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const data = await fetchDrivers(token, {
        page,
        perPage: pagination.perPage,
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
  }, [token, page, pagination.perPage])

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

      setDrivers((prev) => {
        const exists = prev.some((driver) => driver.id === nextDriver.id)
        if (exists) {
          return prev.map((driver) =>
            driver.id === nextDriver.id ? nextDriver : driver,
          )
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
  }, [token, page])

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
  }, [])

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
  }
}

export default useDrivers
