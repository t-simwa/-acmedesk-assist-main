import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Brain, MessageSquare, Users, Globe, BarChart3, Settings,
  Check, X, ArrowRight, Zap, Shield, Database, Workflow,
  Bot, Headphones, FileText, Clock, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURES PAGE
   Deep-dive into capabilities with sticky sidebar navigation
   Clean, technical presentation for both business and technical buyers
   ═══════════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    icon: Brain,
    title: "RAG-Powered Knowledge Base",
    subtitle: "Your documents become intelligent, searchable AI context",
    description: "Unlike generic chatbots that hallucinate or give generic responses, NexaChat uses Retrieval-Augmented Generation (RAG) to ground every response in your actual content. Upload your documents, and the AI retrieves relevant passages before generating answers.",
    capabilities: [
      "PDF, DOCX, TXT, and website content support",
      "Automatic semantic chunking and embedding",
      "Real-time document syncing",
      "Source citations in every response",
      "Multi-document context retrieval",
      "Vector search with 99.9% recall",
    ],
    technical: "Built on OpenAI embeddings with Pinecone vector storage. Documents are processed using semantic chunking algorithms that preserve context boundaries, not arbitrary character limits.",
  },
  {
    id: "chat-experience",
    label: "Chat Experience",
    icon: MessageSquare,
    title: "Conversational AI That Feels Human",
    subtitle: "Natural language understanding with full context awareness",
    description: "Your customers interact with an AI that maintains conversation context, understands nuance, and provides helpful responses. The widget is fully customizable to match your brand identity.",
    capabilities: [
      "Real-time streaming responses",
      "Conversation memory and context",
      "Custom branding and styling",
      "Typing indicators",
      "Rich media support",
      "Suggested replies and quick actions",
    ],
    technical: "Powered by GPT-4o with custom system prompts. Streaming enabled for sub-200ms time-to-first-token. Conversation context maintained in session with configurable memory limits.",
  },
  {
    id: "lead-capture",
    label: "Lead Capture",
    icon: Users,
    title: "Automatic Lead Detection & Capture",
    subtitle: "Turn conversations into qualified leads",
    description: "NexaChat automatically identifies buying signals and captures contact information during natural conversation. Get instant notifications and export leads to your CRM.",
    capabilities: [
      "Intent-based lead detection",
      "Custom qualification questions",
      "Real-time notifications",
      "Lead scoring",
      "CRM export (CSV, API)",
      "Conversation history per lead",
    ],
    technical: "Lead detection uses fine-tuned classification models to identify purchase intent, urgency signals, and qualification criteria. Webhook integrations available for real-time CRM sync.",
  },
  {
    id: "omnichannel",
    label: "Omnichannel",
    icon: Globe,
    title: "One AI Across Every Channel",
    subtitle: "Unified experience on web, WhatsApp, Instagram, and more",
    description: "Deploy your AI assistant everywhere your customers are. One knowledge base, one conversation history, one unified inbox. Customers can switch channels without losing context.",
    capabilities: [
      "Website chat widget",
      "WhatsApp Business API",
      "Instagram Direct Messages",
      "Facebook Messenger",
      "Email integration",
      "SMS support",
    ],
    technical: "All channels connect to a unified conversation engine via standardized message format. Channel-specific features (reactions, media) are normalized while preserving rich functionality.",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    title: "Actionable Conversation Intelligence",
    subtitle: "Understand what your customers are asking",
    description: "Go beyond vanity metrics. Discover the questions your customers ask, identify gaps in your knowledge base, and measure your chatbot's real business impact.",
    capabilities: [
      "Conversation volume trends",
      "Top questions and topics",
      "Resolution rate tracking",
      "Response time analytics",
      "Lead conversion metrics",
      "Knowledge gap detection",
    ],
    technical: "Analytics computed in real-time with hourly rollups for historical queries. Topic clustering uses BERTopic for automatic categorization. Export via API or scheduled reports.",
  },
  {
    id: "admin",
    label: "Admin Dashboard",
    icon: Settings,
    title: "Complete Control, Zero Complexity",
    subtitle: "Manage everything from one intuitive dashboard",
    description: "Upload documents, customize your chatbot, manage your team, review conversations, and track performance. No technical knowledge required.",
    capabilities: [
      "Team management with roles",
      "Conversation inbox with takeover",
      "Document management",
      "Chatbot personality config",
      "Widget customization",
      "API keys and integrations",
    ],
    technical: "Role-based access control (Owner, Admin, Agent) with full audit logging. All mutations are tracked for compliance. REST and webhook APIs for automation.",
  },
];

const COMPARISON = [
  { feature: "RAG Knowledge Base", nexachat: true, intercom: false, manychat: false, tidio: false, custom: true },
  { feature: "Document Upload (PDF, DOCX)", nexachat: true, intercom: false, manychat: false, tidio: false, custom: true },
  { feature: "GPT-4o Powered", nexachat: true, intercom: "Add-on", manychat: false, tidio: "Add-on", custom: true },
  { feature: "WhatsApp Integration", nexachat: true, intercom: true, manychat: true, tidio: true, custom: true },
  { feature: "Lead Capture & CRM", nexachat: true, intercom: true, manychat: true, tidio: true, custom: true },
  { feature: "Human Escalation", nexachat: true, intercom: true, manychat: true, tidio: true, custom: true },
  { feature: "Setup Time", nexachat: "24 hours", intercom: "1-2 weeks", manychat: "2-3 days", tidio: "1 week", custom: "2-6 months" },
  { feature: "Technical Knowledge", nexachat: "None", intercom: "Low", manychat: "Medium", tidio: "Low", custom: "High" },
  { feature: "Starting Price", nexachat: "$99/mo", intercom: "$74/mo", manychat: "$15/mo", tidio: "$29/mo", custom: "$10,000+" },
];

// Hook for active section tracking
function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  return activeSection;
}

export default function Features() {
  const sectionIds = [...FEATURES.map((f) => f.id), "comparison"];
  const activeSection = useActiveSection(sectionIds);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Features
            </p>
            <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Everything you need to automate customer service
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed font-description">
              Powerful features designed for businesses that want exceptional support
              without the overhead. No technical knowledge required.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-16">
            {/* Sticky Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <nav className="space-y-1">
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isActive = activeSection === feature.id;
                    return (
                      <button
                        key={feature.id}
                        onClick={() => scrollToSection(feature.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{feature.label}</span>
                      </button>
                    );
                  })}
                  <div className="h-px bg-border my-3" />
                  <button
                    onClick={() => scrollToSection("comparison")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                      activeSection === "comparison"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Workflow className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Comparison</span>
                  </button>
                </nav>

                {/* CTA Card */}
                <div className="mt-8 p-5 rounded-xl border border-border bg-card">
                  <h4 className="font-heading font-semibold text-sm text-foreground mb-2">
                    Ready to get started?
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Book a free demo and see these features in action.
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <Link to="/demo">Book demo</Link>
                  </Button>
                </div>
              </div>
            </aside>

            {/* Feature Sections */}
            <div className="space-y-24 lg:space-y-32">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <section
                    key={feature.id}
                    id={feature.id}
                    className="scroll-mt-28"
                  >
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                      {/* Content */}
                      <div className={cn(index % 2 === 1 && "lg:order-2")}>
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                          <Icon className="h-4 w-4" />
                          {feature.label}
                        </div>
                        <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-3">
                          {feature.title}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                          {feature.subtitle}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                          {feature.description}
                        </p>

                        {/* Capabilities */}
                        <ul className="space-y-3 mb-8">
                          {feature.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-emerald-500" />
                              </div>
                              <span className="text-sm text-foreground">{cap}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Technical Note */}
                        <div className="p-4 rounded-xl bg-accent/50 border border-border">
                          <div className="flex items-start gap-3">
                            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                                Technical
                              </span>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {feature.technical}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Visual */}
                      <div className={cn(index % 2 === 1 && "lg:order-1")}>
                        <div className="aspect-[4/3] rounded-2xl border border-border bg-card overflow-hidden">
                          <div className="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                          </div>
                          <div className="p-8 flex flex-col items-center justify-center h-[calc(100%-32px)]">
                            <Icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-xs text-muted-foreground">
                              {feature.label} Interface
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}

              {/* Comparison Section */}
              <section id="comparison" className="scroll-mt-28">
                <div className="text-center mb-12">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Comparison
                  </p>
                  <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-3">
                    How NexaChat compares
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    See how we stack up against alternatives.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                          Feature
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-primary">
                          NexaChat
                        </th>
                        <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                          Intercom
                        </th>
                        <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                          ManyChat
                        </th>
                        <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                          Tidio
                        </th>
                        <th className="text-center py-4 px-4 font-medium text-muted-foreground">
                          Custom Dev
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-4 px-4 text-foreground">
                            {row.feature}
                          </td>
                          {[row.nexachat, row.intercom, row.manychat, row.tidio, row.custom].map((val, j) => (
                            <td key={j} className="text-center py-4 px-4">
                              {typeof val === "boolean" ? (
                                val ? (
                                  <Check className={cn(
                                    "h-4 w-4 mx-auto",
                                    j === 0 ? "text-emerald-500" : "text-muted-foreground"
                                  )} />
                                ) : (
                                  <X className="h-4 w-4 mx-auto text-muted-foreground/50" />
                                )
                              ) : (
                                <span className={cn(
                                  j === 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>
                                  {val}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
            Ready to see these features in action?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-description">
            Book a free demo and we'll show you exactly how NexaChat can work for your business.
          </p>
          <Button size="lg" className="h-12 px-8" asChild>
            <Link to="/demo">
              Book your free demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
