import HeartIcon from './icons/HeartIcon'
import CommentIcon from './icons/CommentIcon'

export default function BlogCardStats({ favoriteCount = 0, commentCount = 0 }) {
  return (
    <div className="blog-card__stats">
      <span className="blog-card__stat" title="Favori sayısı" aria-label={`Favori sayısı ${favoriteCount}`}>
        <HeartIcon size={13} />
        <span>{favoriteCount}</span>
      </span>
      <span className="blog-card__stat" title="Yorum sayısı" aria-label={`Yorum sayısı ${commentCount}`}>
        <CommentIcon size={13} />
        <span>{commentCount}</span>
      </span>
    </div>
  )
}
