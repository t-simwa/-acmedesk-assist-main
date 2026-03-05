import { useState, useRef, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Check, Calculator, MessageSquare,
  DollarSign, Clock, Users, TrendingUp, AlertCircle,
} from "lucide-react";
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import { MdEmail, MdWeb, MdSms } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { USE_CASES_DATA } from "./UseCases";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   USE CASE DETAIL PAGE
   Individual industry page with hero, pain points, solutions, ROI calculator
   
   Design principles:
   - Clear problem/solution narrative
   - Interactive ROI calculator for engagement
   - Data-driven value proposition
   - Clean, purposeful layout
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

// Channel icons mapping
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Website: MdWeb,
  WhatsApp: FaWhatsapp,
  Instagram: FaInstagram,
  Facebook: FaFacebook,
  Email: MdEmail,
  SMS: MdSms,
};

export default function UseCaseDetail() {
  const { industry } = useParams<{ industry: string }>();

  const useCase = USE_CASES_DATA.find((uc) => uc.id === industry);

  // ROI Calculator state
  const [monthlyVisitors, setMonthlyVisitors] = useState(1000);
  const [supportTeamSize, setSupportTeamSize] = useState(2);
  const [hourlyCost, setHourlyCost] = useState(15);

  const heroRef = useInView();
  const problemRef = useInView(0.2);
  const solutionRef = useInView(0.2);
  const calculatorRef = useInView(0.2);

  if (!useCase) {
    return <Navigate to="/use-cases" replace />;
  }

  const Icon = useCase.icon;

  // ROI Calculations
  const questionsPerVisitor = 0.05; // 5% of visitors ask questions
  const monthlyQuestions = Math.round(monthlyVisitors * questionsPerVisitor);
  const minutesPerQuestion = 5;
  const automationRate = 0.65; // 65% can be automated
  const automatedQuestions = Math.round(monthlyQuestions * automationRate);
  const hoursSaved = Math.round((automatedQuestions * minutesPerQuestion) / 60);
  const moneySaved = hoursSaved * hourlyCost;
  const leadsPerMonth = Math.round(monthlyVisitors * 0.02 * 1.5); // 2% lead rate, 50% increase

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
            "relative max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            heroRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Back Link */}
          <Link
            to="/use-cases"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            All use cases
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <div>
              {/* Industry badge */}
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6",
                useCase.bgColor,
                useCase.borderColor,
                "border"
              )}>
                <Icon className={cn("h-4 w-4", useCase.color)} />
                <span className={cn("text-sm font-medium", useCase.color)}>{useCase.name}</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
                AI customer service
                <br />
                <span className="text-muted-foreground">for {useCase.name.toLowerCase()}</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {useCase.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12" asChild>
                  <Link to="/demo">
                    Book a free demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12" asChild>
                  <a href="#calculator">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate ROI
                  </a>
                </Button>
              </div>
            </div>

            {/* Stats Card */}
            <div className="p-6 lg:p-8 rounded-xl border border-border bg-card/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                Typical results
              </p>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="font-mono text-3xl lg:text-4xl font-bold text-foreground">
                    {useCase.stats.reduction}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Less tickets</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-3xl lg:text-4xl font-bold text-foreground">
                    {useCase.stats.leadIncrease}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">More leads</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-3xl lg:text-4xl font-bold text-foreground">
                    {useCase.stats.responseTime}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAIN POINTS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32">
        <div 
          ref={problemRef.ref}
          className={cn(
            "max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            problemRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-4">
              The problem
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Challenges you're facing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {useCase.painPoints.map((painPoint, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/5"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4">
                  <AlertCircle className="h-5 w-5 text-rose-400" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{painPoint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOLUTIONS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
        
        <div 
          ref={solutionRef.ref}
          className={cn(
            "relative max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            solutionRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-4">
              The solution
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              How NexaChat helps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {useCase.solutions.map((solution, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{solution}</p>
              </div>
            ))}
          </div>

          {/* Recommended Channels */}
          <div className="mt-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
              Recommended channels for {useCase.name.toLowerCase()}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {useCase.channels.map((channel) => {
                const ChannelIcon = CHANNEL_ICONS[channel];
                return (
                  <div
                    key={channel}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card/50"
                  >
                    {ChannelIcon && <ChannelIcon className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-medium text-foreground">{channel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          ROI CALCULATOR SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="calculator" className="relative py-24 lg:py-32 border-t border-border scroll-mt-28">
        <div 
          ref={calculatorRef.ref}
          className={cn(
            "max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
            calculatorRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
              ROI Calculator
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Calculate your savings
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              See how much time and money NexaChat could save your business.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Inputs */}
            <div className="p-6 lg:p-8 rounded-xl border border-border bg-card/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                Your business
              </p>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-3">
                    <Label className="text-sm text-foreground">Monthly website visitors</Label>
                    <span className="font-mono text-sm font-semibold text-primary">{monthlyVisitors.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[monthlyVisitors]}
                    onValueChange={(value) => setMonthlyVisitors(value[0])}
                    min={100}
                    max={50000}
                    step={100}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <Label className="text-sm text-foreground">Support team size</Label>
                    <span className="font-mono text-sm font-semibold text-primary">{supportTeamSize}</span>
                  </div>
                  <Slider
                    value={[supportTeamSize]}
                    onValueChange={(value) => setSupportTeamSize(value[0])}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <Label className="text-sm text-foreground">Average hourly cost</Label>
                    <span className="font-mono text-sm font-semibold text-primary">${hourlyCost}</span>
                  </div>
                  <Slider
                    value={[hourlyCost]}
                    onValueChange={(value) => setHourlyCost(value[0])}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-6 lg:p-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                Estimated savings
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-muted-foreground">Hours saved/month</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-foreground">{hoursSaved}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-muted-foreground">Money saved/month</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-emerald-400">${moneySaved.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-violet-400" />
                    <span className="text-sm text-muted-foreground">Leads captured/month</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-foreground">{leadsPerMonth}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-muted-foreground">Questions automated</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-foreground">{automatedQuestions}/mo</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Annual savings</span>
                </div>
                <p className="font-mono text-3xl font-bold text-foreground">
                  ${(moneySaved * 12).toLocaleString()}
                </p>
              </div>
            </div>
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
            Get started
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Transform your {useCase.name.toLowerCase()} support
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Join other {useCase.name.toLowerCase()} businesses using NexaChat to automate
            customer service and capture more leads.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/demo">
                Book your free demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8" asChild>
              <Link to="/">
                Try interactive demo
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Live in 24 hours</span>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
