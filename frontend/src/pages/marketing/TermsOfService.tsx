import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Mail, ExternalLink } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TERMS OF SERVICE PAGE
   Clean, readable legal document
   
   Design principles:
   - Typography-first for readability
   - Clear section navigation
   - Highlighted callouts for key information
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

export default function TermsOfService() {
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
            Terms of Service
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
            Welcome to NexaChat. These Terms of Service ("Terms") govern your use of our AI-powered
            customer service platform. By using NexaChat, you agree to these Terms. If you don't
            agree, please don't use our services.
          </p>

          {/* Table of Contents */}
          <div className="p-6 rounded-xl border border-border bg-card/50 mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Contents
            </p>
            <nav className="grid grid-cols-2 gap-2 text-sm">
              <a href="#service-description" className="text-muted-foreground hover:text-foreground transition-colors">1. Service Description</a>
              <a href="#acceptable-use" className="text-muted-foreground hover:text-foreground transition-colors">2. Acceptable Use</a>
              <a href="#your-responsibilities" className="text-muted-foreground hover:text-foreground transition-colors">3. Your Responsibilities</a>
              <a href="#payment-terms" className="text-muted-foreground hover:text-foreground transition-colors">4. Payment Terms</a>
              <a href="#refund-policy" className="text-muted-foreground hover:text-foreground transition-colors">5. Refund Policy</a>
              <a href="#cancellation" className="text-muted-foreground hover:text-foreground transition-colors">6. Cancellation</a>
              <a href="#data-ownership" className="text-muted-foreground hover:text-foreground transition-colors">7. Data Ownership</a>
              <a href="#intellectual-property" className="text-muted-foreground hover:text-foreground transition-colors">8. Intellectual Property</a>
              <a href="#liability" className="text-muted-foreground hover:text-foreground transition-colors">9. Limitation of Liability</a>
              <a href="#service-availability" className="text-muted-foreground hover:text-foreground transition-colors">10. Service Availability</a>
              <a href="#termination" className="text-muted-foreground hover:text-foreground transition-colors">11. Termination</a>
              <a href="#governing-law" className="text-muted-foreground hover:text-foreground transition-colors">12. Governing Law</a>
              <a href="#changes" className="text-muted-foreground hover:text-foreground transition-colors">13. Changes to Terms</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">14. Contact</a>
            </nav>
          </div>

          {/* Section 1 */}
          <section id="service-description" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">1. Service Description</h2>
            <p className="text-muted-foreground mb-4">
              NexaChat provides an AI-powered customer service platform that enables businesses to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Create and deploy AI chatbots trained on custom business documents</li>
              <li>Integrate chatbots across multiple channels (website, WhatsApp, Instagram, etc.)</li>
              <li>Capture and manage leads from chatbot conversations</li>
              <li>Access analytics and reporting on chatbot performance</li>
              <li>Manage team members and conversation routing</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="acceptable-use" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">2. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree NOT to use NexaChat to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Distribute malware, spam, or harmful content</li>
              <li>Impersonate others or misrepresent your identity</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Transmit content that is defamatory, obscene, or threatening</li>
              <li>Use the service for any illegal or fraudulent purposes</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          {/* Section 3 */}
          <section id="your-responsibilities" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">3. Your Responsibilities</h2>
            <p className="text-muted-foreground mb-4">You are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>Ensuring the accuracy and legality of content you upload</li>
              <li>Obtaining necessary rights to use content in your chatbot</li>
              <li>Complying with applicable privacy and data protection laws</li>
              <li>Informing your customers that they may be interacting with an AI</li>
              <li>Monitoring and moderating your chatbot's responses</li>
              <li>Responding to escalated conversations promptly</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="payment-terms" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">4. Payment Terms</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All prices are in USD unless otherwise stated</li>
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>Payment is processed securely through Stripe</li>
              <li>Prices may change with 30 days notice</li>
              <li>Failed payments may result in service suspension</li>
              <li>You are responsible for any applicable taxes</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="refund-policy" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">5. Refund Policy</h2>
            <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-4">
              <h3 className="font-heading text-lg font-semibold text-emerald-400 mb-3">7-Day Money-Back Guarantee</h3>
              <p className="text-muted-foreground">
                If you're not satisfied with NexaChat within 7 days of your first paid subscription,
                contact us for a full refund. No questions asked.
              </p>
            </div>
            <p className="text-muted-foreground">
              After the 7-day period, refunds are not available for partially used billing periods.
              You can cancel at any time, and your service will remain active until the end of your
              current billing period.
            </p>
          </section>

          {/* Section 6 */}
          <section id="cancellation" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">6. Cancellation</h2>
            <p className="text-muted-foreground mb-4">You can cancel your subscription at any time:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Go to Settings → Billing → Cancel Subscription</li>
              <li>Or email <a href="mailto:support@nexachat.ai" className="text-primary hover:underline">support@nexachat.ai</a></li>
            </ul>
            <p className="text-muted-foreground mb-4">Upon cancellation:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your service continues until the end of the current billing period</li>
              <li>Your chatbot will stop responding after the billing period ends</li>
              <li>Your data will be retained for 30 days, then deleted</li>
              <li>You can export your data before the 30-day period ends</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="data-ownership" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">7. Data Ownership</h2>
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 mb-4">
              <p className="font-heading text-lg font-semibold text-primary mb-2">
                You own your data. Period.
              </p>
              <p className="text-muted-foreground">
                All documents you upload, conversations your chatbot has, leads captured, and any
                other content you create or collect through NexaChat remains your property.
              </p>
            </div>
            <p className="text-muted-foreground">
              We may use anonymized, aggregated data to improve our services, but we will never
              use your specific business data for any purpose other than providing the service to you.
            </p>
          </section>

          {/* Section 8 */}
          <section id="intellectual-property" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              NexaChat's software, design, code, and branding are owned by us and protected by
              intellectual property laws. You may not copy, modify, distribute, or create derivative
              works without our permission.
            </p>
            <p className="text-muted-foreground">
              You grant us a limited license to use your uploaded content solely for the purpose of
              providing the service (training your chatbot, generating responses, etc.).
            </p>
          </section>

          {/* Section 9 */}
          <section id="liability" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>NexaChat is provided "as is" without warranties of any kind</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid in the last 12 months</li>
              <li>We are not responsible for the accuracy of AI-generated responses</li>
              <li>You are responsible for reviewing and moderating your chatbot's content</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="service-availability" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">10. Service Availability</h2>
            <p className="text-muted-foreground mb-4">
              We strive for 99.9% uptime but cannot guarantee uninterrupted service. We may:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Perform scheduled maintenance with advance notice</li>
              <li>Experience unplanned downtime due to technical issues</li>
              <li>Modify or discontinue features with notice</li>
            </ul>
            <p className="text-muted-foreground">
              Check our <Link to="/status" className="text-primary hover:underline">Status Page</Link> for
              real-time service status and incident history.
            </p>
          </section>

          {/* Section 11 */}
          <section id="termination" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">11. Termination</h2>
            <p className="text-muted-foreground mb-4">
              We may terminate or suspend your account immediately if you:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Violate these Terms of Service</li>
              <li>Fail to pay your subscription fees</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Abuse our support team or other users</li>
            </ul>
            <p className="text-muted-foreground">
              Upon termination, your right to use the service ceases immediately. We may, but are
              not obligated to, provide you with a copy of your data.
            </p>
          </section>

          {/* Section 12 */}
          <section id="governing-law" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground mb-4">
              These Terms are governed by the laws of Kenya. Any disputes arising from these Terms
              or your use of NexaChat shall be resolved in the courts of Nairobi, Kenya.
            </p>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will continue in effect.
            </p>
          </section>

          {/* Section 13 */}
          <section id="changes" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground mb-4">
              We may update these Terms from time to time. When we do:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>We will notify you via email at least 30 days in advance for material changes</li>
              <li>The updated Terms will be posted on this page with a new "Last updated" date</li>
              <li>Continued use of NexaChat after changes constitutes acceptance</li>
            </ul>
          </section>

          {/* Section 14 */}
          <section id="contact" className="mb-12 scroll-mt-28">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">14. Contact</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, contact us at:
            </p>
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-foreground">
                    <a href="mailto:legal@nexachat.ai" className="text-primary hover:underline">
                      legal@nexachat.ai
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nairobi, Kenya
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
