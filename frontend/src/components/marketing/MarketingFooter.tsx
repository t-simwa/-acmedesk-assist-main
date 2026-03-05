import { Link } from "react-router-dom";
import { FaTwitter, FaLinkedinIn, FaGithub } from "react-icons/fa";

/* ═══════════════════════════════════════════════════════════════════════════════
   MARKETING FOOTER
   Clean, organized footer with subtle hierarchy
   Inspired by Linear/Stripe footer design
   ═══════════════════════════════════════════════════════════════════════════════ */

const FOOTER_LINKS = {
  product: {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "Demo", href: "/demo" },
    ],
  },
  industries: {
    title: "Industries",
    links: [
      { label: "E-Commerce", href: "/use-cases/ecommerce" },
      { label: "Legal", href: "/use-cases/legal" },
      { label: "Real Estate", href: "/use-cases/real-estate" },
      { label: "Healthcare", href: "/use-cases/healthcare" },
      { label: "SaaS", href: "/use-cases/saas" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Status", href: "/status" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Cookie Policy", href: "/cookie-policy" },
    ],
  },
};

const SOCIAL_LINKS = [
  { icon: FaTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FaLinkedinIn, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: FaGithub, href: "https://github.com", label: "GitHub" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="font-heading font-bold text-sm text-primary-foreground">N</span>
                </div>
                <span className="font-heading font-semibold text-foreground tracking-tight">
                  NexaChat
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-[280px]">
                AI-powered customer service that actually understands your business.
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-accent/50 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(FOOTER_LINKS).map(([key, section]) => (
              <div key={key}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NexaChat. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-500">
                All systems operational
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
