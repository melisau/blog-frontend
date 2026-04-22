# Blog Frontend

Modern, tek sayfa (SPA) bir **blog platformu** için React tabanlı frontend uygulaması. Kullanıcılar blog yazıp yayınlayabilir, kategorilere ve etiketlere göre filtreleyebilir, favorilere ekleyebilir, diğer yazarları takip edebilir ve kendi kütüphanelerini yönetebilir.

> Bu repo yalnızca **frontend**'i içerir. Backend ayrı bir servistir ve beklenen API sözleşmesi [`docs/backend-contract.md`](docs/backend-contract.md) içinde tanımlıdır.

---

## İçindekiler

1. [Teknoloji Yığını](#teknoloji-yığını)
2. [Özellikler](#özellikler)
3. [Başlangıç](#başlangıç)
4. [Ortam Değişkenleri](#ortam-değişkenleri)
5. [NPM Script'leri](#npm-scriptleri)
6. [Proje Yapısı](#proje-yapısı)
7. [Routing](#routing)
8. [Mimari Kararlar](#mimari-kararlar)
9. [Testler](#testler)
10. [Backend Sözleşmesi](#backend-sözleşmesi)

---

## Teknoloji Yığını

| Katman | Araç | Sürüm |
| --- | --- | --- |
| UI kütüphanesi | React | 19 |
| Build & dev server | Vite | 8 |
| Stil | Tailwind CSS (v4 plugin) + özel `index.css` | 4 |
| Routing | `react-router-dom` | 7 |
| HTTP client | `axios` (merkezi instance + interceptor) | 1.x |
| State | `zustand` + `persist` middleware | 5 |
| SEO / `<head>` yönetimi | `react-helmet-async` | 3 |
| Test | Vitest + Testing Library + jsdom | — |
| Lint | ESLint 9 + `react-hooks` + `react-refresh` | — |

---

## Özellikler

- **Kimlik doğrulama:** JWT tabanlı giriş/kayıt. Token `localStorage`'a `auth` anahtarı altında (Zustand `persist`) yazılır, her istekte `Authorization: Bearer ...` header'ı olarak otomatik eklenir.
- **Rota koruması:** `PrivateRoute` (girişsiz → `/login`) ve `GuestRoute` (girişliyken `/login`, `/register` → `/`).
- **Blog CRUD:** Kapak görseli yüklemeli yeni blog oluşturma, düzenleme ve silme.
- **Zengin metin editörü:** `RichTextEditor` bileşeni ile format'lı yazı.
- **Kategoriler & etiketler:** Kategoriye veya etikete göre filtreleme (`?category=...&tag=...`).
- **Etiket toggle davranışı:** Ana sayfada veya "Güncel Etiketler" alanında aktif etikete tekrar tıklanınca `tag` query'si kaldırılır ve filtre temizlenir.
- **Sonsuz kaydırma:** `useInfiniteBlogs` hook'u ile sayfalanmış blog yükleme.
- **Favoriler / beğeni:** Kullanıcıların favori listesi (`/library`).
- **Takip sistemi:** Yazar takibi + `/following` akışı + takipçi/takip edilen listeleri.
- **Yorumlar:** Blog detay sayfasında yorum ekleme/listeleme.
- **Bildirimler:** Navbar içinde okunmamış bildirim sayacı ve işaretleme.
- **SEO:** `react-helmet-async` ile sayfa başına dinamik `<title>`/meta.
- **Tema:** Açık/koyu tema. `index.html` içine gömülü inline script, sayfa ilk yüklenirken **flash'ı** önler.
- **Toast bildirimleri:** Global `ToastContainer` tüm route geçişlerinde ayakta kalır; Axios hata interceptor'ı otomatik toast atar.
- **Merkezi hata yönetimi:** `axiosInstance` içinde FastAPI tarzı `{ detail: [...] }` dahil 4 farklı hata formatını okuyan `extractMessage` yardımcısı; `401` alındığında otomatik `logout()` + `/login` yönlendirmesi.

---

## Başlangıç

### Gereksinimler

- **Node.js 20+** (Vite 8 için önerilir)
- **npm 10+**
- Çalışan bir backend (varsayılan olarak `http://localhost:8000`)

### Kurulum

```bash
git clone <repo-url>
cd blog-frontend
npm install
```

### Geliştirme sunucusunu başlat

```bash
npm run dev
```

Vite `http://localhost:5173` adresinde açılır (terminal çıktısına bakın).

### Üretim build'i

```bash
npm run build      # dist/ klasörüne üretir
npm run preview    # build'i yerelde servis eder
```

---

## Ortam Değişkenleri

Proje köküne `.env` dosyası oluşturun:

```env
VITE_API_URL=http://localhost:8000
```

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `VITE_API_URL` | Hayır | Backend base URL'i. Tanımsızsa `http://localhost:8000` kullanılır (bkz. `src/api/axiosInstance.js`). |

> Vite yalnızca `VITE_` önekli değişkenleri istemci bundle'ına enjekte eder.

---

## NPM Script'leri

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Vite dev server'ı HMR ile başlatır. |
| `npm run build` | Üretim için optimize edilmiş derleme üretir (`dist/`). |
| `npm run preview` | `dist/` çıktısını yerelde önizler. |
| `npm run lint` | ESLint ile tüm projeyi kontrol eder. |
| `npm run test` | Vitest ile testleri bir kez çalıştırır. |

---

## Proje Yapısı

```
blog-frontend/
├── docs/
│   └── backend-contract.md         # Backend API sözleşme spesifikasyonu
├── public/
├── src/
│   ├── api/
│   │   └── axiosInstance.js        # Merkezi axios + interceptor + hata mesaj çözümleyici
│   ├── components/
│   │   ├── Avatar.jsx
│   │   ├── AsyncState.jsx          # loading / error / empty üç durum sarmalayıcı
│   │   ├── BlogCard.jsx
│   │   ├── BlogCardStats.jsx
│   │   ├── BlogContent.jsx
│   │   ├── CommentForm.jsx
│   │   ├── CommentItem.jsx
│   │   ├── CoverImageField.jsx
│   │   ├── GuestRoute.jsx          # Girişli kullanıcıyı /'ye atar
│   │   ├── LoadingSpinner.jsx
│   │   ├── Navbar.jsx              # Arama, bildirim, tema, avatar menüsü
│   │   ├── PrivateRoute.jsx        # Girişsiz kullanıcıyı /login'e atar
│   │   ├── RichTextEditor.jsx
│   │   ├── SEO.jsx                 # react-helmet-async sarmalayıcı
│   │   ├── Sidebar.jsx
│   │   ├── ToastContainer.jsx
│   │   └── icons/                  # HeartIcon, CommentIcon ...
│   ├── context/
│   │   ├── AuthContext.jsx         # Zustand store'a legacy useAuth() arayüzü
│   │   ├── SidebarContext.jsx
│   │   └── ThemeContext.jsx        # light/dark + data-theme senkronu
│   ├── hooks/
│   │   ├── useCategories.js        # GET /categories (ortak)
│   │   └── useInfiniteBlogs.js     # Sonsuz kaydırma + kategori/etiket/arama
│   ├── pages/
│   │   ├── Home.jsx                # Blog akışı + trend etiketler
│   │   ├── BlogDetail.jsx
│   │   ├── NewBlog.jsx
│   │   ├── EditBlog.jsx
│   │   ├── Profile.jsx
│   │   ├── ProfileConnections.jsx  # Takipçiler / takip edilenler
│   │   ├── Library.jsx             # Kullanıcının favorileri
│   │   ├── Following.jsx           # Takip edilen yazarların akışı
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Home.test.jsx
│   ├── services/
│   │   └── blogMapper.js           # API response'larını normalize eder
│   ├── store/
│   │   ├── authStore.js            # Zustand + persist (localStorage 'auth')
│   │   └── toastStore.js
│   ├── test/
│   │   └── setupTests.js           # @testing-library/jest-dom matcher'ları
│   ├── utils/
│   │   └── blogText.js             # Etiket çıkarma, özet vb.
│   ├── App.jsx                     # Route tanımları
│   ├── main.jsx                    # Root render + BrowserRouter + Helmet + ThemeProvider
│   └── index.css                   # Tailwind + özel tema değişkenleri (açık/koyu)
├── index.html                      # Tema flash önleyici inline script
├── vite.config.js                  # Vite + Tailwind plugin + Vitest config
├── eslint.config.js
└── package.json
```

---

## Routing

`src/App.jsx` içinde üç grupta tanımlıdır:

| Yol | Erişim | Sayfa |
| --- | --- | --- |
| `/` | Public | `Home` |
| `/blogs/:id` | Public | `BlogDetail` |
| `/profile/:id` | Public | `Profile` |
| `/profile/:id/following` | Public | `ProfileConnections` |
| `/profile/:id/followers` | Public | `ProfileConnections` |
| `/login` | Guest-only | `Login` |
| `/register` | Guest-only | `Register` |
| `/library` | Private | `Library` |
| `/following` | Private | `Following` |
| `/new-blog` | Private | `NewBlog` |
| `/edit-blog/:id` | Private | `EditBlog` |
| `*` | — | `/`'e yönlendirir |

`Home` route'u query parametreleriyle filtrelemeyi destekler:

- `/?category=<name>`
- `/?tag=<name>`
- `/?q=<search>`

Etiket filtreleme akışı:

- Kart etiket rozetleri (`BlogCard`) ve yan panel "Güncel Etiketler" aynı `tag` query'sine yazar.
- Aynı etiket tekrar tıklanırsa `tag` query'si kaldırılır (toggle).
- `useInfiniteBlogs` hem backend'e `tag` parametresi gönderir hem de dönen listede güvenli istemci tarafı etiket kontrolü uygular.

---

## Mimari Kararlar

- **Auth için Context değil Zustand:** Provider sarmalamaya gerek kalmaz; yalnızca ilgili slice'ı okuyan bileşenler re-render olur. `persist` middleware'i sayesinde oturum sayfa yenilemede kaybolmaz.
- **Token'ı `axiosInstance` dışında okuma yok:** Her istekte header'ı tek noktadan ekleriz. `localStorage.getItem('token')` **kullanılmaz** — persist middleware tüm state'i `auth` anahtarında JSON olarak saklar.
- **Axios response interceptor merkezi hata UX'i sağlar:** Sayfalarda ayrı toast/try-catch boilerplate'i yazmadan, 401/403/404/5xx için tutarlı kullanıcı geri bildirimi elde ederiz. 401'de otomatik logout + `/login` redirect.
- **Backend response'ları `services/blogMapper.js` ile normalize edilir:** Backend geçici olarak `_id`, `title`, `image_url` gibi alias'lar dönebildiği için frontend içte tek bir şema ile çalışır. Hedef sözleşme `docs/backend-contract.md` içinde.
- **Tema flash'ı yok:** `index.html` içindeki inline script, React mount olmadan önce `data-theme` attribute'unu ayarlar, böylece koyu modda başlatıldığında beyaz yanıp sönme yaşanmaz.

---

## Testler

Vitest + `@testing-library/react` + `jsdom` kurulu.

```bash
npm run test
```

Test ortamı ayarları:

- `vite.config.js` → `test.environment: 'jsdom'`
- `src/test/setupTests.js` → `@testing-library/jest-dom` matcher'larını yükler.

Örnek test: `src/pages/Home.test.jsx`.

---

## Backend Sözleşmesi

Beklenen API'nin detaylı spesifikasyonu [`docs/backend-contract.md`](docs/backend-contract.md) içinde:

- Endpoint şemaları (`/auth`, `/blogs`, `/categories`, `/users`, `/notifications`, `/tags/top`, `/users/{id}/stats`, …)
- Standart hata zarfı
- Geriye uyumlu migration stratejisi
- Frontend kaynak referansları

Frontend bu sözleşmeye **geçiş aşamasındadır**; backend yeni alanları ekledikçe `services/blogMapper.js` içindeki alias okumaları kademeli olarak kaldırılacaktır.

---

## Lisans

Belirtilmemiş. Proje sahibi ile iletişime geçin.
