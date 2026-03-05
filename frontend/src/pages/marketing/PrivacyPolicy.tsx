import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   PRIVACY POLICY PAGE
   Clean, readable policy document with proper hierarchy
   
   Design principles:
   - Typography-first for readability
   - Clear section navigation
   - Scannable content with proper spacing
   - Muted accents that don't distract
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

export default function PrivacyPolicy() {
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
            Privacy Policy
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
            At NexaChat ("we," "our," or "us"), we take your privacy seriously. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when
            you use our AI-powered customer service platform.
          </p>

          {/* Table of Contents */}
          <div className="p-6 rounded-xl border border-border bg-card/50 mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Contents
            </p>
            <nav className="grid grid-cols-2 gap-2 text-sm">
              <a href="#information-collected" className="text-muted-foreground hover:text-foreground transition-colors">1. Information We Collect</a>
              <a href="#how-we-use" className="text-muted-foreground hover:text-foreground transition-colors">2. How We Use Your Information</a>
              <a href="#information-sharing" className="text-muted-foreground hover:text-foreground transition-colors">3. Information Sharing</a>
              <a href="#data-retention" className="text-muted-foreground hover:text-foreground transition-colors">4. Data Retention</a>
              <a href="#your-rights" className="text-muted-foreground hover:text-foreground transition-colors">5. Your Rights</a>
              <a href="#cookies" className="text-muted-foreground hover:text-foreground transition-colors">6. Cookies and Tracking</a>
              <a href="#third-party" className="text-muted-foreground hover:text-foreground transition-colors">7. Third-Party Services</a>
              <a href="#compliance" className="text-muted-foreground hover:text-foreground transition-colors">8. GDPR and CCPA</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">9. Contact Us</a>
            </nav>
          </div>

          {/* Section 1 */}
          <section id="information-collected" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
            
            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">1.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Account Information:</strong> Name, email address, company name, and password when you create an account</li>
              <li><strong className="text-foreground">Payment Information:</strong> Credit card details and billing address (processed securely by Stripe)</li>
              <li><strong className="text-foreground">Business Documents:</strong> PDFs, documents, and other content you upload to train your chatbot</li>
              <li><strong className="text-foreground">Communication Data:</strong> Messages, emails, and other communications with our support team</li>
            </ul>

            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">1.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, and actions taken within the platform</li>
              <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong className="text-foreground">Log Data:</strong> IP address, access times, and referring URLs</li>
              <li><strong className="text-foreground">Conversation Data:</strong> Chat logs between your chatbot and your customers</li>
            </ul>

            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">1.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Information from integrated channels (WhatsApp, Instagram, Facebook) when you connect them</li>
              <li>Analytics data from our service providers</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="how-we-use" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Train and operate your AI chatbot</li>
              <li>Send technical notices, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Analyze usage patterns and improve user experience</li>
              <li>Detect, prevent, and address technical issues or fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="information-sharing" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">3. Information Sharing</h2>
            <p className="text-muted-foreground mb-4">We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> When required by law or to respond to legal process</li>
              <li><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong className="text-foreground">With Your Consent:</strong> When you have given us explicit permission</li>
            </ul>
            <p className="text-muted-foreground">
              We do <strong className="text-foreground">not</strong> sell your personal information to third parties.
            </p>
          </section>

          {/* Section 4 */}
          <section id="data-retention" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">4. Data Retention</h2>
            <p className="text-muted-foreground mb-4">We retain your data for the following periods:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Account Data:</strong> Until you delete your account, plus 30 days for backup purposes</li>
              <li><strong className="text-foreground">Conversation History:</strong> As specified in your plan (30 days to 1 year)</li>
              <li><strong className="text-foreground">Payment Records:</strong> 7 years for legal and tax compliance</li>
              <li><strong className="text-foreground">Usage Analytics:</strong> 2 years in aggregated, anonymized form</li>
            </ul>
            <p className="text-muted-foreground">
              You can request deletion of your data at any time by contacting us.
            </p>
          </section>

          {/* Section 5 */}
          <section id="your-rights" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate personal data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data</li>
              <li><strong className="text-foreground">Data Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong className="text-foreground">Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong className="text-foreground">Withdraw Consent:</strong> Withdraw previously given consent</li>
            </ul>
            <p className="text-muted-foreground">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@nexachat.ai" className="text-primary hover:underline">
                privacy@nexachat.ai
              </a>.
            </p>
          </section>

          {/* Section 6 */}
          <section id="cookies" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar tracking technologies to collect and track information.
              For detailed information, see our{" "}
              <Link to="/cookie-policy" className="text-primary hover:underline">
                Cookie Policy
              </Link>.
            </p>
            <p className="text-muted-foreground">
              You can control cookies through your browser settings. Note that disabling cookies
              may affect the functionality of our services.
            </p>
          </section>

          {/* Section 7 */}
          <section id="third-party" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">We use the following third-party services:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Service</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Purpose</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { service: "OpenAI", purpose: "AI/LLM Services", link: "https://openai.com/privacy" },
                    { service: "Stripe", purpose: "Payment Processing", link: "https://stripe.com/privacy" },
                    { service: "SendGrid", purpose: "Email Services", link: "https://sendgrid.com/privacy" },
                    { service: "Twilio", purpose: "WhatsApp/SMS", link: "https://twilio.com/legal/privacy" },
                    { service: "Meta", purpose: "Instagram/Facebook", link: "https://facebook.com/privacy" },
                    { service: "Vercel", purpose: "Hosting", link: "https://vercel.com/legal/privacy" },
                    { service: "Supabase", purpose: "Database", link: "https://supabase.com/privacy" },
                  ].map((item, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 px-4 text-foreground">{item.service}</td>
                      <td className="py-3 px-4">{item.purpose}</td>
                      <td className="py-3 px-4">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section id="compliance" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">8. GDPR and CCPA Compliance</h2>
            
            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">GDPR (European Users)</h3>
            <p className="text-muted-foreground mb-4">
              If you are located in the European Economic Area, you have additional rights under GDPR,
              including the right to lodge a complaint with a supervisory authority. Our legal basis
              for processing is your consent and our legitimate business interests.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mb-3 mt-6">CCPA (California Residents)</h3>
            <p className="text-muted-foreground">
              California residents have additional rights under CCPA, including the right to know
              what personal information is collected and the right to opt-out of the sale of
              personal information. We do not sell personal information.
            </p>
          </section>

          {/* Section 9 */}
          <section id="contact" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              For questions about this Privacy Policy or to exercise your rights, contact us at:
            </p>
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-foreground">
                    <a href="mailto:privacy@nexachat.ai" className="text-primary hover:underline">
                      privacy@nexachat.ai
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nairobi, Kenya
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Deletion Instructions */}
          <section className="p-6 rounded-xl border border-primary/20 bg-primary/5">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-3">How to Delete Your Data</h3>
            <p className="text-muted-foreground mb-4">
              To request deletion of all your data:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Log in to your dashboard and go to Settings → Account</li>
              <li>Click "Delete Account" and confirm your decision</li>
              <li>Or email <a href="mailto:privacy@nexachat.ai" className="text-primary hover:underline">privacy@nexachat.ai</a> with your request</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              Data deletion requests are processed within 30 days.
            </p>
          </section>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
