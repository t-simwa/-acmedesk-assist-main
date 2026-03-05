import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, Check, Sparkles, Zap, Users, BarChart3,
  MessageSquare, Globe, Shield, Clock, ChevronDown,
  Play, FileText, Brain, Headphones, Bot,
} from "lucide-react";
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   World-class design inspired by Linear, Vercel, Stripe
   
   Design principles:
   - Generous whitespace with intentional density shifts
   - Subtle animations that feel crafted, not generic
   - Typography-first hierarchy
   - Muted color palette with precise accent usage
   - Grid-breaking layouts with visual interest
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

// Animated counter
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return { count, ref };
}

// Industry data
const INDUSTRIES = [
  { id: "ecommerce", label: "E-Commerce", icon: "🛒" },
  { id: "legal", label: "Legal", icon: "⚖️" },
  { id: "real-estate", label: "Real Estate", icon: "🏠" },
  { id: "healthcare", label: "Healthcare", icon: "🏥" },
  { id: "saas", label: "SaaS", icon: "💻" },
  { id: "services", label: "Services", icon: "🔧" },
];

// FAQ data
const FAQS = [
  {
    q: "What makes NexaChat different from other chatbots?",
    a: "NexaChat uses RAG (Retrieval-Augmented Generation) to actually understand your business documents. Unlike generic chatbots, responses are grounded in your specific content—not hallucinated or generic.",
  },
  {
    q: "How long does setup take?",
    a: "Most businesses are live within 24 hours. Upload your documents, configure your chatbot's personality, and embed the widget. We handle the technical complexity.",
  },
  {
    q: "Do I need technical knowledge?",
    a: "Not at all. Our dashboard is designed for business owners, not developers. Copy-paste one line of code to install, or we'll do it for you.",
  },
  {
    q: "What channels are supported?",
    a: "Website chat, WhatsApp, Instagram DM, Facebook Messenger, Email, and SMS. One AI handles all channels with unified conversation history.",
  },
  {
    q: "How accurate are the responses?",
    a: "Responses are generated from your uploaded documents with source citations. The AI won't make things up—if it doesn't know, it says so and offers to connect with a human.",
  },
  {
    q: "What happens when the AI can't answer?",
    a: "Seamless escalation to your team via email, SMS, or dashboard notification. Full conversation context is preserved so your team can pick up instantly.",
  },
  {
    q: "Is my data secure?",
    a: "Your documents are encrypted at rest and in transit. We're GDPR compliant, and you retain full ownership of your data. Delete anytime.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No long-term contracts. Cancel anytime from your dashboard. We also offer a 7-day money-back guarantee if you're not satisfied.",
  },
];

// Pricing plans
const PLANS = [
  {
    name: "Starter",
    price: 99,
    description: "For small businesses getting started",
    features: [
      "500 conversations/month",
      "1 chatbot",
      "Website widget",
      "5 document uploads",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: 199,
    description: "For growing businesses",
    features: [
      "2,000 conversations/month",
      "3 chatbots",
      "All channels",
      "25 document uploads",
      "Lead capture & CRM",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: 399,
    description: "For established businesses",
    features: [
      "10,000 conversations/month",
      "Unlimited chatbots",
      "All channels + API",
      "Unlimited documents",
      "Team management",
      "Dedicated support",
    ],
  },
];

export default function Landing() {
  const [activeIndustry, setActiveIndustry] = useState("ecommerce");
  const [isAnnual, setIsAnnual] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Animated stats
  const stat1 = useCounter(500);
  const stat2 = useCounter(6);
  const stat3 = useCounter(3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          Clean, typography-focused with subtle background texture
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        
        {/* Gradient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Now supporting WhatsApp Business API
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Customer service that
              <br />
              <span className="text-primary">actually understands</span>
              <br />
              your business
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-description">
              AI chatbots trained on your documents, deployed across every channel.
              Answer questions, capture leads, and escalate to humans—automatically.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button size="lg" className="h-12 px-8 text-sm font-medium" asChild>
                <Link to="/demo">
                  Start free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-sm font-medium"
                asChild
              >
                <Link to="#demo">
                  <Play className="mr-2 h-4 w-4" />
                  Watch demo
                </Link>
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Live in 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>7-day money-back guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS BAR
          Simple, impactful numbers
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border/40 bg-accent/30">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-3 gap-8">
            <div ref={stat1.ref} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold font-mono tracking-tight text-foreground">
                {stat1.count}+
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Conversations handled
              </p>
            </div>
            <div ref={stat2.ref} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold font-mono tracking-tight text-foreground">
                {stat2.count}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Channels supported
              </p>
            </div>
            <div ref={stat3.ref} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold font-mono tracking-tight text-foreground">
                {"<"}{stat3.count}s
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Response time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          PROBLEM SECTION
          Empathy-driven, highlighting pain points
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              The problem
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
              Your customers have questions.
              <br />
              Your team can't always answer them.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Clock,
                title: "After-hours inquiries go unanswered",
                description: "Potential customers leave when no one responds at 2am. They find competitors who do.",
              },
              {
                icon: MessageSquare,
                title: "Repetitive questions drain your team",
                description: "Your staff answers the same 20 questions daily. It's frustrating, expensive, and unsustainable.",
              },
              {
                icon: Users,
                title: "Leads slip through the cracks",
                description: "Without systematic capture, interested visitors disappear before you can follow up.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border/60 bg-card hover:border-border transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-rose-500" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-lg font-medium text-foreground mt-12">
            Every unanswered question is a lost customer.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOLUTION SECTION
          Clean feature presentation
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-accent/30 border-y border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                The solution
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
                AI that's actually trained on your business
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed font-description">
                Upload your documents. Configure your chatbot. Go live.
                NexaChat uses RAG technology to generate accurate responses
                from your actual content—not generic templates.
              </p>

              <ul className="space-y-4">
                {[
                  "Trained on your PDFs, docs, and website content",
                  "Accurate answers with source citations",
                  "Seamless handoff to human agents",
                  "Works across all your channels",
                  "Live in under 24 hours",
                  "No technical knowledge required",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl border border-border bg-card overflow-hidden">
                <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="p-6 flex flex-col items-center justify-center h-[calc(100%-40px)]">
                  <Bot className="h-16 w-16 text-muted-foreground/40 mb-4" />
                  <p className="text-sm text-muted-foreground">Dashboard Preview</p>
                </div>
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl -z-10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
          Simple 3-step process
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              How it works
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Live in 24 hours. Seriously.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload your documents",
                description: "PDFs, Word docs, website content—anything that contains your business knowledge.",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "We configure & train",
                description: "Our system processes your content and creates a knowledge base unique to your business.",
              },
              {
                step: "03",
                icon: Globe,
                title: "Go live everywhere",
                description: "Deploy to your website, WhatsApp, Instagram, and more with a single click.",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold font-mono text-muted/30 mb-4">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            You don't touch a single line of code.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURES GRID
          Detailed capability showcase
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-accent/30 border-y border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Features
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to automate support
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "RAG Knowledge Base",
                description: "Your documents become searchable AI knowledge. Accurate answers, always cited.",
              },
              {
                icon: Users,
                title: "Lead Capture",
                description: "Automatically collect contact info during conversations. Export to your CRM.",
              },
              {
                icon: Globe,
                title: "Omnichannel",
                description: "One AI brain powers web, WhatsApp, Instagram, Facebook, Email, and SMS.",
              },
              {
                icon: Headphones,
                title: "Human Escalation",
                description: "Seamless handoff when needed. Your team gets full context instantly.",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                description: "Understand what customers ask. Identify knowledge gaps. Track performance.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Encrypted data, GDPR compliant, role-based access. Your data stays yours.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CHANNELS SECTION
          Visual channel showcase
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Omnichannel
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
                One AI. Every channel.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed font-description">
                Your customers reach out on WhatsApp, Instagram, Facebook, and your website.
                One AI handles all of them with unified context.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">One unified inbox.</p>
                <p className="text-sm text-foreground font-medium">One conversation history.</p>
                <p className="text-sm text-foreground font-medium">One contact record.</p>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              {/* Channel icons in orbit */}
              <div className="relative w-64 h-64">
                {/* Center brain */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                </div>
                
                {/* Orbiting channels */}
                {[
                  { icon: Globe, angle: 0, color: "text-blue-500" },
                  { icon: FaWhatsapp, angle: 60, color: "text-emerald-500" },
                  { icon: FaInstagram, angle: 120, color: "text-pink-500" },
                  { icon: FaFacebookMessenger, angle: 180, color: "text-blue-500" },
                  { icon: MdEmail, angle: 240, color: "text-violet-500" },
                  { icon: MessageSquare, angle: 300, color: "text-amber-500" },
                ].map((channel, i) => {
                  const x = Math.cos((channel.angle * Math.PI) / 180) * 100;
                  const y = Math.sin((channel.angle * Math.PI) / 180) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center"
                      style={{
                        left: `calc(50% + ${x}px - 24px)`,
                        top: `calc(50% + ${y}px - 24px)`,
                      }}
                    >
                      <channel.icon className={cn("h-5 w-5", channel.color)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          USE CASES SECTION
          Industry tabs
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-accent/30 border-y border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Use cases
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Built for your industry
            </h2>
          </div>

          {/* Industry tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setActiveIndustry(industry.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeIndustry === industry.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
              >
                <span className="mr-2">{industry.icon}</span>
                {industry.label}
              </button>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <p className="text-muted-foreground mb-6">
              See how NexaChat helps {INDUSTRIES.find(i => i.id === activeIndustry)?.label.toLowerCase()} businesses
              automate customer support and capture more leads.
            </p>
            <Button variant="outline" asChild>
              <Link to={`/use-cases/${activeIndustry}`}>
                Learn more
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          LIVE DEMO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="demo" className="py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Try it now
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              Experience it yourself
            </h2>
            <p className="text-lg text-muted-foreground font-description">
              This chatbot is trained on sample e-commerce data. Ask it anything.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Click the chat widget in the bottom-right corner to try the demo
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["What's your return policy?", "Do you ship internationally?", "Track my order"].map((q, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full border border-border bg-background text-xs text-muted-foreground"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Want this for your business?{" "}
            <Link to="/demo" className="text-primary hover:underline">
              Book a free demo →
            </Link>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          PRICING SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-accent/30 border-y border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Pricing
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            
            {/* Billing toggle */}
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

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => {
              const price = isAnnual ? Math.round(plan.price * 0.8) : plan.price;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative p-6 rounded-2xl border transition-all",
                    plan.popular
                      ? "border-primary bg-card shadow-lg"
                      : "border-border/60 bg-card hover:border-border"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold font-mono text-foreground">
                      ${price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/demo">Get started</Link>
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Need more?{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Contact us for enterprise pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FAQ SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                FAQ
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Common questions
              </h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="border border-border/60 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform",
                      expandedFaq === i && "rotate-180"
                    )} />
                  </button>
                  <div className={cn(
                    "overflow-hidden transition-all",
                    expandedFaq === i ? "max-h-48" : "max-h-0"
                  )}>
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
              Ready to transform your customer support?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 font-description">
              Join businesses using NexaChat to answer customers 24/7.
            </p>
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/demo">
                Start your free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                7-day free trial
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                No credit card
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
