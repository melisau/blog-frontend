import { Link } from 'react-router-dom'
import Avatar from './Avatar'

export default function CommentItem({ 
  comment, 
  isAuthenticated, 
  currentUser, 
  onDelete, 
  isDeleting 
}) {
  const isCommentAuthor = isAuthenticated && 
                          currentUser?.id != null && 
                          String(currentUser.id) === String(comment.author?.id)
  
  const authorName = comment.author?.username || 
                    (isCommentAuthor ? (currentUser.username || currentUser.name || currentUser.full_name) : null) || 
                    'Bilinmeyen Kullanıcı'

  return (
    <div className="comment">
      <Avatar 
        userId={comment.author?.id} 
        username={authorName} 
        size="sm" 
        iconId={comment.author?.iconId ?? (isCommentAuthor ? currentUser?.icon_id : null)} 
      />
      <div className="comment__body">
        <div className="comment__header">
          {comment.author?.id ? (
            <Link to={`/profile/${comment.author.id}`} className="comment__author">
              {authorName}
            </Link>
          ) : (
            <span className="comment__author">{authorName}</span>
          )}
          <span className="comment__date">{comment.date}</span>
          {isCommentAuthor && (
            <button
              className="comment__delete"
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              aria-label="Yorumu sil"
            >
              {isDeleting ? '…' : '×'}
            </button>
          )}
        </div>
        <p className="comment__text">{comment.content}</p>
      </div>
    </div>
  )
}
