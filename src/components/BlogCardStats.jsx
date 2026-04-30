import HeartIcon from './icons/HeartIcon'
import CommentIcon from './icons/CommentIcon'

export default function BlogCardStats({ likeCount = 0, commentCount = 0 }) {
  return (
    <div className="blog-card__stats">
      <span className="blog-card__stat" title="Beğeni sayısı" aria-label={`Beğeni sayısı ${likeCount}`}>
        <HeartIcon size={13} />
        <span>{likeCount}</span>
      </span>
      <span className="blog-card__stat" title="Yorum sayısı" aria-label={`Yorum sayısı ${commentCount}`}>
        <CommentIcon size={13} />
        <span>{commentCount}</span>
      </span>
    </div>
  )
}
