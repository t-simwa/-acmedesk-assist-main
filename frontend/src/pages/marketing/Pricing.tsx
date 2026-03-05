import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, ArrowRight, HelpCircle, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   PRICING PAGE
   Clean, scannable pricing with full feature comparison
   ═══════════════════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "For small businesses getting started",
    monthlyPrice: 99,
    annualPrice: 79,
    features: [
      "500 conversations/month",
      "1 chatbot",
      "Website widget",
      "Basic analytics",
      "Email support",
      "5 document uploads",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing businesses",
    monthlyPrice: 199,
    annualPrice: 159,
    popular: true,
    features: [
      "2,000 conversations/month",
      "3 chatbots",
      "All channels",
      "Advanced analytics",
      "Priority support",
      "25 document uploads",
      "Lead capture & CRM export",
      "Human escalation",
      "Custom branding",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For established businesses",
    monthlyPrice: 399,
    annualPrice: 319,
    features: [
      "10,000 conversations/month",
      "Unlimited chatbots",
      "All channels + API",
      "Advanced analytics + API",
      "Dedicated support",
      "Unlimited documents",
      "Lead capture + CRM integration",
      "Human escalation + SLAs",
      "White-label options",
      "Team management (5 seats)",
      "Audit logs",
    ],
  },
];

const FEATURE_COMPARISON = [
  {
    category: "Usage",
    features: [
      { name: "Monthly conversations", starter: "500", growth: "2,000", pro: "10,000", enterprise: "Custom" },
      { name: "Chatbots", starter: "1", growth: "3", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "Document uploads", starter: "5", growth: "25", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "File size limit", starter: "10MB", growth: "25MB", pro: "50MB", enterprise: "100MB" },
    ],
  },
  {
    category: "Channels",
    features: [
      { name: "Website widget", starter: true, growth: true, pro: true, enterprise: true },
      { name: "WhatsApp", starter: false, growth: true, pro: true, enterprise: true },
      { name: "Instagram DM", starter: false, growth: true, pro: true, enterprise: true },
      { name: "Facebook Messenger", starter: false, growth: true, pro: true, enterprise: true },
      { name: "Email", starter: false, growth: false, pro: true, enterprise: true },
      { name: "SMS", starter: false, growth: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "AI & Knowledge",
    features: [
      { name: "GPT-4o powered", starter: true, growth: true, pro: true, enterprise: true },
      { name: "RAG knowledge base", starter: true, growth: true, pro: true, enterprise: true },
      { name: "Source citations", starter: true, growth: true, pro: true, enterprise: true },
      { name: "Custom AI personality", starter: false, growth: true, pro: true, enterprise: true },
      { name: "Multi-language", starter: false, growth: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Lead Management",
    features: [
      { name: "Lead capture", starter: true, growth: true, pro: true, enterprise: true },
      { name: "Lead notifications", starter: "Email", growth: "Email + SMS", pro: "All + Webhook", enterprise: "Custom" },
      { name: "CRM export (CSV)", starter: true, growth: true, pro: true, enterprise: true },
      { name: "CRM API integration", starter: false, growth: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Support & Team",
    features: [
      { name: "Human escalation", starter: false, growth: true, pro: true, enterprise: true },
      { name: "Team seats", starter: "1", growth: "3", pro: "5", enterprise: "Custom" },
      { name: "Role-based access", starter: false, growth: false, pro: true, enterprise: true },
      { name: "Audit logs", starter: false, growth: false, pro: true, enterprise: true },
      { name: "Support level", starter: "Email", growth: "Priority", pro: "Dedicated", enterprise: "24/7" },
    ],
  },
];

const FAQ = [
  {
    q: "What counts as a conversation?",
    a: "A conversation starts when a visitor sends their first message and ends after 30 minutes of inactivity. Follow-up messages within that window don't count as new conversations.",
  },
  {
    q: "What happens if I exceed my limit?",
    a: "We'll notify you at 80%. At 100%, your chatbot shows a friendly message asking visitors to return later. You can upgrade anytime to restore service instantly.",
  },
  {
    q: "Can I change plans?",
    a: "Yes. Upgrades take effect immediately with prorated billing. Downgrades apply at your next billing cycle. You can change anytime from your dashboard.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes, all plans include a 7-day free trial with full features. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit cards via Stripe. Enterprise plans can arrange invoice billing.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, 7-day money-back guarantee on all plans. If you're not satisfied, contact us for a full refund.",
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Pricing
            </p>
            <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground font-description">
              No hidden fees. No surprise charges. Start free, upgrade when you're ready.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={cn("text-sm", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-12 h-6 bg-muted rounded-full transition-colors"
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-primary transition-transform",
                  isAnnual ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
              <span className={cn("text-sm", isAnnual ? "text-foreground" : "text-muted-foreground")}>
                Annual
              </span>
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-full">
                Save 20%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => {
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative p-6 lg:p-8 rounded-2xl border transition-all",
                    plan.popular
                      ? "border-primary bg-card shadow-lg scale-[1.02]"
                      : "border-border/60 bg-card hover:border-border"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-heading font-semibold text-xl text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold font-mono text-foreground">
                      ${price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                    {isAnnual && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed annually (${price * 12}/year)
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/demo">Start free trial</Link>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          plan.popular ? "text-primary" : "text-emerald-500"
                        )} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Enterprise */}
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="p-6 lg:p-8 rounded-2xl border border-border/60 bg-card text-center">
              <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                Enterprise
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Custom limits, dedicated infrastructure, SLA guarantees, and white-glove onboarding.
              </p>
              <Button variant="outline" asChild>
                <Link to="/contact">
                  Contact sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-3">
              Compare all features
            </h2>
            <p className="text-muted-foreground">
              Detailed breakdown of what's included in each plan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground w-1/3">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                    Starter
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-primary">
                    Growth
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((section) => (
                  <>
                    <tr key={section.category} className="bg-muted/30">
                      <td colSpan={5} className="py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wide">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature, i) => (
                      <tr key={`${section.category}-${i}`} className="border-b border-border/50">
                        <td className="py-3 px-4 text-foreground">{feature.name}</td>
                        {[feature.starter, feature.growth, feature.pro, feature.enterprise].map((val, j) => (
                          <td key={j} className="text-center py-3 px-4">
                            {typeof val === "boolean" ? (
                              val ? (
                                <Check className={cn(
                                  "h-4 w-4 mx-auto",
                                  j === 1 ? "text-primary" : "text-emerald-500"
                                )} />
                              ) : (
                                <X className="h-4 w-4 mx-auto text-muted-foreground/40" />
                              )
                            ) : (
                              <span className={cn(
                                j === 1 ? "text-foreground font-medium" : "text-muted-foreground"
                              )}>
                                {val}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Money-back Guarantee */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto p-6 lg:p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  7-day money-back guarantee
                </h3>
                <p className="text-sm text-muted-foreground">
                  Not satisfied within 7 days of your first payment? We'll refund you in full, no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                FAQ
              </p>
              <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Pricing questions
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div key={i} className="border border-border/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">{item.q}</span>
                    {expandedFaq === i ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  <div className={cn(
                    "overflow-hidden transition-all",
                    expandedFaq === i ? "max-h-40" : "max-h-0"
                  )}>
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Still have questions?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Get in touch →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
            Start your free trial today
          </h2>
          <p className="text-lg text-muted-foreground mb-8 font-description">
            7 days free. No credit card required. Cancel anytime.
          </p>
          <Button size="lg" className="h-12 px-8" asChild>
            <Link to="/demo">
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
