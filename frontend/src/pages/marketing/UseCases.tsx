import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, Scale, Building2, Heart, Code, Wrench,
  ArrowRight, MessageSquare, Users, Clock, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   USE CASES INDEX PAGE
   Industry showcase with visual hierarchy
   
   Design principles:
   - Card-based layout with clear information density
   - Subtle gradients that don't overwhelm
   - Statistics that communicate value quickly
   - Clear CTAs guiding to detail pages
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

// Industry use cases data - shared across components
export const USE_CASES_DATA = [
  {
    id: "ecommerce",
    name: "E-Commerce",
    icon: ShoppingCart,
    description: "Answer product questions, check order status, and capture leads 24/7. Perfect for online stores of any size.",
    painPoints: [
      "Customers asking about sizing and availability at midnight",
      "Cart abandonment from unanswered pre-purchase questions",
      "Support team overwhelmed during sales periods",
    ],
    solutions: [
      "Instant answers to product questions, returns, and shipping",
      "Order status tracking without staff involvement",
      "Lead capture for high-intent browsers",
    ],
    channels: ["Website", "WhatsApp", "Instagram", "Facebook"],
    stats: {
      reduction: "65%",
      leadIncrease: "3x",
      responseTime: "< 3s",
    },
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    id: "legal",
    name: "Legal Services",
    icon: Scale,
    description: "Qualify leads, schedule consultations, and answer common legal FAQs while maintaining professional standards.",
    painPoints: [
      "Potential clients leaving when they can't reach you",
      "Staff time wasted on basic intake questions",
      "After-hours leads going to competitors",
    ],
    solutions: [
      "24/7 lead qualification with intake questions",
      "Consultation scheduling automation",
      "Common legal FAQ handling with proper disclaimers",
    ],
    channels: ["Website", "WhatsApp", "Email"],
    stats: {
      reduction: "55%",
      leadIncrease: "2.5x",
      responseTime: "< 3s",
    },
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "real-estate",
    name: "Real Estate",
    icon: Building2,
    description: "Qualify buyers, schedule viewings, and provide property information instantly across all time zones.",
    painPoints: [
      "Missing buyer inquiries during showings",
      "Repeating the same property details dozens of times",
      "Losing international leads due to timezone gaps",
    ],
    solutions: [
      "Instant property information and availability",
      "Automated viewing scheduling",
      "Lead qualification with budget and preference questions",
    ],
    channels: ["Website", "WhatsApp", "Instagram", "Email"],
    stats: {
      reduction: "70%",
      leadIncrease: "4x",
      responseTime: "< 3s",
    },
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: Heart,
    description: "Handle appointment scheduling, answer common medical questions, and provide clinic information while maintaining compliance.",
    painPoints: [
      "Phone lines jammed with appointment requests",
      "Patients needing information outside clinic hours",
      "Staff spending hours on routine inquiries",
    ],
    solutions: [
      "Appointment scheduling and reminders",
      "Pre-visit information and preparation instructions",
      "Common health FAQ handling with proper disclaimers",
    ],
    channels: ["Website", "WhatsApp", "SMS"],
    stats: {
      reduction: "60%",
      leadIncrease: "2x",
      responseTime: "< 3s",
    },
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
  {
    id: "saas",
    name: "SaaS / Technology",
    icon: Code,
    description: "Provide instant technical support, handle feature questions, and qualify leads for sales teams.",
    painPoints: [
      "Support tickets piling up with repetitive questions",
      "Prospects leaving before getting demo scheduled",
      "Technical docs not being discovered by users",
    ],
    solutions: [
      "Instant answers from documentation and knowledge base",
      "Demo scheduling and lead qualification",
      "Technical troubleshooting guidance",
    ],
    channels: ["Website", "Email"],
    stats: {
      reduction: "50%",
      leadIncrease: "2x",
      responseTime: "< 3s",
    },
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    id: "service-business",
    name: "Service Business",
    icon: Wrench,
    description: "Handle booking requests, provide service information, and capture leads for local service businesses.",
    painPoints: [
      "Missing calls while on the job",
      "Customers needing quotes outside business hours",
      "No systematic lead capture process",
    ],
    solutions: [
      "24/7 booking and quote requests",
      "Service information and pricing",
      "Lead capture with project details",
    ],
    channels: ["Website", "WhatsApp", "Facebook"],
    stats: {
      reduction: "60%",
      leadIncrease: "3x",
      responseTime: "< 3s",
    },
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
];

export default function UseCases() {
  const heroRef = useInView();
  const gridRef = useInView(0.1);
  const benefitsRef = useInView(0.2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        
        {/* Gradient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

        <div 
          ref={heroRef.ref}
          className={cn(
            "relative max-w-[1400px] mx-auto px-6 lg:px-8 text-center transition-all duration-700",
            heroRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-sm font-medium text-primary mb-4 tracking-wide">
            Use Cases
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            AI customer service for
            <br />
            <span className="text-muted-foreground">every industry</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how businesses like yours are using NexaChat to transform
            customer support, capture more leads, and save time.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          USE CASES GRID
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pb-24 lg:pb-32">
        <div 
          ref={gridRef.ref}
          className={cn(
            "max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            gridRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {USE_CASES_DATA.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Link
                  key={useCase.id}
                  to={`/use-cases/${useCase.id}`}
                  className="group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <article className="h-full flex flex-col p-6 lg:p-8 rounded-xl border border-border bg-card/30 hover:border-primary/20 hover:bg-card/50 transition-all">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-5",
                      useCase.bgColor
                    )}>
                      <Icon className={cn("h-5 w-5", useCase.color)} />
                    </div>

                    {/* Content */}
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {useCase.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                      {useCase.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-border mb-6">
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">{useCase.stats.reduction}</p>
                        <p className="text-xs text-muted-foreground">Less tickets</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">{useCase.stats.leadIncrease}</p>
                        <p className="text-xs text-muted-foreground">More leads</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">{useCase.stats.responseTime}</p>
                        <p className="text-xs text-muted-foreground">Response</p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                      Learn more
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMMON BENEFITS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
        
        <div 
          ref={benefitsRef.ref}
          className={cn(
            "relative max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            benefitsRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
              Universal benefits
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Works for every business
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              No matter your industry, NexaChat delivers consistent value.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                title: "24/7 availability",
                description: "Your AI assistant never sleeps, ensuring customers get answers anytime.",
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
              },
              {
                icon: Users,
                title: "Lead capture",
                description: "Automatically capture and qualify leads from every conversation.",
                color: "text-violet-400",
                bgColor: "bg-violet-500/10",
              },
              {
                icon: MessageSquare,
                title: "Accurate answers",
                description: "RAG technology ensures responses are based on your actual documents.",
                color: "text-emerald-400",
                bgColor: "bg-emerald-500/10",
              },
              {
                icon: Zap,
                title: "Instant setup",
                description: "Go live in 24 hours. Upload documents, configure, and deploy.",
                color: "text-amber-400",
                bgColor: "bg-amber-500/10",
              },
            ].map((benefit, index) => (
              <div key={index} className="text-center">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4",
                  benefit.bgColor
                )}>
                  <benefit.icon className={cn("h-6 w-6", benefit.color)} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
        
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Custom solutions
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Don't see your industry?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            NexaChat works for any business with customer questions. Book a demo
            and we'll show you how it can work for your specific use case.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/demo">
                Book your free demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8" asChild>
              <Link to="/contact">
                Contact us
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
