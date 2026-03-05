import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Cookie, Settings, BarChart3, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   COOKIE POLICY PAGE
   Clear cookie information with categorized tables
   
   Design principles:
   - Visual categorization by cookie type
   - Scannable tables for technical details
   - Clear opt-out instructions
   - Clean, readable layout
   ═══════════════════════════════════════════════════════════════════════════════ */

// Animation hook for scroll-triggered reveals
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

export default function CookiePolicy() {
  const lastUpdated = "March 1, 2026";
  const headerRef = useInView();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-12 lg:pt-40 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />

        <div 
          ref={headerRef.ref}
          className={cn(
            "relative max-w-3xl mx-auto px-6 lg:px-8 transition-all duration-700",
            headerRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Cookie Policy
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          {/* Introduction */}
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            This Cookie Policy explains how NexaChat uses cookies and similar technologies to
            recognize you when you visit our website and use our services. It explains what these
            technologies are, why we use them, and your rights to control their use.
          </p>

          {/* What Are Cookies */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">What Are Cookies?</h2>
            <p className="text-muted-foreground mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or
              mobile) when you visit a website. They are widely used to make websites work
              efficiently and provide information to website owners.
            </p>
            <p className="text-muted-foreground">
              We also use similar technologies like local storage, session storage, and pixels
              for similar purposes.
            </p>
          </section>

          {/* Types of Cookies */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Types of Cookies We Use</h2>

            {/* Essential Cookies */}
            <div className="p-6 rounded-xl border border-border bg-card/50 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">Essential Cookies</h3>
                  <span className="text-sm text-emerald-400">Required - Cannot be disabled</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These cookies are necessary for the website to function and cannot be switched off.
                They are usually only set in response to actions you take, such as logging in or
                filling out forms.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Cookie</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-4 text-foreground">session_id</td>
                      <td className="py-2 px-4">Maintains your login session</td>
                      <td className="py-2 px-4">Session</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-4 text-foreground">csrf_token</td>
                      <td className="py-2 px-4">Security - prevents cross-site attacks</td>
                      <td className="py-2 px-4">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-foreground">cookie_consent</td>
                      <td className="py-2 px-4">Remembers your cookie preferences</td>
                      <td className="py-2 px-4">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Cookies */}
            <div className="p-6 rounded-xl border border-border bg-card/50 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">Performance Cookies</h3>
                  <span className="text-sm text-primary">Optional - Analytics</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These cookies help us understand how visitors interact with our website by
                collecting and reporting information anonymously.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Cookie</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-4 text-foreground">_ga</td>
                      <td className="py-2 px-4">Google Analytics - distinguishes users</td>
                      <td className="py-2 px-4">2 years</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-4 text-foreground">_gid</td>
                      <td className="py-2 px-4">Google Analytics - distinguishes users</td>
                      <td className="py-2 px-4">24 hours</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-foreground">_gat</td>
                      <td className="py-2 px-4">Google Analytics - rate limiting</td>
                      <td className="py-2 px-4">1 minute</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">Functional Cookies</h3>
                  <span className="text-sm text-violet-400">Optional - Preferences</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These cookies enable enhanced functionality and personalization, such as remembering
                your preferences and settings.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Cookie</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 px-4 font-semibold text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-4 text-foreground">theme</td>
                      <td className="py-2 px-4">Remembers your dark/light mode preference</td>
                      <td className="py-2 px-4">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-foreground">language</td>
                      <td className="py-2 px-4">Remembers your language preference</td>
                      <td className="py-2 px-4">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Third-Party Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Google Analytics:</strong> Helps us understand how visitors use our site</li>
              <li><strong className="text-foreground">Stripe:</strong> Used for secure payment processing</li>
              <li><strong className="text-foreground">Intercom:</strong> Powers our chat support widget</li>
              <li><strong className="text-foreground">Calendly:</strong> Enables demo booking functionality</li>
            </ul>
            <p className="text-muted-foreground">
              These third parties have their own privacy policies governing their use of cookies.
            </p>
          </section>

          {/* How to Control Cookies */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">How to Control Cookies</h2>

            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">Browser Settings</h3>
            <p className="text-muted-foreground mb-4">
              Most web browsers allow you to control cookies through their settings. Here's how:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong className="text-foreground">Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong className="text-foreground">Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>

            <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Opt-Out Links</h3>
            <p className="text-muted-foreground mb-4">
              You can also opt out of specific cookies:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Google Analytics Opt-Out <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Digital Advertising Alliance Opt-Out <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>

            <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h4 className="font-heading font-semibold text-amber-400 mb-2">Important Note</h4>
              <p className="text-sm text-muted-foreground">
                Blocking some cookies may impact your experience on our website. Essential cookies
                cannot be disabled as they are necessary for the site to function.
              </p>
            </div>
          </section>

          {/* Cookie Consent */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Cookie Consent</h2>
            <p className="text-muted-foreground mb-4">
              When you first visit our website, you will see a cookie consent banner. You can:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Accept All:</strong> Accept all cookies including analytics and functional</li>
              <li><strong className="text-foreground">Essential Only:</strong> Only accept cookies necessary for the site to work</li>
              <li><strong className="text-foreground">Customize:</strong> Choose which categories of cookies to accept</li>
            </ul>
            <p className="text-muted-foreground">
              You can change your preferences at any time by clicking the "Cookie Settings" link
              in our website footer.
            </p>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy from time to time to reflect changes in the cookies
              we use or for other operational, legal, or regulatory reasons. Please revisit this
              page regularly to stay informed about our use of cookies.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about our use of cookies, contact us at:
            </p>
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3">
                <Cookie className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-foreground">
                    <a href="mailto:privacy@nexachat.ai" className="text-primary hover:underline">
                      privacy@nexachat.ai
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Related Policies */}
          <section className="p-6 rounded-xl border border-border bg-card/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Related Policies
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/privacy-policy"
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-of-service"
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </section>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
