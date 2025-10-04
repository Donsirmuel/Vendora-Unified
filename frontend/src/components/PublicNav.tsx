import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./public-nav.css";

export type PublicNavLink = {
  label: string;
  href: string;
  type?: "route" | "anchor" | "external";
  variant?: "default" | "accent";
  newTab?: boolean;
};

export type PublicNavProps = {
  links?: PublicNavLink[];
  variant?: "translucent" | "solid";
};

const defaultLinks: PublicNavLink[] = [
  { label: "Features", href: "#features", type: "anchor" },
  { label: "Terms", href: "/terms", type: "route" },
  { label: "Privacy", href: "/privacy", type: "route" },
  { label: "Sign Up", href: "/signup", type: "route", variant: "accent" },
  { label: "Login", href: "/login", type: "route" }
];

export default function PublicNav({ links = defaultLinks, variant = "translucent" }: PublicNavProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function handleLinkClick(link: PublicNavLink, event: React.MouseEvent<HTMLAnchorElement>) {
    if (link.type === "anchor") {
      const hashIndex = link.href.indexOf("#");
      if (hashIndex !== -1) {
        event.preventDefault();
        const targetId = link.href.substring(hashIndex + 1);
        const el = document.getElementById(targetId) || document.querySelector(link.href);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
    setOpen(false);
  }

  return (
    <header className={`public-nav ${variant === "solid" ? "public-nav--solid" : "public-nav--translucent"}`}>
      <div className="public-nav__inner">
        <Link to="/" className="public-nav__brand" onClick={() => setOpen(false)}>
          <span>Vendora</span>
          <span className="public-nav__badge">Beta</span>
        </Link>
        <button
          className="public-nav__toggle"
          type="button"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="public-nav__hamburger" aria-hidden />
        </button>
        <nav className={`public-nav__links ${open ? "is-open" : ""}`}>
          {links.map((link) => {
            const key = `${link.label}-${link.href}`;
            const className = `public-nav__link ${link.variant === "accent" ? "public-nav__link--accent" : ""}`;

            if (link.type === "route") {
              return (
                <Link key={key} to={link.href} className={className} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              );
            }

            const target = link.newTab ? "_blank" : undefined;
            const rel = link.newTab ? "noreferrer" : undefined;
            return (
              <a
                key={key}
                href={link.href}
                className={className}
                target={target}
                rel={rel}
                onClick={(event) => handleLinkClick(link, event)}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
        className={`public-nav__backdrop ${open ? "is-visible" : ""}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
    </header>
  );
}
