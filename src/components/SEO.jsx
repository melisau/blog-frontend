import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Fitbook'
const SITE_SUFFIX = 'Fitbook | Topluluk Blogu'
const DEFAULT_DESCRIPTION = 'Fitbook; herkesin yazı paylaşabildiği, farklı konuları keşfedip yazarlarla etkileşime girebildiği bir topluluk blogudur.'

function getSiteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL?.trim()
  const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin
  const candidate = configured || currentOrigin
  return candidate ? candidate.replace(/\/+$/, '') : ''
}

function resolveCanonical(url) {
  const origin = getSiteOrigin()
  if (url) {
    try {
      return new URL(url, origin || window.location.origin).href
    } catch {
      return origin
    }
  }

  if (typeof window === 'undefined') return origin
  const params = new URLSearchParams(window.location.search)
  // Search terms are not distinct landing pages. Category/tag filters are.
  params.delete('q')
  const query = params.toString()
  return `${origin}${window.location.pathname}${query ? `?${query}` : ''}`
}

function serializeJsonLd(data) {
  if (!data) return null
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
  structuredData,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_SUFFIX
  const pageDescription = description || DEFAULT_DESCRIPTION
  const canonical = resolveCanonical(url)
  const resolvedImage = image
    ? (() => {
        try {
          return new URL(image, getSiteOrigin() || window.location.origin).href
        } catch {
          return undefined
        }
      })()
    : undefined
  const jsonLd = serializeJsonLd(structuredData)

  return (
    <Helmet>
      <html lang="tr" />
      <title>{fullTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'} />
      <meta name="author" content={SITE_NAME} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={pageDescription} />
      {canonical && <meta property="og:url" content={canonical} />}
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}

      <meta name="twitter:card" content={resolvedImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}

      {jsonLd && <script type="application/ld+json">{jsonLd}</script>}
    </Helmet>
  )
}

export { DEFAULT_DESCRIPTION, SITE_NAME }
