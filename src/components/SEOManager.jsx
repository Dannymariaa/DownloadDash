import { useLocation } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';
import { getSeoForPath, getStructuredDataForPage, SEO_BASE_URL } from '@/config/seoConfig';

export default function SEOManager() {
  const { pathname } = useLocation();
  const seo = getSeoForPath(pathname);
  const canonical = `${SEO_BASE_URL}${seo.path === '/' ? '/' : seo.path}`;

  useSEO({
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    canonical,
    ogTitle: seo.title,
    ogDescription: seo.description,
    structuredData: getStructuredDataForPage(seo),
  });

  return null;
}
