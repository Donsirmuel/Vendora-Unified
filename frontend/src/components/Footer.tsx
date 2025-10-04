import React from 'react';

const Footer: React.FC = () => {
  const telegram = (import.meta.env.VITE_TELEGRAM_CONTACT as string) || '';
  const telegramHref = telegram ? `https://t.me/${telegram.replace(/^@/, '')}` : '#';
  return (
    <footer className="w-full border-t border-border bg-card px-6 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} Vendora</div>
        <div>
          <a className="underline" href={telegramHref} target="_blank" rel="noopener noreferrer">Contact us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
