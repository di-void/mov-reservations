import { useQuery } from '@tanstack/react-query'
import { moviesAPI } from '../lib/api'
import MovieCard from '../components/movie-card'

export default function MoviesPage() {
  const { data: movies = [], isLoading, isError } = useQuery({
    queryKey: ['movies'],
    queryFn: () => moviesAPI.getAll().then((response) => response.data),
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading movies...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Failed to load movies. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">🎬 Now Showing</h1>
      {movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No movies available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  )
}
