/**
 * Sitemap generator utility
 * Generates XML sitemap for search engines
 */

export const generateSitemap = (baseUrl = 'https://www.downloaddash.store') => {
  const routes = [
    { path: '/', priority: 1.0, changefreq: 'weekly' },
    { path: '/youtube-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/instagram-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/tiktok-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/facebook-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/pinterest-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/reddit-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/x-downloader', priority: 0.9, changefreq: 'weekly' },
    { path: '/about', priority: 0.8, changefreq: 'monthly' },
    { path: '/faq', priority: 0.8, changefreq: 'monthly' },
    { path: '/blog', priority: 0.8, changefreq: 'weekly' },
    { path: '/help-center', priority: 0.7, changefreq: 'monthly' },
    { path: '/contact', priority: 0.7, changefreq: 'monthly' },
    { path: '/privacy-policy', priority: 0.6, changefreq: 'yearly' },
    { path: '/terms-of-service', priority: 0.6, changefreq: 'yearly' },
    { path: '/responsible-use', priority: 0.7, changefreq: 'yearly' },
    { path: '/troubleshooting', priority: 0.7, changefreq: 'monthly' },
    { path: '/supported-platforms', priority: 0.8, changefreq: 'monthly' },
    { path: '/how-it-works', priority: 0.7, changefreq: 'monthly' },
    { path: '/recommended-apps', priority: 0.7, changefreq: 'monthly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  routes.forEach((route) => {
    const lastmod = new Date().toISOString().split('T')[0];
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

export default generateSitemap;
