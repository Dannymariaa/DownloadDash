import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CalendarDays, Clock3 } from 'lucide-react';
import { getBlogPostBySlug } from '@/content/blogPosts';

export default function BlogArticleTemplate({ slug }) {
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-black mb-4">Article Not Found</h1>
          <p className="text-gray-400 mb-6">The requested blog article could not be found.</p>
          <Link
            to={createPageUrl('Blog')}
            className="inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            Back To Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <p className="text-purple-300 font-semibold mb-3">DownloadDash Blog</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">{post.title}</h1>
          <p className="text-gray-400 text-lg leading-8 mb-5">{post.excerpt}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {post.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {post.sections.map((section) => (
            <section key={section.heading} className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7">
              <h2 className="text-2xl font-bold text-white mb-4">{section.heading}</h2>
              <div className="space-y-4 text-gray-300 leading-8">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-purple-500/20 bg-white/[0.03] p-7">
          <h2 className="text-2xl font-bold text-white mb-3">Keep Reading</h2>
          <p className="text-gray-400 leading-7 mb-5">
            DownloadDash combines practical tools with explanatory content so users can make better decisions about public-link downloads, installation methods, platform differences, and lawful use.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={createPageUrl('Blog')}
              className="inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
            >
              Back To Blog
            </Link>
            <Link
              to={createPageUrl('ResponsibleUse')}
              className="inline-flex rounded-xl border border-purple-500/30 px-5 py-3 font-semibold text-purple-300 hover:bg-purple-500/10"
            >
              Read Responsible Use
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
