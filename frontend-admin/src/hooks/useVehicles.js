import { useCallback, useEffect, useState } from 'react'
import echo from '../echo'
import { fetchVehicles, mapVehicle } from '../services/adminApi'

const useVehicles = (token, driverId) => {
  const [vehicles, setVehicles] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadVehicles = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const data = await fetchVehicles(token, driverId, {
        page,
        perPage: pagination.perPage,
      })
      setVehicles(data.vehicles || [])
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
  }, [token, driverId, page, pagination.perPage])

  useEffect(() => {
    if (!token) {
      setVehicles([])
      setPagination({ page: 1, perPage: 10, total: 0, totalPages: 1 })
      setPage(1)
      return
    }

    loadVehicles()
  }, [token, loadVehicles])

  useEffect(() => {
    if (!token || driverId) return

    const channel = echo.channel('admin.vehicles')
    const handleCreated = (payload) => {
      const nextVehicle = mapVehicle(payload?.vehicle ?? payload)
      if (!nextVehicle?.id) return

      setVehicles((prev) => {
        const exists = prev.some((vehicle) => vehicle.id === nextVehicle.id)
        if (exists) {
          return prev.map((vehicle) =>
            vehicle.id === nextVehicle.id ? nextVehicle : vehicle,
          )
        }
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: prevPagination.total + 1,
        }))
        if (page !== 1) {
          return prev
        }
        return [nextVehicle, ...prev]
      })
    }

    channel.listen('VehicleCreated', handleCreated)

    return () => {
      channel.stopListening('VehicleCreated', handleCreated)
      echo.leave('admin.vehicles')
    }
  }, [token, driverId, page])

  const updateVehicle = useCallback((nextVehicle) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === nextVehicle.id ? nextVehicle : vehicle,
      ),
    )
  }, [])

  return {
    vehicles,
    pagination,
    page,
    setPage,
    loading,
    error,
    refresh: loadVehicles,
    updateVehicle,
    setVehicles,
  }
}

export default useVehicles
