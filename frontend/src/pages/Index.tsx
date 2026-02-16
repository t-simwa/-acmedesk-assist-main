import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* F4.1 - Skip link for main content */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-[12px] font-bold text-background tracking-tight">A</span>
            </div>
            <span className="text-[15px] font-semibold text-foreground tracking-tight">AcmeDesk</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              to="/admin"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
            >
              Admin
            </Link>
            <a
              href="#features"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
            >
              Features
            </a>
            <ThemeToggle variant="pill" />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="main-content" className="max-w-6xl mx-auto px-6 pt-28 pb-24" aria-labelledby="hero-heading">
        <div className="max-w-xl">
          <p className="text-[13px] font-medium text-primary tracking-wide uppercase mb-4" aria-label="Product category">
            Support AI
          </p>
          <h1 id="hero-heading" className="font-heading font-bold text-foreground">
            Resolve Tickets Before They're Filed
          </h1>
          <p className="text-description mt-5">
            AcmeDesk answers customer questions instantly from your docs. Accurate, on-brand, and always available.
          </p>
          <div className="flex items-center gap-4 mt-10">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              Open Admin
              <ArrowRight size={14} />
            </Link>
            <span className="text-[13px] text-muted-foreground">
              or try the chat widget →
            </span>
          </div>
        </div>
      </section>

      {/* Features — text-first, no icons */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-28" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {[
            {
              title: "Grounded answers",
              description:
                "Every response cites your knowledge base. No hallucinations, no made-up pricing or policies.",
            },
            {
              title: "Usage analytics",
              description:
                "See top questions, resolution rates, and documentation gaps — all in one dashboard.",
            },
            {
              title: "Safe escalation",
              description:
                "When confidence is low, conversations hand off to a human agent. No dead ends.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="bg-background p-8"
            >
              <h3 className="text-[15px] font-heading font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-description">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
