export function extractTags(raw) {
  const source = raw?.tags ?? raw?.tag_list ?? raw?.labels ?? raw?.keywords ?? []
  const arr = Array.isArray(source) ? source : (source ? [source] : [])
  return arr
    .map((t) => (typeof t === 'string' ? t.trim() : (t?.name ?? t?.title ?? t?.label ?? null)))
    .filter(Boolean)
}

export function toPlainExcerpt(rawText, max = 150) {
  const cleaned = String(rawText ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_~>#-]+/g, ' ')
    .trim()

  const decoded = typeof window !== 'undefined'
    ? (() => {
        const parser = new window.DOMParser()
        const doc = parser.parseFromString(cleaned, 'text/html')
        return doc.documentElement.textContent ?? ''
      })()
    : cleaned

  const text = decoded.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}
