/**
 * SEO Helmet Component
 * Manages global and page-specific SEO metadata
 */

import { useEffect } from 'react';
import { generateStructuredData, SEO_BASE_URL } from '@/config/seoConfig';

export const SEOHelmet = ({
  title = 'DownloadDash - HD Video Downloader for Social Media',
  description = 'Download videos without watermark from TikTok, Instagram, Facebook, YouTube, X, Reddit, and Pinterest.',
  keywords = '',
  ogImage = `${SEO_BASE_URL}/icon-512.png`,
  includeGlobalSchema = true,
  additionalSchemas = [],
}) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;

    // Update keywords if provided
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords;
    }

    // Add global structured data
    if (includeGlobalSchema) {
      let globalSchema = document.querySelector('script[data-type="global-schema"]');
      if (!globalSchema) {
        globalSchema = document.createElement('script');
        globalSchema.type = 'application/ld+json';
        globalSchema.setAttribute('data-type', 'global-schema');
        document.head.appendChild(globalSchema);
      }

      const schemas = [
        generateStructuredData.organization(),
        generateStructuredData.website(),
        generateStructuredData.softwareApplication(),
      ];

      globalSchema.innerHTML = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': schemas,
      });
    }
  }, [title, description, keywords, ogImage, includeGlobalSchema, additionalSchemas]);

  return null;
};

export default SEOHelmet;
