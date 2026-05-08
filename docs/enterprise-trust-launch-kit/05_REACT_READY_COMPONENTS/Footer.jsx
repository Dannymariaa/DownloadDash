import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-purple-500/20 bg-black px-5 py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-black text-purple-300">DownloadDash</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
            Fast, clean, and privacy-conscious public-link media saving for videos and images.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Independent project. Not affiliated with third-party social platforms.
          </p>
        </div>

        <div>
          <h3 className="font-bold">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/guides">Guides</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/safety">Safety Center</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold">Trust</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/transparency">Transparency</Link></li>
            <li><Link to="/responsible-use">Responsible Use</Link></li>
            <li><Link to="/accessibility">Accessibility</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/cookies">Cookie Policy</Link></li>
            <li><Link to="/dmca">DMCA</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-3 border-t border-purple-500/20 pt-6 text-xs text-gray-500 md:flex-row">
        <p>© {year} DownloadDash. All rights reserved.</p>
        <p>Public links only · No social passwords · Responsible use</p>
      </div>
    </footer>
  );
}
