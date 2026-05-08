import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

const sections = {
  About: {
    eyebrow: 'DownloadDash Trust Center',
    title: 'About DownloadDash',
    subtitle: 'An independent public-link media saver focused on clean design, privacy-conscious use, and transparency.',
    blocks: [
      ['Our Mission', 'DownloadDash helps people save publicly available videos and images in a simpler, more responsible way. The product is designed to avoid the confusing and unsafe patterns that often appear on downloader websites.'],
      ['Our Commitments', ['Public links only.', 'No social media password collection.', 'Clear legal and privacy pages.', 'Creator-respect guidance.', 'Mobile-first, clean design.']],
      ['Contact', 'Support: support@downloaddash.store\nLegal: legal@downloaddash.store\nGeneral: info@downloaddash.store'],
    ],
  },
  SafetyCenter: {
    eyebrow: 'Safety Center',
    title: 'How DownloadDash Handles Safety',
    subtitle: 'Clear boundaries for a safer public-link download experience.',
    blocks: [
      ['Safety Commitments', ['No fake download buttons.', 'No hidden malware downloads.', 'No request for social media passwords.', 'No intentional private-content bypassing.', 'Clear responsible-use policy.']],
      ['User Safety Tips', 'Only use the official DownloadDash domain, avoid entering passwords into downloader tools, and respect creator rights before saving media.'],
    ],
  },
  TransparencyStatement: {
    eyebrow: 'Transparency Statement',
    title: 'How DownloadDash Works In Plain Language',
    subtitle: 'What the service can and cannot control.',
    blocks: [
      ['Public Links', 'DownloadDash is designed around public links and content users are allowed to save. It is not intended to bypass logins, private profiles, paid access, or platform restrictions.'],
      ['Platform Changes', 'Source platforms can change formats, rate limits, and availability at any time. A link may fail because the source is private, removed, restricted, or temporarily blocked upstream.'],
      ['User Responsibility', 'Users are responsible for following copyright law, platform rules, and the rights of creators. DownloadDash provides guidance, but it cannot grant rights to content owned by someone else.'],
    ],
  },
  DMCAPolicy: {
    eyebrow: 'Rights Holder Information',
    title: 'DMCA Policy',
    subtitle: 'A clear route for copyright concerns and takedown requests.',
    blocks: [
      ['Reporting Copyright Concerns', 'Rights holders can contact legal@downloaddash.store with enough detail to identify the content, the source URL, the affected rights, and the requester authority.'],
      ['Good-Faith Review', 'DownloadDash reviews complete notices and may remove references, block problematic examples, or take other appropriate action when a valid complaint is received.'],
      ['Important Boundary', 'DownloadDash does not host every third-party source item that users may reference. Some requests may need to be directed to the original platform hosting the content.'],
    ],
  },
  CookiePolicy: {
    eyebrow: 'Privacy And Browser Storage',
    title: 'Cookie Policy',
    subtitle: 'How cookies and similar storage may support the service.',
    blocks: [
      ['Essential Storage', 'DownloadDash may use browser storage for preferences, login state, security, app installation behavior, and service reliability.'],
      ['Analytics And Ads', 'If analytics or advertising tools are enabled, they may use cookies or similar identifiers according to their own policies and the consent rules that apply in each region.'],
      ['User Control', 'Users can clear cookies or adjust browser settings at any time. Some features may work less smoothly when storage is blocked.'],
    ],
  },
  AccessibilityStatement: {
    eyebrow: 'Accessibility',
    title: 'Accessibility Statement',
    subtitle: 'DownloadDash should be usable by as many people as possible.',
    blocks: [
      ['Commitment', 'DownloadDash aims for readable text, clear navigation, keyboard-friendly controls, and layouts that work across phones, tablets, and desktop screens.'],
      ['Ongoing Work', 'Accessibility is maintained as the product changes. New pages and features should preserve contrast, focus states, semantic structure, and predictable interaction patterns.'],
      ['Report A Barrier', 'If something is hard to use, email support@downloaddash.store with the page URL, device, browser, and a short description of the barrier.'],
    ],
  },
  FAQ: {
    eyebrow: 'Frequently Asked Questions',
    title: 'DownloadDash FAQ',
    subtitle: 'Short answers for users, reviewers, and rights holders.',
    blocks: [
      ['Does DownloadDash ask for social media passwords?', 'No. Users should never enter social media passwords into DownloadDash or any downloader tool.'],
      ['Why do some links fail?', 'Common causes include private posts, removed content, expired media URLs, upstream rate limits, bot checks, unsupported formats, or source platform changes.'],
      ['Is downloading always legal?', 'No. Legality depends on content ownership, permissions, platform rules, local law, and how the saved media is used.'],
      ['Who should rights holders contact?', 'Rights holders should contact legal@downloaddash.store with enough information to identify the issue clearly.'],
    ],
  },
};

function renderBody(body) {
  if (Array.isArray(body)) {
    return (
      <ul className="space-y-3">
        {body.map((item) => (
          <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return body.split('\n').map((line) => (
    <p key={line} className="leading-8 text-slate-300">
      {line}
    </p>
  ));
}

export function makeTrustKitPage(pageKey) {
  const content = sections[pageKey];

  return function TrustKitPage() {
    return (
      <div className="min-h-screen bg-[#090b0f] px-4 py-12 text-white">
        <main className="mx-auto max-w-5xl">
          <Link to={createPageUrl('TrustCenter')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Trust Center
          </Link>

          <section className="mb-8 rounded-2xl border border-emerald-300/20 bg-white/[0.04] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200">{content.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{content.subtitle}</p>
          </section>

          <div className="space-y-5">
            {content.blocks.map(([heading, body]) => (
              <section key={heading} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <h2 className="mb-4 text-2xl font-bold text-white">{heading}</h2>
                <div className="space-y-3">{renderBody(body)}</div>
              </section>
            ))}
          </div>
        </main>
      </div>
    );
  };
}

export const About = makeTrustKitPage('About');
export const SafetyCenter = makeTrustKitPage('SafetyCenter');
export const TransparencyStatement = makeTrustKitPage('TransparencyStatement');
export const DMCAPolicy = makeTrustKitPage('DMCAPolicy');
export const CookiePolicy = makeTrustKitPage('CookiePolicy');
export const AccessibilityStatement = makeTrustKitPage('AccessibilityStatement');
export const FAQ = makeTrustKitPage('FAQ');
