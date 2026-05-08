import React from "react";
import { Routes, Route } from "react-router-dom";
import Footer from "../components/Footer";
import HomepageTrustUpgrade from "../components/HomepageTrustUpgrade";
import PageShell from "../components/PageShell";
import { AboutPage, SafetyPage, ResponsibleUsePage } from "../components/TrustPages";

function Home() {
  return (
    <>
      {/* Keep your existing hero/download box above this section */}
      <HomepageTrustUpgrade />
    </>
  );
}

function SimplePage({ title, subtitle, children }) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      {children}
    </PageShell>
  );
}

export default function AppRoutesExample() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/responsible-use" element={<ResponsibleUsePage />} />
        <Route path="/privacy" element={<SimplePage title="Privacy Policy"><p>Paste Privacy Policy content here.</p></SimplePage>} />
        <Route path="/terms" element={<SimplePage title="Terms of Service"><p>Paste Terms content here.</p></SimplePage>} />
        <Route path="/dmca" element={<SimplePage title="DMCA Policy"><p>Paste DMCA content here.</p></SimplePage>} />
        <Route path="/contact" element={<SimplePage title="Contact"><p>support@downloaddash.store</p><p>legal@downloaddash.store</p><p>info@downloaddash.store</p></SimplePage>} />
        <Route path="/faq" element={<SimplePage title="FAQ"><p>Paste FAQ content here.</p></SimplePage>} />
        <Route path="/guides" element={<SimplePage title="Guides"><p>Paste guide links here.</p></SimplePage>} />
        <Route path="/transparency" element={<SimplePage title="Transparency"><p>Paste Transparency content here.</p></SimplePage>} />
        <Route path="/cookies" element={<SimplePage title="Cookie Policy"><p>Paste Cookie Policy content here.</p></SimplePage>} />
        <Route path="/accessibility" element={<SimplePage title="Accessibility"><p>Paste Accessibility content here.</p></SimplePage>} />
      </Routes>
      <Footer />
    </>
  );
}
