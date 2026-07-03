import { useEffect } from 'react';
import { SEO_DEFAULT_IMAGE, SEO_SITE_NAME } from '@/config/seoConfig';

const ensureMeta = (selector, createAttrs) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttrs).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const ensureLink = (rel) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  return element;
};

const setMeta = (name, content) => {
  if (!content) return;
  ensureMeta(`meta[name="${name}"]`, { name }).setAttribute('content', content);
};

const setProperty = (property, content) => {
  if (!content) return;
  ensureMeta(`meta[property="${property}"]`, { property }).setAttribute('content', content);
};

const removeManagedJsonLd = () => {
  document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
};

export default function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = SEO_DEFAULT_IMAGE,
  structuredData,
  breadcrumbs,
}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta('title', title);
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', 'index, follow, max-image-preview:large');
    setMeta('author', SEO_SITE_NAME);

    if (canonical) {
      ensureLink('canonical').setAttribute('href', canonical);
    }

    setProperty('og:type', 'website');
    setProperty('og:site_name', SEO_SITE_NAME);
    setProperty('og:url', canonical);
    setProperty('og:title', ogTitle || title);
    setProperty('og:description', ogDescription || description);
    setProperty('og:image', ogImage);
    setProperty('og:image:alt', ogTitle || title);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:url', canonical);
    setMeta('twitter:title', ogTitle || title);
    setMeta('twitter:description', ogDescription || description);
    setMeta('twitter:image', ogImage);
    setMeta('twitter:image:alt', ogTitle || title);

    const jsonLd = [structuredData, breadcrumbs].filter(Boolean).flat();
    if (jsonLd.length) {
      removeManagedJsonLd();
      jsonLd.forEach((item) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.seoJsonld = 'true';
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      });
    }
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, structuredData, breadcrumbs]);
}
