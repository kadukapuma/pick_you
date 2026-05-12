import { useEffect, useState } from 'react'
import { fetchVehicleDetails } from '../services/adminApi'

const useVehicleDetails = (token, vehicleId) => {
  const [vehicleDetails, setVehicleDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !vehicleId) {
      setVehicleDetails(null)
      return
    }

    const loadDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchVehicleDetails(token, vehicleId)
        setVehicleDetails(data)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [token, vehicleId])

  return {
    vehicleDetails,
    loading,
    error,
    setVehicleDetails,
  }
}

export default useVehicleDetails
