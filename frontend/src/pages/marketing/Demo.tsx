import { Link } from "react-router-dom";
import { Clock, Check, Calendar, MessageSquare, FileText, Settings, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/* ═══════════════════════════════════════════════════════════════════════════════
   DEMO PAGE
   Clean booking page with value proposition and Calendly embed
   ═══════════════════════════════════════════════════════════════════════════════ */

const DEMO_POINTS = [
  {
    icon: MessageSquare,
    title: "See NexaChat in action",
    description: "Watch a live demo tailored to your industry and use case.",
  },
  {
    icon: FileText,
    title: "Document upload walkthrough",
    description: "Learn how easy it is to train your AI on your business content.",
  },
  {
    icon: Settings,
    title: "Customization options",
    description: "Explore branding, personality, and channel integrations.",
  },
  {
    icon: Users,
    title: "Dashboard tour",
    description: "See how you'll manage conversations, leads, and team members.",
  },
  {
    icon: Sparkles,
    title: "Q&A and next steps",
    description: "Get all your questions answered and discuss implementation.",
  },
];

export default function Demo() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      <section className="pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Book a demo
              </p>
              <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                See NexaChat in action
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed font-description">
                Book a free 15-minute call and discover how NexaChat can transform
                your customer support. No sales pressure—just a genuine conversation.
              </p>

              {/* Duration */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">15 minutes</p>
                  <p className="text-sm text-muted-foreground">Quick and focused</p>
                </div>
              </div>

              {/* What we'll cover */}
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                What we'll cover
              </h2>
              <div className="space-y-4 mb-8">
                {DEMO_POINTS.map((point, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                      <point.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{point.title}</p>
                      <p className="text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Host */}
              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80 flex items-center justify-center text-lg font-bold text-white">
                    TS
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ted Simwa</p>
                    <p className="text-sm text-muted-foreground">Founder & Lead Developer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Calendly Embed */}
            <div>
              <div className="sticky top-28">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                      Select a time
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Calendly widget will appear here. For now:
                    </p>
                    <Button size="lg" className="w-full" asChild>
                      <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
                        Open booking calendar
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Free, no obligation
                  </span>
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    No credit card
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative */}
      <section className="py-16 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
            Prefer to explore first?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Try our interactive demo or browse our features.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/#demo">Try interactive demo</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/features">View features</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
