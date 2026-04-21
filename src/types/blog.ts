export interface BlogAuthor {
  id?: number | string | null
  username?: string | null
  icon_id?: number | string | null
  iconId?: number | string | null
}

export interface BlogItem {
  id: number | string
  title?: string
  created_at?: string
  createdAt?: string
  date?: string
  excerpt?: string
  summary?: string
  description?: string
  content?: string
  body?: string
  category?: string | { name?: string }
  tags?: string[]
  author?: BlogAuthor
  author_id?: number | string | null
  author_name?: string | null
  owner_name?: string | null
  cover_image_url?: string | null
  image_url?: string | null
  imageUrl?: string | null
  favorite_count?: number
  favorites_count?: number
  like_count?: number
  likes_count?: number
  comment_count?: number
  comments_count?: number
}

export interface BlogResponse {
  items?: BlogItem[]
  results?: BlogItem[]
  blogs?: BlogItem[]
  posts?: BlogItem[]
  data?: BlogItem[]
  content?: BlogItem[]
}
