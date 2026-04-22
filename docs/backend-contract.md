# Backend API Kontrat Spesifikasyonu

Bu doküman, frontend'de (`blog-frontend`) şu anda **workaround** olarak taşınan iş mantığının backend'e taşınması için gerekli endpoint ve şema değişikliklerini tanımlar.

- **Hedef:** Her endpoint için **tek ve net** bir request / response şeması olsun; frontend alias (`_id`, `title`, `image_url`, vs.) okumak zorunda kalmasın.
- **Uyum stratejisi:** Backend bu dokümandaki değişiklikleri **geriye uyumlu** olarak devreye almalı (yeni alanlar/endpoint'ler eklenir, eskiler bir süre daha dönmeye devam eder). Frontend yeni kontrata geçtikten sonra eski alanlar deprecate edilip kaldırılır.
- **Format:** Tüm zaman damgaları ISO 8601 UTC (`2026-04-22T10:15:30Z`). Tüm id'ler `integer`. Tüm alan adları `snake_case`.

İçindekiler:

1. [Kategoriler](#1-kategoriler)
2. [Blog — create / update / read](#2-blog--create--update--read)
3. [Kullanıcı güncelleme (PUT /users/{id})](#3-kullanıcı-güncelleme-put-usersid)
4. [Kullanıcı istatistikleri (GET /users/{id}/stats)](#4-kullanıcı-istatistikleri-get-usersidstats)
5. [Top tags (GET /tags/top)](#5-top-tags-get-tagstop)
6. [Migration sırası](#6-migration-sırası)
7. [Frontend kaynak referansları](#7-frontend-kaynak-referansları)

---

## 1. Kategoriler

### Neden değişiyor

Frontend (`NewBlog.jsx`, `EditBlog.jsx`) şu anda response'u şöyle normalize ediyor:

```js
const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.categories ?? [])
const mapped = list.map((c) =>
  typeof c === 'string'
    ? { id: c, name: c }
    : { id: c.id ?? c._id ?? c.name ?? c.title ?? String(c), name: c.name ?? c.title ?? String(c) }
)
```

Bu, backend'in 5 farklı formatta cevap vermesine karşı savunma. Üstelik iki sayfa aynı response'u **farklı** şekillerde normalize ediyor (`NewBlog` obje tutuyor, `EditBlog` string tutuyor) ve submit'te `NewBlog` `category_id`, `EditBlog` `category` (isim) gönderiyor — yani şu an create ile update farklı kontrat konuşuyor, muhtemelen mevcut bir bug.

### Yeni kontrat

#### `GET /categories`

**Response 200:**

```json
{
  "items": [
    { "id": 1, "name": "Teknoloji", "slug": "teknoloji" },
    { "id": 2, "name": "Yaşam",     "slug": "yasam"     }
  ]
}
```

Kurallar:

- Her zaman `{ "items": [...] }` zarfı. Üst seviyede çıplak dizi **dönmez**.
- Eleman alanları tam olarak `id`, `name`, `slug`. `_id`, `title` gibi alias **dönmez**.
- Boş liste bile `{ "items": [] }` olarak döner (`null` değil).

#### `GET /categories/{id}`

**Response 200:** tekil eleman, yukarıdaki şemayla aynı:

```json
{ "id": 1, "name": "Teknoloji", "slug": "teknoloji" }
```

**404:** kategori yoksa standart hata zarfı (bkz. [Hata formatı](#hata-formatı)).

### Frontend'e etkisi

- `FALLBACK_CATEGORIES` sabitleri `NewBlog.jsx` ve `EditBlog.jsx`'ten kaldırılır.
- `useCategories` ortak hook'u açılır, her iki sayfa bunu kullanır.
- Kategori API'si hata verirse form **disable** edilir + “Kategoriler yüklenemedi, tekrar dene” butonu gösterilir (fallback liste **gösterilmez**).

---

## 2. Blog — create / update / read

### Neden değişiyor

- `NewBlog.jsx` submit'te `category_id` gönderiyor, `EditBlog.jsx` `category` (isim string) gönderiyor → **iki ekran farklı kontrat konuşuyor**.
- `EditBlog.jsx` GET cevabından `cover_image_url ?? image_url ?? imageUrl`, `category ?? tag`, `content ?? body` zincirleri okuyor → backend'in birden çok isimle dönebilmesine karşı savunma.
- Kapak resmi silme niyeti `image_url: ""` ile ifade ediliyor → backend'de “boş string mi = sil, mi = değiştirme” belirsizliği.

### Yeni kontrat

#### Blog objesi şeması

Tüm blog endpoint'lerinin (hem liste hem tekil) dönüş şeması:

```json
{
  "id": 123,
  "title": "Örnek Başlık",
  "content": "<p>HTML içerik</p>",
  "tags": ["react", "vite"],
  "cover_image_url": "https://cdn.example.com/covers/123.jpg",
  "category": { "id": 1, "name": "Teknoloji", "slug": "teknoloji" },
  "author": {
    "id": 42,
    "username": "melisa",
    "icon_id": 3
  },
  "favorite_count": 17,
  "comment_count": 4,
  "created_at": "2026-04-22T10:15:30Z",
  "updated_at": "2026-04-22T10:15:30Z"
}
```

Kurallar:

- Kapak alanı tek ve sabit: `cover_image_url`. `image_url`, `imageUrl` **dönmez**.
- İçerik alanı tek: `content`. `body` **dönmez**.
- Kategori **nested obje** olarak döner (`category.id` frontend'e lazım, `category.name` gösterim için). Ayrıca düz `category` string'i **dönmez**.
- Kapak yoksa `cover_image_url` alanı `null` (alan atlanmaz).

#### `GET /blogs` ve `GET /blogs/{id}`

Yukarıdaki şema. Listede sayfalama zarfı:

```json
{
  "items": [ /* Blog objesi[] */ ],
  "total": 128,
  "limit": 6,
  "skip":  0
}
```

Query parametreleri:

- `limit` (default 10, max 100)
- `skip` (default 0)
- `category_id` (integer, opsiyonel)
- `tag` (string, opsiyonel)
- `q` (string, opsiyonel — başlık/içerik arama)
- `author_id` (integer, opsiyonel)

#### `POST /blogs`

**Content-Type:** `multipart/form-data` (kapak opsiyonel olduğundan) veya `application/json`.

**Request alanları:**

| alan           | tip       | zorunlu | açıklama                        |
|----------------|-----------|---------|---------------------------------|
| `title`        | string    | evet    | min 5 karakter                  |
| `content`      | string    | evet    | min 20 karakter, HTML kabul     |
| `category_id`  | integer   | evet    | `/categories` içinden geçerli id |
| `tags`         | string[]  | hayır   | JSON encode (multipart durumunda), max 5, her biri 2-24 karakter |
| `cover_image`  | file      | hayır   | sadece multipart; ≤ 5 MB, image/* |

**Response 201:** yukarıdaki Blog objesi (yeni oluşturulan).

**Hatalar:** 400 (validasyon), 401 (auth yok), 413 (dosya çok büyük), 415 (yanlış mime).

#### `PUT /blogs/{id}`

**Content-Type:** iki mod desteklenir:

**Mod A — JSON (kapak değişmeyecek veya silinecek durumlar):**

```json
{
  "title": "Yeni Başlık",
  "content": "<p>…</p>",
  "category_id": 2,
  "tags": ["react"],
  "remove_cover_image": false
}
```

**Mod B — multipart/form-data (yeni kapak yüklenecek):**

| alan          | tip     | zorunlu | açıklama                   |
|---------------|---------|---------|----------------------------|
| `title`       | string  | evet    |                            |
| `content`     | string  | evet    |                            |
| `category_id` | integer | evet    |                            |
| `tags`        | string  | hayır   | JSON-stringify edilmiş dizi |
| `cover_image` | file    | evet    | yeni kapak                 |

Kurallar:

- Kapak silme niyeti **yalnızca** `remove_cover_image: true` ile ifade edilir (JSON modunda).
- `image_url` / `cover_image_url` alanları request'te **kabul edilmez** (varsa 400 dönmeli).
- `remove_cover_image: true` + `cover_image` dosyası aynı istekte gelemez → 400.
- Kısmi update (PATCH semantiği) **bu endpoint'te yok**; `PUT` bütün kaydı replace eder, tüm zorunlu alanlar beklenir.

**Response 200:** güncel Blog objesi.

**Hatalar:** 400, 401, 403 (başka kullanıcının yazısı), 404, 413, 415, 422 (çelişik flag'ler).

### Frontend'e etkisi

- `EditBlog.jsx`:
  - `data.category ?? data.tag`, `data.content ?? data.body`, `cover_image_url ?? image_url ?? imageUrl` zincirleri silinir.
  - State: `fields.categoryId` tutulur (string isim değil).
  - Submit: `coverFile` varsa multipart (category_id ile), yoksa JSON + `remove_cover_image: coverRemoved`. `image_url: ''` kullanımı tamamen kalkar.
- `NewBlog.jsx`:
  - `category_id` göndermeye devam; değişiklik yok (zaten doğru).
  - `tags` JSON stringify'ı backend tarafından kabul edildiği sürece değişiklik yok.

---

## 3. Kullanıcı güncelleme (PUT /users/{id})

### Neden değişiyor

Frontend (`Profile.jsx::handleEditSave`) backend hatasını **sessiz yutuyor**, UI ve localStorage yine güncelleniyor, kullanıcıya “Profil güncellendi ✓” gösteriliyor. Bu sessiz veri kaybına yol açıyor. Backend kontrat net olursa frontend kolayca düzgün hata gösterebilir.

Ek: `GET /users/{id}` cevabı şu an `created_at` / `createdAt` / `joined_at` alias'larından hangisi gelirse onu kullanıyor. Sabit olmalı.

### Yeni kontrat

#### User objesi şeması

```json
{
  "id": 42,
  "username": "melisa",
  "email": "melisa@example.com",
  "bio": "Frontend geliştirici",
  "icon_id": 3,
  "created_at": "2025-11-01T09:30:00Z",
  "updated_at": "2026-04-22T10:15:30Z"
}
```

Kurallar:

- Zaman alanı tek: `created_at`. `createdAt`, `joined_at` **dönmez**.
- Avatar alanı tek: `icon_id` (1-tabanlı, frontend `AVATARS[].id` ile eşleşir). `null` = baş harfli default.
- Sayaç alanları bu objede **yok**; istatistikler için [Bölüm 4](#4-kullanıcı-istatistikleri-get-usersidstats).
- `email` sadece kullanıcı kendi profilini (veya admin) getiriyorsa döner; başka kullanıcı getiriyorsa `null` veya alan atlanmış olur.

#### `GET /users/{id}`

Yukarıdaki User objesi. 404 kullanıcı yoksa.

#### `PUT /users/{id}`

**Yetki:** yalnızca kendi profili veya admin.

**Request (JSON):**

```json
{
  "username": "melisa",
  "bio": "Frontend geliştirici",
  "icon_id": 3
}
```

Kurallar:

- Tüm alanlar opsiyonel (partial update kabul edilir — kullanıcı sadece avatarı değiştirmek isteyebilir).
- `username`: 3-50 karakter, unique. Çakışırsa 409.
- `bio`: max 300 karakter.
- `icon_id`: `null` veya pozitif integer (frontend'deki AVATARS listesinde geçerli id). Geçersizse 400.
- `email` / `password` bu endpoint'ten **değiştirilmez** (ayrı endpoint'ler olmalı; bu spec'in kapsamı dışında).

**Response 200:** güncel User objesi.

**Hatalar:**

| kod | durum                              | `detail` örneği                     |
|-----|------------------------------------|-------------------------------------|
| 400 | validasyon (kısa username, geçersiz icon_id) | "Kullanıcı adı en az 3 karakter olmalı." |
| 401 | auth yok                           | —                                   |
| 403 | başka kullanıcının profili         | "Bu profili düzenleyemezsiniz."     |
| 404 | kullanıcı yok                      | —                                   |
| 409 | username çakışması                 | "Bu kullanıcı adı zaten kullanılıyor." |

### Frontend'e etkisi

`Profile.jsx::handleEditSave` şuna dönüşür:

```js
try {
  const { data } = await axiosInstance.put(`/users/${id}`, payload)
  // Başarı: backend'in döndürdüğü user objesiyle state güncelle
  setProfileUser(normalizeUser(data))
  if (isOwnProfile) updateUser(data)
  saveAvatarCache(id, data.icon_id)
  setAvatarChoice(data.icon_id)
  setEditSuccess(true)
} catch (err) {
  // Hata: UI ve localStorage'a DOKUNMA, mesaj göster
  if (err.response?.status === 409) {
    setEditErrors({ username: 'Bu kullanıcı adı zaten kullanılıyor.' })
  } else {
    setEditServerErr(err.response?.data?.detail ?? 'Profil güncellenemedi.')
  }
  return
} finally {
  setEditSaving(false)
}
```

---

## 4. Kullanıcı istatistikleri (GET /users/{id}/stats)

### Neden değişiyor

`Profile.jsx`:

- `blogCount`'u blog listesinin uzunluğundan türetiyor (`normalizeBlogs(data, 120)` → `list.length`). 120'den fazla yazısı olan kullanıcıda yanlış.
- `followers` / `following` sayısını 100'er 100'er sayfalayarak **manuel sayıyor** (kod: `fetchConnectionCount`, 30+ satır).

### Yeni kontrat

#### `GET /users/{id}/stats`

**Response 200:**

```json
{
  "post_count": 27,
  "comment_count": 112,
  "followers_count": 340,
  "following_count": 58
}
```

Kurallar:

- Tüm alanlar **zorunlu** ve `integer ≥ 0`. Hiçbiri opsiyonel değil, null değil.
- Hesaplama backend'de (tercihen DB agregasyon / cached counter).
- 404 kullanıcı yoksa.

**Neden ayrı endpoint?**

- Ana `GET /users/{id}` kimlik/profil verisi; sayaçlar pahalı sorgular olabilir ve cache'lenmeleri farklı olur.
- Takip/takipçi/yorum sayısı takip-et butonu sonrası değişir; frontend sadece `/stats`'ı yeniden çağırarak hafif bir refresh yapar, tüm user objesini tekrar çekmez.

### Frontend'e etkisi

`Profile.jsx`:

- `fetchConnectionCount` fonksiyonu ve içeren useEffect (satır 100-151) **silinir**.
- Blog listesi fetch'inden sonraki `setProfileUser({..., blogCount: list.length})` satırı **silinir**.
- Yeni bir useEffect `id` değişince `/users/${id}/stats`'ı çağırır ve 4 sayacı state'e koyar.
- `handleToggleFollow` sonrası yine sadece `/stats`'ı yeniden çağırır.

---

## 5. Top tags (GET /tags/top)

### Neden değişiyor

`Home.jsx` her render'da `GET /blogs?limit=100` çağırıp frontend'de sayım yapıyor. Sadece ilk 100 yazıya göre sonuç verdiği için ölçek büyüdükçe yanlışlaşır; ayrıca 100 blog sürekli indiriliyor (bandwidth).

### Yeni kontrat

#### `GET /tags/top`

**Query:**

- `limit` (integer, default 10, max 50)

**Response 200:**

```json
[
  { "name": "react", "count": 42 },
  { "name": "vite",  "count": 17 }
]
```

Kurallar:

- Çıplak dizi döner (bu endpoint sayfalanmıyor, küçük ve sabit).
- Sıralama: `count` büyükten küçüğe; tie-break `name` alfabetik.
- Hesaplama backend'de (tercihen periyodik cache; canlı hesap şart değil).

### Frontend'e etkisi

`Home.jsx`:

- Satır 34-55'teki `/blogs?limit=100` + `extractTags` + `Map` sayım bloğu **silinir**.
- Yerine:
  ```js
  axiosInstance.get('/tags/top', { params: { limit: 10 } })
    .then(({ data }) => setRecentTags(data.map((t) => t.name)))
  ```
- `extractTags` importu bu dosyada gereksizleşirse kaldırılır (başka yerde hâlâ kullanılabilir, kontrol edilecek).

---

## Hata formatı

Tüm endpoint'ler hata için tutarlı zarf kullanmalı (FastAPI-uyumlu):

```json
{ "detail": "Kısa, insan-okunur mesaj." }
```

Alan bazlı validasyon hatası gerekiyorsa:

```json
{
  "detail": "Validasyon hatası",
  "errors": {
    "username": "En az 3 karakter olmalı.",
    "bio": "En fazla 300 karakter."
  }
}
```

Frontend şu an `err.response?.data?.detail ?? err.response?.data?.message ?? …` zinciri okuyor; `message` kullanımı kaldırılıp sadece `detail` bırakılmalı.

---

## 6. Migration sırası

Frontend–backend **aynı anda deploy edilmek zorunda kalmasın** diye şu sırayı izleyin:

### Faz 1 — Backend additive değişiklikler (kırıcı değil)

- `GET /categories` yeni zarf + `slug` ile döner. Eski flat dizi dönmeye **geçici** devam edebilir → değil, zaten frontend iki formatı da okuyor; direkt yeni şemaya geçin.
- Blog objesinde `category` nested + `cover_image_url` alanları eklensin; eski `category` string ve `image_url` **bir süre daha** dönsün.
- `GET /users/{id}/stats` eklensin.
- `GET /tags/top` eklensin.
- `POST/PUT /blogs` `category_id` ve `remove_cover_image` kabul etmeye başlasın; eski `category` (string) ve `image_url` da kabul edilmeye **geçici** devam etsin.
- `PUT /users/{id}` hata kodlarını net dönmeye başlasın (zaten olması gereken; sadece `detail` standardı sağlanacak).

### Faz 2 — Frontend refactor (bu doküman uygulandıktan sonra)

- `blog-frontend` tarafındaki 5 dosya (`Home.jsx`, `Profile.jsx`, `NewBlog.jsx`, `EditBlog.jsx`, yeni `useCategories` hook'u) yeni kontrata göre yeniden yazılır.
- Tüm workaround'lar (fallback listeler, alias zincirleri, sessiz catch'ler, manuel sayımlar) silinir.

### Faz 3 — Backend deprecate

- Frontend production'a çıkıp sorun olmadığı doğrulandıktan sonra backend:
  - Blog response'ta `category` (string) ve `image_url` alanlarını kaldırır.
  - Blog `POST/PUT` request'te eski alanları reddeder (400 döner).
  - `GET /categories` eski flat format desteğini kaldırır.

---

## 7. Frontend kaynak referansları

Bu dokümandaki her madde aşağıdaki frontend kodundan türetildi:

| Konu                         | Dosya / Satır                                                  |
|------------------------------|----------------------------------------------------------------|
| Top tags hesabı              | `src/pages/Home.jsx` 34-55                                     |
| Profile blog count türetme   | `src/pages/Profile.jsx` 283-293                                |
| Profile follow sayımı        | `src/pages/Profile.jsx` 100-151                                |
| Profile PUT hatası yutuluyor | `src/pages/Profile.jsx` 201-236                                |
| Kategori fallback (NewBlog)  | `src/pages/NewBlog.jsx` 7-8, 52-66                             |
| Kategori fallback (EditBlog) | `src/pages/EditBlog.jsx` 15, 78-88                             |
| Blog update kontrat karmaşası| `src/pages/EditBlog.jsx` 53-69, 143-180                        |
| User alias zinciri           | `src/pages/Profile.jsx` 26-48 (`normalizeUser`)                |

Backend bu dokümanı tamamladıktan sonra frontend refactor'ı ayrı bir PR'da yapılacaktır.
