import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Movie, ShowTime, Hall, hallsAPI, reservationsAPI } from '../lib/api'
import { buttonClasses } from '../lib/class-names'

interface SeatSelectionModalProps {
  movie: Movie
  showtime: ShowTime
  hall: Hall
  onClose: () => void
}

interface Seat {
  id: number
  seatNumber: string
  category: string
  available: boolean
}

export default function SeatSelectionModal({
  movie,
  showtime,
  hall,
  onClose,
}: SeatSelectionModalProps) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [error, setError] = useState('')
  const seatsQuery = useQuery({
    queryKey: ['halls', showtime.hallId, 'seat-chart', showtime.startTime],
    queryFn: () =>
      hallsAPI
        .getSeatChart(showtime.hallId, showtime.startTime)
        .then((response) => response.data.seats),
  })
  const createReservation = useMutation({
    mutationFn: () =>
      reservationsAPI.create(showtime.hallId, {
        movieId: movie.id,
        time: showtime.startTime,
        seats: selectedSeats,
    }),
    onSuccess: (response) => {
      const checkoutUrl =
        response.data.checkoutSession?.url ??
        response.data.checkoutSession?.redirectUrl
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank')
      }
      onClose()
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message ||
          'Failed to create reservation. Please try again.'
      )
    },
  })
  const seats: Seat[] = seatsQuery.data ?? []

  const handleSeatClick = (seatId: number, available: boolean) => {
    if (!available) return

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    )
  }

  const handleSubmit = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat')
      return
    }

    setError('')
    createReservation.mutate()
  }

  const startTime = new Date(showtime.startTime).toLocaleString()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{movie.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {hall.name} • {startTime}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {seatsQuery.isLoading && (
            <div className="text-center text-gray-500">Loading seats...</div>
          )}
          {seatsQuery.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              Failed to load seats. Please try again.
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {error}
            </div>
          )}
          {!seatsQuery.isLoading && seats.length > 0 && (
            <>
              <div className="text-center mb-6 pb-4 border-b border-gray-200">
                <div className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold text-sm">
                  SCREEN
                </div>
              </div>
              
              <div className="mb-6 flex justify-center">
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))' }}>
                  {seats.map((seat) => {
                    const isSelected = selectedSeats.includes(seat.id)
                    const isAvailable = seat.available
                    
                    let seatClass = 'w-10 h-10 rounded border text-xs font-medium transition-colors '
                    
                    if (!isAvailable) {
                      seatClass += 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                    } else if (isSelected) {
                      seatClass += 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    } else {
                      seatClass += 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                    }
                    
                    return (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat.id, isAvailable)}
                        disabled={!isAvailable}
                        title={`${seat.seatNumber} - ${seat.category}`}
                        className={seatClass}
                      >
                        {seat.seatNumber}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white border border-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded"></div>
                  <span className="text-sm text-gray-700">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">Unavailable</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Selected Seats:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedSeats.length > 0
                      ? seats
                          .filter((s) => selectedSeats.includes(s.id))
                          .map((s) => s.seatNumber)
                          .join(', ')
                      : 'None'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {!seatsQuery.isLoading && (
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={onClose}
              className={`${buttonClasses.secondary} flex-1`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createReservation.isPending || selectedSeats.length === 0}
              className={`${buttonClasses.primary} flex-1`}
            >
              {createReservation.isPending ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
