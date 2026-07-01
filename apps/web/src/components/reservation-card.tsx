import { Reservation } from '../lib/api'
import { cardClasses } from '../lib/class-names'

interface ReservationCardProps {
  reservation: Reservation
}

export default function ReservationCard({
  reservation,
}: ReservationCardProps) {
  const isConfirmed = reservation.status === 'confirmed'
  const isCancelled = reservation.status === 'cancelled'
  
  const borderColor = isConfirmed ? 'border-green-200' : isCancelled ? 'border-red-200' : 'border-yellow-200'
  const bgColor = isConfirmed ? 'bg-green-50' : isCancelled ? 'bg-red-50' : 'bg-yellow-50'
  const statusBgColor = isConfirmed ? 'bg-green-100 text-green-800' : isCancelled ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'

  return (
    <div className={`${cardClasses} ${borderColor} border-l-4 flex items-center justify-between group hover:shadow-lg transition-shadow`}>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Reservation #{reservation.id}</h3>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusBgColor}`}>
            {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Hall:</span>
            <span className="text-gray-900">
              {reservation.hall?.name ?? `Hall ${reservation.hallId}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Seats:</span>
            <span className="text-gray-900">
              {reservation.seats
                .map((s) => s.seatNumber ?? `Seat ${s.id}`)
                .join(', ')}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600 font-medium">Total Price:</span>
            <span className="text-lg font-bold text-gray-900">
              ${(reservation.totalAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <div className="text-gray-400 text-2xl ml-4 group-hover:translate-x-1 transition-transform">
        →
      </div>
    </div>
  )
}
