import { useEffect, useState } from 'react'
import { fetchDriverDetails } from '../services/adminApi'

const useDriverDetails = (token, driverId) => {
  const [driverDetails, setDriverDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !driverId) {
      setDriverDetails(null)
      return
    }

    const loadDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchDriverDetails(token, driverId)
        setDriverDetails(data)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [token, driverId])

  return {
    driverDetails,
    loading,
    error,
    setDriverDetails,
  }
}

export default useDriverDetails
