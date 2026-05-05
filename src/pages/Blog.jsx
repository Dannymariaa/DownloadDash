import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import { blogPosts } from '@/content/blogPosts';

export default function Blog() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">DownloadDash Blog</h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-8">
            Original guides, platform explainers, lawful-use articles, troubleshooting help, and device-installation tutorials for people using DownloadDash and similar public-link media tools.
          </p>
        </motion.div>

        <div className="grid gap-6">
          {blogPosts.map((post, idx) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7"
            >
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {post.date}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {post.readTime}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{post.title}</h2>
              <p className="text-gray-400 leading-7 mb-5">{post.excerpt}</p>
              <Link
                to={createPageUrl(post.slug)}
                className="inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white hover:opacity-90"
              >
                Read Article
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
