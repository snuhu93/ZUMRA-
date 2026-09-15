import { avatarColor, initials } from '../lib/utils'

export function Avatar({
  name,
  src,
  size = 40,
  className = '',
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  const gradient = avatarColor(name || 'Z')
  const fontSize = Math.max(12, Math.floor(size * 0.4))

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials(name) || 'Z'}
    </div>
  )
}
