import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Zap, Shield, Globe, Star, ArrowDown, Smartphone, FileText, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdBanner from '@/components/AdBanner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { YouTubeIcon } from '@/components/PlatformIcons';
import { featuredBlogPosts } from '@/content/blogPosts';

const stats = [
  { value: 'HD', label: 'Quality Options' },
  { value: 'Web', label: 'Mobile Friendly' },
  { value: 'Safe', label: 'Public Links Only' },
  { value: 'Help', label: 'Support Available' },
];

const guideLinks = [
  {
    page: 'HowDownloadDashWorks',
    title: 'How DownloadDash Works',
    body: 'Understand the full flow from public link input to returned media options.',
  },
  {
    page: 'SupportedPlatforms',
    title: 'Supported Platforms',
    body: 'See which media sources and device types the service is built around.',
  },
  {
    page: 'Troubleshooting',
    title: 'Troubleshooting',
    body: 'Learn the most common reasons a media request can fail and what to expect next.',
  },
  {
    page: 'ResponsibleUse',
    title: 'Responsible Use',
    body: 'Read the creator-rights and lawful-use guidance behind the service.',
  },
];

const realSiteScreenshots = [
  {
    src: '/assets/real-site-screenshots/desktop-preview.png',
    title: 'Desktop trust surface',
    body: 'A real view of the current site experience, including guide-first positioning and cleaner navigation.',
  },
  {
    src: '/assets/real-site-screenshots/mobile-preview.png',
    title: 'Mobile app workflow',
    body: 'Mobile screens help visitors see DownloadDash as a real cross-device platform instead of a generic download box.',
  },
  {
    src: '/assets/real-site-screenshots/platform-preview.png',
    title: 'Support and platform context',
    body: 'Screenshots reinforce that the service includes help content, policy paths, and public-link explanations.',
  },
];

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleAppDownload = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    window.location.assign(createPageUrl('AppDownload'));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AdBanner position="top" size="small" />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm mb-8"
            >
              <Zap className="h-4 w-4" />
              <span>Fast media saving for public, permitted content</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Download
              </span>
              <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                Dash
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Save publicly available videos, shorts, and audio for personal use when you have the right to do so.
              <span className="text-purple-400"> Simple, mobile-friendly, and transparent.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to={createPageUrl('Blog')}>
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 text-lg"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Read Guides First
                  </Button>
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 rounded-xl text-lg"
                  onClick={handleAppDownload}
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Install App
                </Button>
              </motion.div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </motion.div>
      </section>

      <div className="px-4">
        <AdBanner position="middle" size="medium" />
      </div>


      {/* Features Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Why Choose DownloadDash?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Zap className="h-8 w-8" />, 
                title: 'Efficient Public-Link Processing',
                desc: 'Process supported public links with a clean, streamlined workflow',
                gradient: 'from-yellow-500 to-orange-500'
              },
              { 
                icon: <Shield className="h-8 w-8" />, 
                title: 'Privacy-Conscious Design',
                desc: 'Designed around public links, transparent processing, and clear contact paths',
                gradient: 'from-green-500 to-emerald-500'
              },
              { 
                icon: <Globe className="h-8 w-8" />, 
                title: 'Works Everywhere', 
                desc: 'Use on any device - mobile, tablet, or desktop',
                gradient: 'from-blue-500 to-cyan-500'
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              What You Can Do On DownloadDash
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              DownloadDash is more than a single download box. It explains supported public-link workflows, helps users understand install options across devices, and gives context around safe, lawful use before any media request is made.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Supported Public Link Workflows',
                body: 'Use DownloadDash to process supported public links for video, audio, or image retrieval when the original platform and your local laws allow it. Results depend on what the upstream service makes available at that moment.',
              },
              {
                title: 'Clear Device Install Guidance',
                body: 'The site explains the difference between installing the web app in a browser and downloading a real Android APK. iPhone and iPad users get Safari Add to Home Screen guidance instead of a misleading APK prompt.',
              },
              {
                title: 'Troubleshooting Help',
                body: 'If a link fails, the usual causes are private or removed source posts, backend cookie expiry, upstream blocking, or temporary rate limits. Our guides help users understand these cases instead of treating every issue like a broken button.',
              },
              {
                title: 'Policy And Rights Awareness',
                body: 'Every major screen reminds users to respect copyright, platform rules, and the rights of creators. DownloadDash is intentionally built around public, permitted media flows rather than bypassing access controls.',
              },
            ].map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-7">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Read The DownloadDash Guides
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              These pages give the site more than a tool surface. They explain supported workflows, creator-rights boundaries, device installation, and the most common support issues users run into.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {guideLinks.map((guide, idx) => (
              <motion.div
                key={guide.page}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{guide.title}</h3>
                <p className="text-gray-400 leading-7 mb-5">{guide.body}</p>
                <Link
                  to={createPageUrl(guide.page)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
                >
                  Read Guide
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Step-By-Step Guide
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              If you are new to DownloadDash, this is the best order to follow. Read the guidance first, understand what kind of public link you are using, and only then move into the actual downloader.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              'Open the source post and confirm it is still public.',
              'Choose the right guide for the platform or device you are using.',
              'Make sure you have the right to save the content.',
              'Paste the link into the supported downloader page.',
              'Choose the returned format and save it for lawful personal use.',
            ].map((step, idx) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-5"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold mb-4">
                  {idx + 1}
                </div>
                <p className="text-gray-300 leading-7">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Featured Blog Articles
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              These articles answer the questions users usually ask before trusting a download utility: what is legal, why links fail, how different devices behave, and how public-link tools should be used responsibly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredBlogPosts.map((post, idx) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{post.title}</h3>
                <p className="text-gray-400 leading-7 mb-5">{post.excerpt}</p>
                <Link
                  to={createPageUrl(post.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
                >
                  Read Article
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Supported Platforms And Devices
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              DownloadDash is designed as a cross-device media utility. The exact formats available on a public link depend on the source platform, but the service itself is built to be understandable on phones, tablets, laptops, and desktop browsers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              {
                title: 'Source Platforms',
                body: 'The broader project supports public-link workflows for major social and media platforms, while each guide explains what to expect from a given source.',
              },
              {
                title: 'Android And iPhone',
                body: 'Mobile users can browse guides, paste supported links, and use the install flow that best matches their device and browser.',
              },
              {
                title: 'Tablet And Desktop',
                body: 'Larger screens make the guides, troubleshooting checklists, and downloader options easier to review before saving media.',
              },
              {
                title: 'Web App First',
                body: 'The safest install path is the browser-based web app experience, with Android APK download reserved only for real signed releases.',
              },
            ].map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-7">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Real DownloadDash Screens
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Real screenshots help visitors understand the platform before they interact with a public media workflow.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {realSiteScreenshots.map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black"
              >
                <img src={item.src} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-7">{item.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              These are the questions people ask most often before trying the tool. Answering them on the homepage makes the site more useful even before a visitor opens a downloader page.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Is DownloadDash only for YouTube?',
                body: 'No. DownloadDash is positioned as a broader public-link media utility. Individual platform support may change over time, so the guides and support pages explain what each flow is built to handle.',
              },
              {
                title: 'Is downloading videos always legal?',
                body: 'No. Legality depends on the content, the platform rules, your local laws, and whether you have the rights or permission to save the media. That is why the site keeps lawful-use and creator-rights guidance visible.',
              },
              {
                title: 'Why do some downloads fail?',
                body: 'The most common reasons are removed or private posts, expired cookies, upstream rate limits, bot checks, or source platforms changing the media formats they expose at a given moment.',
              },
              {
                title: 'Why is the guide content shown before the tool?',
                body: 'Because users need context first. A content-first layout explains safety, platform support, and troubleshooting before anyone starts a download request, which improves trust and reduces confusion.',
              },
            ].map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-7">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Use The Download Tool
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Once you have read the guides and confirmed you are working with a supported public link, you can continue to the downloader and choose the format returned by the backend.
            </p>
            <Link to={createPageUrl('YouTubeDownloader')}>
              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-5 bg-gradient-to-br from-gray-900 to-black border border-red-500/40 hover:border-red-500/80 rounded-3xl px-10 py-7 shadow-xl shadow-red-500/10 transition-all duration-300 cursor-pointer"
              >
                <YouTubeIcon size={64} />
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">YouTube</p>
                  <p className="text-gray-400 text-sm mt-1">Public media workflow</p>
                  <span className="inline-block mt-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">Open Public Workflow</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-8 md:p-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Responsible Use & Site Trust
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto">
                DownloadDash is built for lawful personal use, public links, and content you own or have permission to save.
                We do not encourage copyright infringement, harmful content, or misuse of third-party platforms.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: <CheckCircle className="h-6 w-6" />,
                  title: 'Copyright Respect',
                  desc: 'Only save content you own, have permission to use, or are legally allowed to download.',
                },
                {
                  icon: <FileText className="h-6 w-6" />,
                  title: 'Clear Policies',
                  desc: 'Privacy Policy, Terms of Service, and Contact pages are available from every page.',
                },
                {
                  icon: <Mail className="h-6 w-6" />,
                  title: 'Support & Contact',
                  desc: 'Users and rights holders can contact us for support, privacy, copyright, or compliance requests.',
                },
              ].map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-purple-500/10 bg-white/[0.03] p-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-purple-900/50 to-black rounded-3xl p-8 md:p-12 border border-purple-500/30 overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-600/30 rounded-full blur-[80px]" />
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                DownloadDash Mobile App
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Install DownloadDash from your browser as a web app, or use the Android app page when a real signed APK release is available.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
                    onClick={handleAppDownload}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download / Install App
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to={createPageUrl('AppDownload')}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 px-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 rounded-xl"
                    >
                      <Star className="mr-2 h-5 w-5" />
                      Android App Details
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="px-4 pb-8">
        <AdBanner position="bottom" size="large" />
      </div>
    </div>
  );
}
