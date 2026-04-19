import { Link } from 'react-router-dom'
import Avatar from './Avatar'

function looksLikeHtml(content) {
  return /<\/?[a-z][\s\S]*>/i.test(content ?? '')
}

function sanitizeHtml(input) {
  if (typeof window === 'undefined') return input
  const parser = new window.DOMParser()
  const doc = parser.parseFromString(input, 'text/html')

  const allowed = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'blockquote',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u',
    'code', 'pre',
    'a',
  ])

  const safeUrl = (href) => /^(https?:\/\/|\/|#)/i.test(href)
  const nodes = Array.from(doc.body.querySelectorAll('*'))

  nodes.forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (!allowed.has(tag)) {
      el.replaceWith(doc.createTextNode(el.textContent ?? ''))
      return
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || name === 'style') {
        el.removeAttribute(attr.name)
        return
      }
      if (tag === 'a') {
        const keep = ['href', 'target', 'rel', 'title']
        if (!keep.includes(name)) el.removeAttribute(attr.name)
      } else {
        el.removeAttribute(attr.name)
      }
    })

    if (tag === 'a') {
      const href = el.getAttribute('href') ?? ''
      if (!safeUrl(href)) el.removeAttribute('href')
      if (el.getAttribute('target') === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })

  return doc.body.innerHTML
}

function renderInline(text) {
  const result = []
  let rest = text
  let key = 0

  const patterns = [
    { type: 'link', regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
    { type: 'code', regex: /`([^`]+)`/ },
    { type: 'underline', regex: /\+\+([^+]+)\+\+/ },
    { type: 'bold', regex: /\*\*([^*]+)\*\*/ },
    { type: 'italic', regex: /\*([^*]+)\*/ },
  ]

  while (rest.length > 0) {
    let nearest = null

    patterns.forEach((p) => {
      const m = rest.match(p.regex)
      if (!m) return
      const index = m.index ?? 0
      if (!nearest || index < nearest.index) {
        nearest = { type: p.type, match: m, index }
      }
    })

    if (!nearest) {
      result.push(rest)
      break
    }

    if (nearest.index > 0) {
      result.push(rest.slice(0, nearest.index))
    }

    const [full, g1, g2] = nearest.match
    if (nearest.type === 'link') {
      result.push(
        <a key={`i-${key++}`} href={g2} target="_blank" rel="noreferrer">
          {g1}
        </a>
      )
    } else if (nearest.type === 'code') {
      result.push(<code key={`i-${key++}`}>{g1}</code>)
    } else if (nearest.type === 'underline') {
      result.push(<u key={`i-${key++}`}>{renderInline(g1)}</u>)
    } else if (nearest.type === 'bold') {
      result.push(<strong key={`i-${key++}`}>{renderInline(g1)}</strong>)
    } else if (nearest.type === 'italic') {
      result.push(<em key={`i-${key++}`}>{renderInline(g1)}</em>)
    }

    rest = rest.slice(nearest.index + full.length)
  }

  return result
}

function renderRichContent(content) {
  if (!content?.trim()) return null
  if (looksLikeHtml(content)) {
    return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()

    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.trimStart().startsWith('```')) {
      const codeLines = []
      i += 1
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(
        <pre key={`b-${key++}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const Tag = `h${Math.min(6, level)}`
      blocks.push(<Tag key={`b-${key++}`}>{renderInline(heading[2])}</Tag>)
      i += 1
      continue
    }

    if (line.match(/^>\s?/)) {
      const quoteLines = []
      while (i < lines.length && lines[i].trim().match(/^>\s?/)) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(<blockquote key={`b-${key++}`}>{renderInline(quoteLines.join(' '))}</blockquote>)
      continue
    }

    if (line.match(/^[-*+]\s+/)) {
      const items = []
      while (i < lines.length && lines[i].trim().match(/^[-*+]\s+/)) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul key={`b-${key++}`}>
          {items.map((item, idx) => (
            <li key={`li-${idx}`}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (line.match(/^\d+\.\s+/)) {
      const items = []
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol key={`b-${key++}`}>
          {items.map((item, idx) => (
            <li key={`li-${idx}`}>{renderInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    const paragraph = [line.trim()]
    i += 1
    while (i < lines.length && lines[i].trim() && !lines[i].trimStart().startsWith('```')) {
      const candidate = lines[i].trim()
      if (
        candidate.match(/^(#{1,6})\s+/) ||
        candidate.match(/^>\s?/) ||
        candidate.match(/^[-*+]\s+/) ||
        candidate.match(/^\d+\.\s+/)
      ) break
      paragraph.push(candidate)
      i += 1
    }
    blocks.push(<p key={`b-${key++}`}>{renderInline(paragraph.join(' '))}</p>)
  }

  return blocks
}

export default function BlogContent({ 
  blog, 
  isBlogAuthor, 
  onDeleteBlog, 
  deletingBlog 
}) {
  return (
    <article className="blog-article">
      {blog.imageUrl && (
        <div className="blog-article__cover">
          <img src={blog.imageUrl} alt={blog.title} />
        </div>
      )}

      <div className="blog-article__meta">
        <div className="blog-card__tags">
          {blog.category && (
            <Link
              to={`/?category=${encodeURIComponent(blog.category)}`}
              className="blog-card__tag blog-card__tag--link"
            >
              {blog.category}
            </Link>
          )}
          {blog.tags.map((t) => (
            <Link
              key={t}
              to={`/?tag=${encodeURIComponent(t)}`}
              className="blog-card__tag blog-card__tag--outline blog-card__tag--link"
            >
              #{t}
            </Link>
          ))}
          {!blog.category && blog.tags.length === 0 && (
            <span className="blog-card__tag">Genel</span>
          )}
        </div>
        <span className="blog-article__date">{blog.date}</span>
      </div>

      <h1 className="blog-article__title">{blog.title}</h1>

      <div className="blog-article__author">
        <Avatar userId={blog.author.id} username={blog.author.username} size="md" iconId={blog.author.iconId ?? null} />
        <div className="blog-article__author-info">
          {blog.author.username && blog.author.id ? (
            <Link to={`/profile/${blog.author.id}`} className="blog-article__author-name">
              {blog.author.username}
            </Link>
          ) : blog.author.username ? (
            <span className="blog-article__author-name">{blog.author.username}</span>
          ) : null}
          <span className="blog-article__author-date">{blog.date} tarihinde yayınlandı</span>
        </div>
      </div>

      <div className="blog-article__content">
        {renderRichContent(blog.content)}
      </div>

      {isBlogAuthor && (
        <div className="blog-article__actions">
          <Link to={`/edit-blog/${blog.id}`} className="btn btn--ghost">Düzenle</Link>
          <button
            className="btn btn--danger"
            onClick={onDeleteBlog}
            disabled={deletingBlog}
          >
            {deletingBlog ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      )}
    </article>
  )
}
