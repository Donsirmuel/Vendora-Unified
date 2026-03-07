import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const telegram = (import.meta.env.VITE_TELEGRAM_CONTACT as string) || '';
  const telegramHref = telegram ? `https://t.me/${telegram.replace(/^@/, '')}` : '#';
  return (
    <footer className="w-full border-t border-border bg-card px-6 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>© {new Date().getFullYear()} Vendora</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link className="underline" to="/pricing">Pricing</Link>
          <Link className="underline" to="/terms">Terms</Link>
          <Link className="underline" to="/privacy">Privacy</Link>
          <a className="underline" href={telegramHref} target="_blank" rel="noopener noreferrer">Contact us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
