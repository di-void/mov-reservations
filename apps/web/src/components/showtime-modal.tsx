import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Movie, ShowTime, moviesAPI, hallsAPI } from '../lib/api'
import SeatSelectionModal from './seat-selection-modal'

interface ShowtimeModalProps {
  movie: Movie
  onClose: () => void
}

export default function ShowtimeModal({ movie, onClose }: ShowtimeModalProps) {
  const [selectedShowtime, setSelectedShowtime] = useState<ShowTime | null>(
    null
  )

  const showtimesQuery = useQuery({
    queryKey: ['movies', movie.id, 'showtimes'],
    queryFn: () => moviesAPI.getShowtimes(movie.id).then((response) => response.data),
  })
  const hallsQuery = useQuery({
    queryKey: ['halls'],
    queryFn: () => hallsAPI.getAll().then((response) => response.data),
  })
  const halls = useMemo(
    () => new Map((hallsQuery.data ?? []).map((hall) => [hall.id, hall])),
    [hallsQuery.data],
  )
  const showtimes = showtimesQuery.data ?? []
  const loading = showtimesQuery.isLoading || hallsQuery.isLoading
  const error = showtimesQuery.isError || hallsQuery.isError

  if (selectedShowtime) {
    return (
      <SeatSelectionModal
        movie={movie}
        showtime={selectedShowtime}
        hall={halls.get(selectedShowtime.hallId)!}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{movie.title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {loading && <div className="text-center text-gray-500">Loading showtimes...</div>}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Failed to load showtimes. Please try again.
            </div>
          )}
          {!loading && !error && showtimes.length === 0 && (
            <div className="text-center text-gray-500">No showtimes available</div>
          )}
          {!loading && !error && showtimes.length > 0 && (
            <div className="space-y-2">
              {showtimes.map((showtime) => {
                const hall = halls.get(showtime.hallId)
                const startTime = new Date(showtime.startTime)
                return (
                  <button
                    key={`${showtime.hallId}-${showtime.startTime}`}
                    onClick={() => setSelectedShowtime(showtime)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between"
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">
                        {startTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="text-sm text-gray-600">{hall?.name}</div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
