import SEO, { SITE_NAME } from '../components/SEO'

const siteOrigin = import.meta.env.VITE_SITE_URL?.replace(/\/+$/, '') || window.location.origin

const aboutStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Fitbook hakkında',
  description: 'Fitbook topluluğu, yayın yaklaşımı ve içerik ilkeleri.',
  url: `${siteOrigin}/hakkinda`,
  isPartOf: {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteOrigin,
  },
  mainEntity: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteOrigin,
    description: 'Herkesin yazı yayımlayıp toplulukla paylaşabildiği bir blog platformu.',
  },
}

export default function About() {
  return (
    <article className="page-container page-container--narrow about-page">
      <SEO
        title="Hakkında"
        description="Fitbook, herkesin yazı yayımlayabildiği ve farklı konular etrafında toplulukla buluşabildiği bir blog platformudur. Topluluğu ve yayın ilkelerimizi tanıyın."
        structuredData={aboutStructuredData}
      />

      <header className="about-page__header">
        <p className="about-page__eyebrow">FITBOOK TOPLULUĞU</p>
        <h1>Fikirlerin paylaşıldıkça çoğaldığı yer.</h1>
        <p className="about-page__lead">
          Fitbook, herkesin kendi deneyimini, merakını ve bilgisini yazıya
          dönüştürüp başkalarıyla paylaşabildiği bir topluluk blogudur.
        </p>
      </header>

      <section className="about-page__section" aria-labelledby="about-community">
        <h2 id="about-community">Herkes yazabilir</h2>
        <p>
          Üyeler yazı yayımlayabilir, ilgi duydukları konuları keşfedebilir,
          yazarları takip edebilir ve yazılar üzerine yorumlarla sohbet edebilir.
          Teknoloji, yaşam, sağlık ve başka pek çok başlıkta farklı bakış açılarına
          yer açıyoruz.
        </p>
      </section>

      <section className="about-page__section" aria-labelledby="about-content">
        <h2 id="about-content">İçerik ve kaynak ilkelerimiz</h2>
        <ul>
          <li>Yazarlar kendi yazılarının doğruluğundan ve gerekli kaynakları belirtmekten sorumludur.</li>
          <li>Bilimsel çalışma veya haber özeti yayımlarken mümkün olduğunda özgün kaynağa bağlantı verilir.</li>
          <li>Bir araştırmanın sonucu, tek başına herkes için geçerli öneri gibi sunulmamalıdır.</li>
          <li>Topluluk yazıları kişisel deneyim içerebilir; deneyim herkes için aynı sonucu garanti etmez.</li>
        </ul>
      </section>

      <section className="about-page__section about-page__section--notice" aria-labelledby="about-health">
        <h2 id="about-health">Sağlık içerikleri hakkında</h2>
        <p>
          Sağlık ve beslenme içerikleri genel bilgilendirme amacı taşır; tanı,
          tedavi veya kişiye özel beslenme planı yerine geçmez. Belirti veya sağlık
          durumunuz için hekime ve yetkin bir diyetisyene danışın. İlaç ya da takviye
          kullanımını sağlık profesyonelinize danışmadan değiştirmeyin.
        </p>
      </section>
    </article>
  )
}
