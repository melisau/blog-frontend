# Fitbook — Bordo & Porselen

Seçilen marka yönü: **5. Bordo & Porselen**. 28 Eylül 2026 tarihinde uygulandı.

## Renk rolleri

| Rol | Açık tema | Koyu tema |
|---|---|---|
| Ana vurgu / bağlantılar | #7B303A | #F0B9B9 |
| Ana başlık | #2C2428 | #FBF3EF |
| Gövde metni | #54484D | #D9C9CD |
| Sayfa zemini | #FCF8F5 | #1D171A |
| Kart / form yüzeyi | #FFFFFF | #281F23 |
| Pudra vurgu zemini | #EED9D4 | #44272F |
| Düğme üzerindeki yazı | #FFFFFF | #32171D |

Ana marka bordosu #7B303A giriş/kayıt tanıtım panelinde her iki temada da korunur. Koyu temada bağlantı ve düğmeler okunabilirlik için açık pembe olur. Başarı/hata renkleri ve kullanıcıların seçtiği avatar renkleri marka rengine zorlanmaz.

## Tipografi

- Başlık, yazı başlığı ve logo: Lora, normal 400–700.
- Gövde, gezinme, form ve düğmeler: DM Sans, normal 400–700.
- Gövde temeli: 16px / 1.6; yazı kartı özeti 16px / 1.65.
- Latin ve Latin-ext WOFF2 alt kümeleri public/fonts altında yerel olarak sunulur; Türkçe karakterler dahil. Fontlar swap ile yüklenir. CSS ayrı olarak main.jsx içinden alınır; Google'a ziyaretçi isteği gerekmez.
- OFL lisansları font dosyalarının yanında saklanır. İtalik gövde yazılarında tarayıcının stil sentezine izin verilir; normal ağırlıklar gerçek değişken font aralığından gelir.

## Uygulama kapsamı

Ortak açık/koyu tema değişkenleri, navbar ve kategori şeridi, sidebar, kartlar, yazı detayları, formlar, profil yüzeyleri, giriş/kayıt tanıtım paneli, favicon ve tarayıcı theme-color güncellendi. Ana sayfa iki sütunlu editoryal akış kullanır; mobil tek sütundur. Yazar/tarih kartın üstüne taşındı. Beğeni, yorum, etiket filtreleri ve mevcut veri/kimlik doğrulama akışları korunur. Kart içindeki düğme veya bağlantıda Enter kullanımı kart gezinmesini tetiklemez.

## Doğrulama

- npm run build başarılı; sitemap 16 URL.
- npm test: mevcut 2 test geçti.
- git diff --check: boşluk hatası yok.
- Gerçek API: kategori ve yazı istekleri 200; içerik tarayıcıda görüntülendi.
- 320, 390, 768, 1024 ve varsayılan 1280px görünümde ana sayfada yatay sayfa taşması yok.
- Mobil açılır menü, kategori filtresi ve yazı detayına geçiş kontrol edildi.
- Giriş/kayıt görünümü açık/koyu tema; mobil/tablet kayıt yerleşimi kontrol edildi. Hesap oluşturulmadı ve kimlik bilgisi girilmedi. Giriş gerektiren profil düzenleme veya yazı yayımlama işlemleri bu görsel değişiklikte uçtan uca test edilmedi.
- Ana düğme kontrastı açık temada 9.03:1, koyu temada 9.68:1 (hesaplanan renk oranı).

## Yerel önizleme

Frontend: http://127.0.0.1:5174/
Backend: http://127.0.0.1:8000/

Eski backend .venv ortamı artık olmayan Python312 kurulumunu işaretliyor. Önizleme için mevcut Python 3.12.14 çalışma ortamı, .venv içindeki mevcut bağımlılıklar PYTHONPATH üzerinden kullanılarak çalıştırıldı. Sistem Python'u kurulmadı/değiştirilmedi; backend dosyaları değiştirilmedi. Kalıcı Python/sanal ortam onarımı bu tema değişikliği kapsamında yapılmadı.

GitHub'a push veya dağıtım yapılmadı.

