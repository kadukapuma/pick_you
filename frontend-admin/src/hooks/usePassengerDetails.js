import { useEffect, useState } from 'react'
import { fetchPassengerDetails } from '../services/adminApi'

const usePassengerDetails = (token, passengerId) => {
  const [passengerDetails, setPassengerDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !passengerId) {
      setPassengerDetails(null)
      return
    }

    const loadDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPassengerDetails(token, passengerId)
        setPassengerDetails(data)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [token, passengerId])

  return {
    passengerDetails,
    loading,
    error,
    setPassengerDetails,
  }
}

export default usePassengerDetails
