import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Reservation, reservationsAPI } from '../lib/api'
import { buttonClasses } from '../lib/class-names'

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchReservation = async () => {
      if (!id) return
      try {
        const response = await reservationsAPI.getById(parseInt(id))
        setReservation(response.data)
      } catch (err: any) {
        setError('Failed to load reservation. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [id])

  const handleConfirm = async () => {
    if (!reservation) return
    setActionLoading(true)
    try {
      const response = await reservationsAPI.confirm(reservation.id)
      setReservation(response.data)
    } catch (err: any) {
      setError('Failed to confirm reservation. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!reservation) return
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return
    }
    setActionLoading(true)
    try {
      await reservationsAPI.cancel(reservation.id)
      navigate('/reservations')
    } catch (err: any) {
      setError('Failed to cancel reservation. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading reservation details...</div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'Reservation not found'}
        </div>
      </div>
    )
  }

  const isConfirmed = reservation.status === 'confirmed'
  const isCancelled = reservation.status === 'cancelled'
  const statusBgColor = isConfirmed ? 'bg-green-100 text-green-800' : isCancelled ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate('/reservations')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
      >
        ← Back to Reservations
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservation #{reservation.id}</h1>
            <p className="text-gray-600">
              Movie ID: {reservation.movieId} • Hall: {reservation.hallId}
            </p>
          </div>
          <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${statusBgColor}`}>
            {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Seats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {reservation.seats.map((seat) => (
                <div 
                  key={seat.id} 
                  className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
                >
                  <div className="font-semibold text-gray-900">{seat.seatNumber}</div>
                  <div className="text-xs text-gray-600 mt-1">{seat.category}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Price Details</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Price:</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${reservation.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {reservation.status === 'pending' && (
          <div className="flex gap-3 mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className={`${buttonClasses.danger} flex-1`}
            >
              Cancel Reservation
            </button>
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className={`${buttonClasses.primary} flex-1`}
            >
              {actionLoading ? 'Processing...' : 'Confirm Reservation'}
            </button>
          </div>
        )}
        {reservation.status === 'confirmed' && (
          <div className="flex gap-3 mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className={`${buttonClasses.danger} w-full`}
            >
              Cancel Reservation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
