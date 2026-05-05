import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react';
import { getBlogPostBySlug } from '@/content/blogPosts';

export default function BlogArticleTemplate({ slug }) {
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0b0710] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-black mb-4">Article Not Found</h1>
          <p className="text-slate-300 mb-6">The requested blog article could not be found.</p>
          <Link
            to={createPageUrl('Blog')}
            className="inline-flex rounded-xl bg-sky-300 text-slate-950 px-5 py-3 font-semibold hover:opacity-90"
          >
            Back To Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <article className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <Link
          to={createPageUrl('Blog')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 md:p-12 shadow-[0_30px_90px_rgba(15,23,42,0.08)] mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-700 mb-4">DownloadDash Blog</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5 text-slate-950">{post.title}</h1>
          <p className="text-lg md:text-xl text-slate-600 leading-8 mb-6">{post.excerpt}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{post.date}</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{post.readTime}</span>
          </div>
        </div>

        <div className="space-y-6">
          {post.sections.map((section, index) => (
            <section key={section.heading} className="rounded-[2rem] border border-slate-200 bg-white p-7 md:p-9 shadow-[0_20px_70px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-[0.22em] text-sky-700/80 mb-3">Section {index + 1}</p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mb-4">{section.heading}</h2>
              <div className="space-y-4 text-slate-700 leading-8 text-[1.02rem]">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 text-white p-8 md:p-9">
          <h2 className="text-2xl font-bold mb-3">Continue reading</h2>
          <p className="text-slate-300 leading-8 mb-6">
            This article lives on its own page by design. The goal is to make every post feel like a real reading destination, not like a collapsed section of the homepage.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={createPageUrl('Blog')}
              className="inline-flex rounded-xl bg-white text-slate-950 px-5 py-3 font-semibold hover:opacity-90"
            >
              Back To Blog
            </Link>
            <Link
              to={createPageUrl('ResponsibleUse')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/5"
            >
              Open Responsible Use
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
