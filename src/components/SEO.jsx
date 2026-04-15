import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url, type = 'article' }) {
  const siteTitle = 'Blog | En Son Yazılar';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDescription = 'Kişisel blog portalı — en son teknoloji ve yaşam haberlerini keşfedin.';
  const siteUrl = window.location.origin;

  return (
    <Helmet>
      {/* Standard tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url || window.location.href} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Canonical URL */}
      <link rel="canonical" href={url || window.location.href} />
    </Helmet>
  );
}
