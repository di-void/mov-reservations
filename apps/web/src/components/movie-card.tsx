import { useState } from 'react'
import { Movie } from '../lib/api'
import ShowtimeModal from './showtime-modal'
import { buttonClasses } from '../lib/class-names'

interface MovieCardProps {
  movie: Movie
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [showModal, setShowModal] = useState(false)

  const durationHours = Math.floor(movie.duration / 60)
  const durationMinutes = movie.duration % 60

  return (
    <>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <div className="text-6xl">🎞️</div>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{movie.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {movie.genre}
            </span>
            <span className="text-sm text-gray-600">⭐ {movie.rating.toFixed(1)}</span>
          </div>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{movie.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              ⏱️ {durationHours}h {durationMinutes}m
            </span>
            <button
              onClick={() => setShowModal(true)}
              className={`${buttonClasses.primary} text-sm`}
            >
              Book Tickets
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ShowtimeModal
          movie={movie}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
