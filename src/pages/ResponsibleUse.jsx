import React from 'react';
import { Shield, FileText, Copyright, UserCheck } from 'lucide-react';

const topics = [
  {
    title: 'Download only what you are allowed to use',
    body:
      'DownloadDash is intended for content you own, created, licensed, or otherwise have permission to save. The fact that a post is public does not automatically mean every reuse or download is lawful in every country.',
    icon: <UserCheck className="h-7 w-7" />,
  },
  {
    title: 'Respect creator rights and platform rules',
    body:
      'Creators, publishers, and platforms may set terms that limit how content can be copied, stored, or redistributed. Users should review those rules and avoid using DownloadDash for infringement, impersonation, piracy, or unauthorized redistribution.',
    icon: <Copyright className="h-7 w-7" />,
  },
  {
    title: 'Use the service responsibly',
    body:
      'DownloadDash is not meant to be used for harassment, mass scraping of private material, or bypassing access controls. Responsible-use messaging is part of the site because clear expectations improve user trust and reduce abuse.',
    icon: <Shield className="h-7 w-7" />,
  },
  {
    title: 'When in doubt, ask or avoid',
    body:
      'If you are unsure whether you are allowed to save or reuse a file, the safest approach is to ask the owner, review the license, or avoid downloading it. A responsible utility should help users make better decisions, not just push them toward a button click.',
    icon: <FileText className="h-7 w-7" />,
  },
];

export default function ResponsibleUse() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Responsible Use And Creator Rights</h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-8">
            DownloadDash is designed to support lawful personal-use workflows, not to encourage copyright abuse or platform violations. This page explains the responsibility users carry when saving media.
          </p>
        </div>

        <div className="grid gap-6">
          {topics.map((topic) => (
            <article key={topic.title} className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-gray-900 to-black p-7">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-5">
                {topic.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{topic.title}</h2>
              <p className="text-gray-400 leading-7">{topic.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
