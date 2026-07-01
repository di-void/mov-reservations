import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Reservation, reservationsAPI } from '../lib/api'
import ReservationCard from '../components/reservation-card'
import { buttonClasses } from '../lib/class-names'

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await reservationsAPI.getAll()
        setReservations(response.data)
      } catch (err: any) {
        setError('Failed to load reservations. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading your reservations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">📋 My Reservations</h1>
      {reservations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">You haven&apos;t made any reservations yet.</p>
          <Link to="/" className={buttonClasses.primary}>
            Browse movies and book tickets
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reservations.map((reservation) => (
            <Link
              key={reservation.id}
              to={`/reservations/${reservation.id}`}
              className="block hover:no-underline"
            >
              <ReservationCard reservation={reservation} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
