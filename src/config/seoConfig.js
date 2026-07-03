export const SEO_BASE_URL = 'https://www.downloaddash.store';
export const SEO_SITE_NAME = 'DownloadDash';
export const SEO_DEFAULT_IMAGE = `${SEO_BASE_URL}/og-image.png`;

export const downloaderPages = [
  {
    pageName: 'TikTokDownloader',
    path: '/tiktok-downloader',
    platform: 'TikTok',
    title: 'TikTok Downloader Without Watermark HD - DownloadDash',
    description:
      'Use DownloadDash as a TikTok downloader without watermark for supported public videos, photo posts, stories, and audio in HD. Fast, mobile-friendly, and browser based.',
    keywords:
      'tiktok downloader without watermark hd, TikTok downloader, TikTok saver, download TikTok video without watermark, TikTok video downloader',
  },
  {
    pageName: 'InstagramDownloader',
    path: '/instagram-downloader',
    platform: 'Instagram',
    title: 'Instagram Downloader Without Watermark HD - DownloadDash',
    description:
      'Download supported public Instagram reels, videos, posts, images, and stories in HD with DownloadDash. A clean Instagram downloader and saver for mobile or desktop.',
    keywords:
      'instagram downloader without watermark hd, Instagram downloader, Instagram saver, Instagram reels downloader, download Instagram video without watermark',
  },
  {
    pageName: 'FacebookDownloader',
    path: '/facebook-downloader',
    platform: 'Facebook',
    title: 'Facebook Video Downloader Without Watermark HD - DownloadDash',
    description:
      'Save supported public Facebook videos, reels, stories, and post media in HD using DownloadDash. Fast Facebook downloader for public links on any device.',
    keywords:
      'facebook downloader without watermark hd, Facebook video downloader, Facebook saver, download Facebook video without watermark, Facebook reels downloader',
  },
  {
    pageName: 'YouTubeDownloader',
    path: '/youtube-downloader',
    platform: 'YouTube',
    title: 'YouTube Downloader Without Watermark HD - DownloadDash',
    description:
      'Download supported public YouTube videos, Shorts, and audio in HD with DownloadDash. A fast YouTube downloader and video saver for browser-based workflows.',
    keywords:
      'youtube downloader without watermark hd, YouTube downloader, YouTube saver, download YouTube video without watermark, YouTube video downloader',
  },
  {
    pageName: 'TwitterDownloader',
    path: '/x-downloader',
    platform: 'X',
    title: 'X Downloader Without Watermark HD - DownloadDash',
    description:
      'Download supported public X videos, images, and post media in HD with DownloadDash. A clean X downloader and saver for Twitter/X public links.',
    keywords:
      'x downloader without watermark hd, X downloader, Twitter downloader, X saver, download X video without watermark, Twitter video downloader',
  },
  {
    pageName: 'RedditDownloader',
    path: '/reddit-downloader',
    platform: 'Reddit',
    title: 'Reddit Video Downloader Without Watermark HD - DownloadDash',
    description:
      'Save supported public Reddit videos, hosted images, posts, and galleries in HD with DownloadDash. A mobile-friendly Reddit downloader for public media links.',
    keywords:
      'reddit downloader without watermark hd, Reddit downloader, Reddit saver, Reddit video downloader, download Reddit video without watermark',
  },
  {
    pageName: 'PinterestDownloader',
    path: '/pinterest-downloader',
    platform: 'Pinterest',
    title: 'Pinterest Downloader Without Watermark HD - DownloadDash',
    description:
      'Download supported public Pinterest pins, images, videos, and visual references in HD with DownloadDash. A clean Pinterest downloader for public links.',
    keywords:
      'pinterest downloader without watermark, Pinterest downloader, Pinterest saver, download Pinterest image, download Pinterest video without watermark',
  },
];

export const seoPages = [
  {
    pageName: 'Home',
    path: '/',
    title:
      'DownloadDash - HD Video Downloader for TikTok, Instagram, Facebook, YouTube, X, Reddit & Pinterest',
    description:
      'DownloadDash helps you save supported public videos, images, and audio from TikTok, Instagram, Facebook, YouTube, X, Reddit, and Pinterest in a fast mobile-friendly workflow.',
    keywords:
      'DownloadDash, Download Dash, downloader, downloads, video downloader, HD video downloader, TikTok downloader, Instagram downloader, Facebook downloader, YouTube downloader, X downloader, Reddit downloader, Pinterest downloader',
    priority: '1.0',
    changefreq: 'weekly',
  },
  ...downloaderPages.map((page) => ({ ...page, priority: '0.95', changefreq: 'weekly' })),
  {
    pageName: 'Blog',
    path: '/blog',
    title: 'DownloadDash Blog - Video Downloader Guides and Safe Saving Tips',
    description:
      'Read DownloadDash guides about public-link downloading, safer media saving, mobile workflows, platform support, and troubleshooting.',
    keywords: 'DownloadDash blog, downloader guides, video downloader tips, safe media saving',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    pageName: 'RecommendedApps',
    path: '/guides',
    title: 'DownloadDash Guides - Downloader Help, Platform Tips, and Resources',
    description:
      'Explore DownloadDash guides for supported downloader workflows, public-link safety, platform behavior, and mobile app installation.',
    keywords: 'DownloadDash guides, downloader help, platform downloader resources',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    pageName: 'SupportedPlatforms',
    path: '/supported-platforms',
    title: 'Supported Platforms - DownloadDash Video and Image Downloader',
    description:
      'See the public-link platforms DownloadDash is built around, including TikTok, Instagram, Facebook, YouTube, X, Reddit, and Pinterest.',
    keywords: 'DownloadDash supported platforms, social media downloader platforms',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    pageName: 'HowDownloadDashWorks',
    path: '/how-it-works',
    title: 'How DownloadDash Works - Public Video Downloader Workflow',
    description:
      'Learn how DownloadDash processes supported public media links and returns available video, image, or audio options.',
    keywords: 'how DownloadDash works, public link downloader, video downloader workflow',
    priority: '0.75',
    changefreq: 'monthly',
  },
  {
    pageName: 'FAQ',
    path: '/faq',
    title: 'DownloadDash FAQ - Video Downloader Questions Answered',
    description:
      'Find answers about DownloadDash, supported downloader pages, public links, safety, mobile use, and why some video downloads fail.',
    keywords: 'DownloadDash FAQ, video downloader questions, downloader help',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    pageName: 'About',
    path: '/about',
    title: 'About DownloadDash - HD Video Downloader and Media Saver',
    description:
      'Learn about DownloadDash, a browser-based downloader for supported public videos, images, and audio from major social platforms.',
    keywords: 'About DownloadDash, Download Dash downloader, media saver',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    pageName: 'HelpCenter',
    path: '/help-center',
    title: 'DownloadDash Help Center - Downloader Support and Troubleshooting',
    description:
      'Get help with DownloadDash downloader pages, failed links, supported public media, mobile usage, and platform-specific behavior.',
    keywords: 'DownloadDash help center, downloader support, video download troubleshooting',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    pageName: 'Contact',
    path: '/contact',
    title: 'Contact DownloadDash - Downloader Support',
    description:
      'Contact DownloadDash for downloader support, privacy questions, rights-holder requests, feedback, and partnership inquiries.',
    keywords: 'contact DownloadDash, downloader support, Download Dash support',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    pageName: 'PrivacyPolicy',
    path: '/privacy-policy',
    title: 'Privacy Policy - DownloadDash',
    description:
      'Read the DownloadDash privacy policy for details about data, public-link downloader workflows, analytics, and user rights.',
    keywords: 'DownloadDash privacy policy, downloader privacy',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    pageName: 'TermsOfService',
    path: '/terms-of-service',
    title: 'Terms of Service - DownloadDash',
    description:
      'Read the DownloadDash terms of service for responsible public-link downloader use, platform rules, and user responsibilities.',
    keywords: 'DownloadDash terms, downloader terms of service',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    pageName: 'ResponsibleUse',
    path: '/responsible-use',
    title: 'Responsible Use - DownloadDash Downloader Guidelines',
    description:
      'Review DownloadDash responsible-use guidance for public media saving, creator rights, copyright, and lawful downloader workflows.',
    keywords: 'responsible downloader use, DownloadDash responsible use, creator rights',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    pageName: 'DMCA',
    path: '/dmca',
    title: 'DMCA Policy - DownloadDash',
    description:
      'Read the DownloadDash DMCA policy and rights-holder contact process for public media and downloader-related concerns.',
    keywords: 'DownloadDash DMCA, downloader copyright policy',
    priority: '0.5',
    changefreq: 'monthly',
  },
];

export const getSeoForPath = (path = '/') => {
  const normalized = path === '/' ? '/' : path.replace(/\/+$/, '');
  return (
    seoPages.find((page) => page.path === normalized) || {
      pageName: 'DownloadDash',
      path: normalized,
      title: 'DownloadDash - HD Video Downloader and Media Saver',
      description:
        'Use DownloadDash to save supported public videos, images, and audio from major social platforms with a clean browser-based workflow.',
      keywords: 'DownloadDash, downloader, video downloader, media saver',
      priority: '0.5',
      changefreq: 'monthly',
    }
  );
};

const absoluteUrl = (path = '/') => `${SEO_BASE_URL}${path === '/' ? '/' : path}`;

const faqEntities = [
  {
    question: 'What is DownloadDash?',
    answer:
      'DownloadDash is a browser-based downloader and media saver for supported public videos, images, and audio from major social platforms.',
  },
  {
    question: 'Which downloader pages does DownloadDash include?',
    answer:
      'DownloadDash includes dedicated downloader pages for TikTok, Instagram, Facebook, YouTube, X, Reddit, and Pinterest.',
  },
  {
    question: 'Can DownloadDash download private videos?',
    answer:
      'No. DownloadDash is intended for supported public links and responsible use. Private, removed, restricted, or permission-bound content may not resolve.',
  },
  {
    question: 'Does DownloadDash work on mobile?',
    answer:
      'Yes. DownloadDash is built as a mobile-friendly web app that works in modern phone, tablet, and desktop browsers.',
  },
];

export const generateStructuredData = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_SITE_NAME,
    alternateName: ['Download Dash', 'downloaddash.store'],
    url: `${SEO_BASE_URL}/`,
    logo: `${SEO_BASE_URL}/icon-512.png`,
    image: SEO_DEFAULT_IMAGE,
    description:
      'DownloadDash provides HD downloader pages for supported public videos, images, and audio from major social platforms.',
  }),
  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_SITE_NAME,
    alternateName: ['Download Dash', 'DownloadDash Store'],
    url: `${SEO_BASE_URL}/`,
    description:
      'DownloadDash is a mobile-friendly HD video downloader and media saver for supported public links.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SEO_BASE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }),
  faq: () => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntities.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }),
  softwareApplication: () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SEO_SITE_NAME,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web, Android, iOS, Windows, macOS',
    url: `${SEO_BASE_URL}/`,
    image: SEO_DEFAULT_IMAGE,
    description:
      'DownloadDash helps users save supported public videos, images, and audio from TikTok, Instagram, Facebook, YouTube, X, Reddit, and Pinterest.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }),
  downloadPage: (name, platform) => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    url: absoluteUrl(downloaderPages.find((page) => page.platform === platform)?.path || '/'),
    image: SEO_DEFAULT_IMAGE,
    description: `${name} by DownloadDash helps users save supported public ${platform} media links in a browser-based workflow.`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }),
  breadcrumbs: (items = []) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url?.startsWith('http') ? item.url : absoluteUrl(item.url || '/'),
    })),
  }),
};

export const getStructuredDataForPage = (seo) => {
  const data = [
    generateStructuredData.organization(),
    generateStructuredData.website(),
    generateStructuredData.softwareApplication(),
    generateStructuredData.breadcrumbs([
      { name: 'Home', url: '/' },
      ...(seo.path === '/' ? [] : [{ name: seo.platform ? `${seo.platform} Downloader` : seo.pageName, url: seo.path }]),
    ]),
  ];

  if (seo.path === '/' || seo.pageName === 'FAQ') {
    data.push(generateStructuredData.faq());
  }

  if (seo.platform) {
    data.push(generateStructuredData.downloadPage(`${seo.platform} Downloader`, seo.platform));
    data.push(generateStructuredData.faq());
  }

  return data;
};
