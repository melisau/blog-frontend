import { useRef, useState } from 'react'

function withSelection(textarea, updater) {
  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? 0
  const before = textarea.value.slice(0, start)
  const selected = textarea.value.slice(start, end)
  const after = textarea.value.slice(end)
  return updater({ before, selected, after, start, end })
}

export default function RichTextEditor({ id, value, onChange, placeholder, hasError }) {
  const textareaRef = useRef(null)
  const [mode, setMode] = useState(() => (/<\/?[a-z][\s\S]*>/i.test(value ?? '') ? 'html' : 'markdown'))

  function updateValue(nextValue, nextCursor = null) {
    onChange(nextValue)
    requestAnimationFrame(() => {
      if (!textareaRef.current || nextCursor == null) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(nextCursor, nextCursor)
    })
  }

  function wrapSelection(prefix, suffix = prefix, fallback = 'metin') {
    const el = textareaRef.current
    if (!el) return

    const next = withSelection(el, ({ before, selected, after, start }) => {
      const inner = selected || fallback
      const nextValue = `${before}${prefix}${inner}${suffix}${after}`
      const cursor = start + prefix.length + inner.length + suffix.length
      return { nextValue, cursor }
    })
    updateValue(next.nextValue, next.cursor)
  }

  function prefixLines(prefix) {
    const el = textareaRef.current
    if (!el) return

    const next = withSelection(el, ({ before, selected, after, start, end }) => {
      const block = (selected || 'satir').split('\n').map((line) => `${prefix}${line}`).join('\n')
      const nextValue = `${before}${block}${after}`
      const cursor = end + (block.length - (selected || 'satir').length)
      return { nextValue, cursor: cursor + (selected ? 0 : prefix.length) }
    })
    updateValue(next.nextValue, next.cursor)
  }

  function insertLink() {
    const el = textareaRef.current
    if (!el) return
    const selected = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0) || 'bağlantı'
    const url = window.prompt('Bağlantı URL\'si:', 'https://')
    if (!url) return
    if (mode === 'html') {
      wrapSelection(`<a href="${url}" target="_blank" rel="noreferrer">`, '</a>', selected)
    } else {
      wrapSelection(`[`, `](${url})`, selected)
    }
  }

  function makeBold() {
    if (mode === 'html') wrapSelection('<strong>', '</strong>')
    else wrapSelection('**', '**')
  }

  function makeItalic() {
    if (mode === 'html') wrapSelection('<em>', '</em>')
    else wrapSelection('*', '*')
  }

  function makeUnderline() {
    if (mode === 'html') wrapSelection('<u>', '</u>')
    else wrapSelection('++', '++')
  }

  function makeHeading(level) {
    if (mode === 'html') {
      wrapSelection(`<h${level}>`, `</h${level}>`, `Başlık ${level}`)
    } else {
      prefixLines(`${'#'.repeat(level)} `)
    }
  }

  function makeQuote() {
    if (mode === 'html') wrapSelection('<blockquote>', '</blockquote>')
    else prefixLines('> ')
  }

  function makeList(ordered = false) {
    if (mode === 'html') {
      const wrapper = ordered ? ['<ol><li>', '</li></ol>'] : ['<ul><li>', '</li></ul>']
      wrapSelection(wrapper[0], wrapper[1], 'Liste öğesi')
    } else {
      prefixLines(ordered ? '1. ' : '- ')
    }
  }

  function makeCode() {
    if (mode === 'html') wrapSelection('<code>', '</code>', 'kod')
    else wrapSelection('`', '`')
  }

  return (
    <div className={`rte${hasError ? ' rte--error' : ''}`}>
      <div className="rte__toolbar">
        <div className="rte__mode">
          <button
            type="button"
            className={`rte__mode-btn${mode === 'markdown' ? ' rte__mode-btn--active' : ''}`}
            onClick={() => setMode('markdown')}
          >
            Markdown
          </button>
          <button
            type="button"
            className={`rte__mode-btn${mode === 'html' ? ' rte__mode-btn--active' : ''}`}
            onClick={() => setMode('html')}
          >
            HTML
          </button>
        </div>

        <button type="button" className="rte__btn" onClick={makeBold} aria-label="Kalın"><b>B</b></button>
        <button type="button" className="rte__btn" onClick={makeItalic} aria-label="İtalik"><i>I</i></button>
        <button type="button" className="rte__btn" onClick={makeUnderline} aria-label="Altı çizili"><u>U</u></button>
        <button type="button" className="rte__btn" onClick={() => makeHeading(1)} aria-label="Başlık 1">H1</button>
        <button type="button" className="rte__btn" onClick={() => makeHeading(2)} aria-label="Başlık 2">H2</button>
        <button type="button" className="rte__btn" onClick={() => makeHeading(3)} aria-label="Başlık 3">H3</button>
        <button type="button" className="rte__btn" onClick={makeQuote} aria-label="Alıntı">"</button>
        <button type="button" className="rte__btn" onClick={() => makeList(false)} aria-label="Liste">• Liste</button>
        <button type="button" className="rte__btn" onClick={() => makeList(true)} aria-label="Numaralı liste">1. Liste</button>
        <button type="button" className="rte__btn" onClick={makeCode} aria-label="Kod">`kod`</button>
        <button type="button" className="rte__btn" onClick={insertLink} aria-label="Link">Link</button>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="field-input field-textarea rte__textarea"
        placeholder={placeholder}
      />
    </div>
  )
}
