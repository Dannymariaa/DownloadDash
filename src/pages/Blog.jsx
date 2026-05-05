import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, Clock3, ArrowUpRight, Newspaper } from 'lucide-react';
import { blogPosts } from '@/content/blogPosts';

const featured = blogPosts.slice(0, 2);
const latest = blogPosts.slice(2);

export default function Blog() {
  return (
    <div className="min-h-screen bg-[#0b0710] text-white">
      <section className="border-b border-sky-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.16),_transparent_28%),linear-gradient(180deg,#0e0a18_0%,#0b0710_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 mb-6">
              <Newspaper className="h-4 w-4" />
              DownloadDash Blog
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">An editorial section, not another version of the homepage.</h1>
            <p className="text-lg text-slate-300 leading-8 max-w-3xl">
              This page is built like a content desk. It groups helpful articles, gives the blog its own visual identity, and makes it obvious that the posts are separate reading experiences rather than sections embedded inside the home page.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {featured.map((post, idx) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-[2rem] border border-sky-300/15 bg-gradient-to-br from-[#111225] to-[#0c0d18] p-8"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-sky-200/60 mb-3">Featured article</p>
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{post.title}</h2>
              <p className="text-slate-300 leading-8 mb-6">{post.excerpt}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{post.date}</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{post.readTime}</span>
              </div>
              <Link
                to={createPageUrl(post.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 text-slate-950 px-5 py-3 font-semibold hover:opacity-90"
              >
                Read Article In New Tab
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.article>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-sky-200" />
          <h2 className="text-2xl font-bold text-white">Latest articles</h2>
        </div>

        <div className="grid gap-5">
          {latest.map((post, idx) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-7 grid md:grid-cols-[1fr_auto] gap-5 items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{post.date}</span>
                  <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{post.readTime}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{post.title}</h3>
                <p className="text-slate-300 leading-7">{post.excerpt}</p>
              </div>
              <Link
                to={createPageUrl(post.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-5 py-3 text-sky-100 font-semibold hover:bg-sky-300/15"
              >
                Open Article
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
