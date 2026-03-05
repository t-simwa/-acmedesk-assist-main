import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mail, Linkedin, Calendar, MapPin, Clock, Send,
  ArrowRight, Check, Loader2, Building2, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONTACT PAGE
   Clean, intentional design with split layout
   
   Design principles:
   - Generous whitespace with clear visual hierarchy
   - Form as the focal point, not competing elements
   - Subtle animations that feel crafted
   - Muted palette with precise accent usage
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

// Industry options for dropdown
const INDUSTRIES = [
  "E-Commerce",
  "Legal Services",
  "Real Estate",
  "Healthcare",
  "SaaS / Technology",
  "Service Business",
  "Education",
  "Finance",
  "Other",
];

// Contact methods
const CONTACT_METHODS = [
  {
    icon: Mail,
    title: "Email",
    value: "hello@nexachat.ai",
    href: "mailto:hello@nexachat.ai",
    description: "General inquiries",
  },
  {
    icon: Linkedin,
    title: "LinkedIn",
    value: "Connect with Ted",
    href: "https://linkedin.com/in/tedsimwa",
    description: "Professional network",
  },
  {
    icon: Calendar,
    title: "Schedule",
    value: "Book a 15-min call",
    href: "/demo",
    description: "Free consultation",
  },
];

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    industry: "",
    message: "",
    challenge: "",
    honeypot: "", // Spam protection
  });

  const heroRef = useInView();
  const formRef = useInView(0.2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (formData.honeypot) {
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
            Get in touch
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Let's build something
            <br />
            <span className="text-muted-foreground">great together</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Have questions about NexaChat? Want to discuss a custom solution? 
            I'd love to hear from you.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT - Split Layout
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pb-24 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div 
            ref={formRef.ref}
            className={cn(
              "grid lg:grid-cols-5 gap-12 lg:gap-16 transition-all duration-700 delay-100",
              formRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Left Column - Contact Info (2/5 width) */}
            <div className="lg:col-span-2 space-y-10">
              {/* Availability */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-400">
                    Currently accepting new clients
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I typically respond within 24 hours. For faster responses, 
                  book a call directly on my calendar.
                </p>
              </div>

              {/* Contact Methods */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Reach out directly
                </p>
                {CONTACT_METHODS.map((method, index) => {
                  const Icon = method.icon;
                  const isExternal = method.href.startsWith("http");
                  const Component = isExternal ? "a" : Link;

                  return (
                    <Component
                      key={index}
                      to={!isExternal ? method.href : undefined}
                      href={isExternal ? method.href : undefined}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {method.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Component>
                  );
                })}
              </div>

              {/* Location & Response Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card/30">
                  <MapPin className="h-4 w-4 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Location</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nairobi, Kenya
                  </p>
                  <p className="text-xs text-primary mt-0.5">
                    Available globally
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/30">
                  <Clock className="h-4 w-4 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Response</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usually within
                  </p>
                  <p className="text-xs text-primary mt-0.5">
                    24 hours
                  </p>
                </div>
              </div>

              {/* Social proof */}
              <div className="pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[
                      { initials: "JD", bg: "bg-violet-500" },
                      { initials: "MK", bg: "bg-emerald-500" },
                      { initials: "AS", bg: "bg-amber-500" },
                    ].map((avatar, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background",
                          avatar.bg
                        )}
                      >
                        {avatar.initials}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Join 50+ businesses</p>
                    <p className="text-xs text-muted-foreground">using NexaChat today</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form (3/5 width) */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8 lg:p-10">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                      <Check className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-foreground mb-3">
                      Message sent
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                      Thanks for reaching out. I'll get back to you within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({
                          name: "",
                          email: "",
                          company: "",
                          industry: "",
                          message: "",
                          challenge: "",
                          honeypot: "",
                        });
                      }}
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-foreground">
                          Name <span className="text-muted-foreground">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          placeholder="Your name"
                          className="h-11 bg-background border-border focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email <span className="text-muted-foreground">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="you@company.com"
                          className="h-11 bg-background border-border focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium text-foreground">
                          Company
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="company"
                            name="company"
                            value={formData.company}
                            onChange={handleInputChange}
                            placeholder="Your company"
                            className="h-11 pl-10 bg-background border-border focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry" className="text-sm font-medium text-foreground">
                          Industry
                        </Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, industry: value }))
                          }
                        >
                          <SelectTrigger className="h-11 bg-background border-border focus:border-primary">
                            <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry.toLowerCase()}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium text-foreground">
                        Message <span className="text-muted-foreground">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        placeholder="How can I help you?"
                        rows={4}
                        className="bg-background border-border focus:border-primary resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="challenge" className="text-sm font-medium text-foreground">
                        What's your main customer service challenge?
                      </Label>
                      <Textarea
                        id="challenge"
                        name="challenge"
                        value={formData.challenge}
                        onChange={handleInputChange}
                        placeholder="e.g., Too many repetitive questions, no after-hours support, missing leads..."
                        rows={3}
                        className="bg-background border-border focus:border-primary resize-none"
                      />
                    </div>

                    {/* Honeypot field - hidden from users */}
                    <div className="hidden" aria-hidden="true">
                      <Input
                        name="honeypot"
                        value={formData.honeypot}
                        onChange={handleInputChange}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send message
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By submitting this form, you agree to our{" "}
                      <Link to="/privacy-policy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          ALTERNATIVE CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Ready to get started?
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Prefer to see a demo first?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Book a free 15-minute call and see NexaChat in action. 
            No pressure, no obligations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/demo">
                Book a demo
                <Calendar className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8" asChild>
              <Link to="/features">
                Explore features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
