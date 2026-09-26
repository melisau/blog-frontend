import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readSetting(name) {
  if (process.env[name]) return process.env[name].trim()
  try {
    const envFile = await readFile(path.join(projectRoot, '.env'), 'utf8')
    const line = envFile.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`))
    if (!line) return ''
    return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '')
  } catch {
    return ''
  }
}

function xmlEscape(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character])
}

function asIsoDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const configuredOrigin = await readSetting('VITE_SITE_URL')
const deploymentHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
const siteOrigin = new URL(configuredOrigin || deploymentHost || 'https://blog-projesi.vercel.app').origin
const apiBase = (await readSetting('VITE_API_URL')) || 'http://localhost:8000'
const entries = new Map()

function addEntry(urlPath, lastModified) {
  const url = new URL(urlPath, siteOrigin).href
  const previous = entries.get(url)
  const modified = asIsoDate(lastModified)
  entries.set(url, { url, lastModified: modified || previous?.lastModified || '' })
}

addEntry('/')
addEntry('/hakkinda')

async function fetchJson(pathname) {
  const response = await fetch(new URL(pathname, apiBase), { signal: AbortSignal.timeout(4000) })
  if (!response.ok) throw new Error(`API yanıtı ${response.status}`)
  return response.json()
}

try {
  const categoryData = await fetchJson('/categories')
  const categories = Array.isArray(categoryData) ? categoryData : (categoryData?.items ?? [])
  for (const category of categories) {
    const name = typeof category === 'string' ? category : category?.name
    if (name) addEntry(`/?category=${encodeURIComponent(name)}`)
  }

  let skip = 0
  const pageSize = 100
  while (entries.size < 50000) {
    const blogData = await fetchJson(`/blogs?skip=${skip}&limit=${pageSize}`)
    const blogs = Array.isArray(blogData) ? blogData : (blogData?.items ?? [])
    for (const blog of blogs) {
      if (blog?.id) addEntry(`/blogs/${encodeURIComponent(blog.id)}`, blog.updated_at ?? blog.created_at)
    }
    if (blogs.length < pageSize) break
    skip += blogs.length
  }
} catch (error) {
  console.warn(`Sitemap API verileri alınamadı; temel sayfalar yazılıyor. ${error.message}`)
}

const body = [...entries.values()]
  .map(({ url, lastModified }) => `  <url><loc>${xmlEscape(url)}</loc>${lastModified ? `<lastmod>${lastModified}</lastmod>` : ''}</url>`)
  .join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
const outputPath = path.join(projectRoot, 'dist', 'sitemap.xml')
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, sitemap, 'utf8')
console.log(`Sitemap hazır: ${entries.size} URL (${outputPath})`)
