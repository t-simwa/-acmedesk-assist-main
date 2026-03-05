import { Link } from "react-router-dom";
import { ArrowRight, Award, GraduationCap, Code, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/* ═══════════════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   Personal story, credentials, values, and tech stack
   ═══════════════════════════════════════════════════════════════════════════════ */

const CREDENTIALS = [
  { title: "IBM RAG Certification", issuer: "IBM", icon: Award },
  { title: "IBM Full Stack Developer", issuer: "IBM", icon: Code },
  { title: "BS Computer Science", issuer: "Africa Nazarene University • Dean's List", icon: GraduationCap },
];

const VALUES = [
  {
    title: "Transparency",
    description: "No hidden fees. No surprise charges. You know exactly what you're paying for.",
  },
  {
    title: "Quality",
    description: "Every chatbot is carefully configured and tested to represent your business perfectly.",
  },
  {
    title: "Results",
    description: "We measure success by your metrics: leads captured, time saved, customers satisfied.",
  },
];

const TECH = [
  "React", "TypeScript", "Node.js", "OpenAI GPT-4o", "Pinecone", 
  "Supabase", "Vercel", "Stripe", "SendGrid", "Twilio",
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                About
              </p>
              <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Hi, I'm Ted Simwa
              </h1>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed font-description">
                I'm a software engineer and AI specialist based in Nairobi, Kenya.
                I built NexaChat to solve a problem I saw businesses struggling with:
                providing great customer service without burning out their teams.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                After years of building software solutions, I realized most businesses
                don't need complex enterprise chatbots. They need something simple,
                powerful, and actually trained on their business—not generic templates.
              </p>
              <Button size="lg" asChild>
                <Link to="/demo">
                  Let's talk
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-violet-600/10 border border-border p-1">
                <div className="w-full h-full rounded-xl bg-card flex items-center justify-center">
                  <span className="text-7xl font-bold font-heading bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent">
                    TS
                  </span>
                </div>
              </div>
              {/* Badges */}
              <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-lg bg-card border border-border shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-foreground">Available for projects</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-lg bg-card border border-border shadow-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Nairobi, Kenya</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-8">
            The NexaChat Story
          </h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-6">
              It started with a frustrating experience. I was helping a local law firm
              with their website, and they kept losing potential clients because no one
              was available to answer questions after hours. They tried hiring more staff,
              but the cost was unsustainable. They tried generic chatbots, but customers
              hated them.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              That's when I had the idea: what if a chatbot could actually be trained on
              a business's documents? Not keyword matching, but truly understanding content
              and providing accurate, helpful answers.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              I spent months building the prototype, learning about RAG, and testing with
              real businesses. The results were incredible—support queries dropped by 60%,
              leads increased, and staff could focus on high-value work. Today, NexaChat
              helps businesses across industries provide 24/7 customer service that's
              actually helpful.
            </p>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-24 bg-accent/30 border-y border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">
            Credentials
          </p>
          <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-12 text-center">
            Background & Certifications
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {CREDENTIALS.map((cred, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card">
                <cred.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  {cred.title}
                </h3>
                <p className="text-sm text-muted-foreground">{cred.issuer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">
            Values
          </p>
          <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-12 text-center">
            What I stand for
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {VALUES.map((value, i) => (
              <div key={i} className="text-center">
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">
            Technology
          </p>
          <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Built with modern tech
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {TECH.map((tech, i) => (
              <span
                key={i}
                className="px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6">
            Let's build something great together
          </h2>
          <p className="text-lg text-muted-foreground mb-8 font-description">
            Have questions? Want to discuss a custom solution? I'd love to hear from you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/demo">
                Book a demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contact me</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
