import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, ArrowRight, Search, User, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   BLOG INDEX PAGE
   Clean, content-focused design with category filtering
   
   Design principles:
   - Typography-first hierarchy
   - Cards that breathe with generous whitespace
   - Subtle interactions that feel intentional
   - Content density that guides the eye
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

// Blog post categories
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "guides", label: "Guides" },
  { id: "case-studies", label: "Case Studies" },
  { id: "industry", label: "Industry" },
  { id: "product", label: "Product" },
  { id: "ai", label: "AI & Tech" },
];

// Blog posts data (static for now, per spec)
export const BLOG_POSTS = [
  {
    slug: "what-is-rag",
    title: "What is RAG? A Complete Guide to Retrieval-Augmented Generation",
    excerpt: "Discover how RAG technology powers modern AI chatbots and why it's the key to accurate, contextual responses based on your business documents.",
    category: "ai",
    author: "Ted Simwa",
    date: "2026-02-28",
    readTime: "8 min",
    featured: true,
    image: "/blog/rag-guide.jpg",
    content: `
# What is RAG? A Complete Guide to Retrieval-Augmented Generation

RAG, or Retrieval-Augmented Generation, is a technique that combines the power of large language models with the accuracy of information retrieval systems...

## Why RAG Matters for Your Business

Traditional chatbots rely on pre-programmed responses or general AI knowledge. RAG changes the game by allowing AI to search through your specific documents and data before generating a response...

## How NexaChat Uses RAG

When a customer asks a question, NexaChat doesn't just guess or use generic responses. Instead, it:

1. Searches your uploaded documents for relevant information
2. Retrieves the most pertinent passages
3. Uses that context to generate an accurate, helpful response
4. Cites the source so customers know where the information came from

This means your chatbot can answer questions about your specific products, services, policies, and procedures — not just generic information.

## The Technical Side (Simplified)

For the technically curious: RAG works by converting your documents into numerical representations (embeddings) and storing them in a vector database. When a question comes in, it's also converted to an embedding, and the system finds the most similar document passages. These passages are then fed to the language model along with the question, enabling accurate, contextual responses.

## Real-World Impact

Businesses using RAG-powered chatbots see:
- 90%+ accuracy on domain-specific questions
- 60% reduction in support tickets
- Significantly higher customer satisfaction

Want to see RAG in action for your business? [Book a demo](/demo) and we'll show you how NexaChat can be trained on your documents.
    `,
  },
  {
    slug: "nairobi-cleaning-company-case-study",
    title: "How a Nairobi Cleaning Company Reduced Support Time by 60%",
    excerpt: "A real case study showing how a local cleaning service transformed their customer support with an AI chatbot trained on their services and pricing.",
    category: "case-studies",
    author: "Ted Simwa",
    date: "2026-02-21",
    readTime: "5 min",
    featured: false,
    image: "/blog/case-study-cleaning.jpg",
    content: `
# How a Nairobi Cleaning Company Reduced Support Time by 60%

When CleanPro Nairobi came to us, they were drowning in WhatsApp messages. Their team of 3 was spending 4+ hours daily answering the same questions...

## The Challenge

- 100+ WhatsApp messages daily
- Same 15 questions asked repeatedly
- Leads lost after business hours
- Staff burned out from repetitive inquiries

## The Solution

We deployed a NexaChat chatbot trained on:
- Service packages and pricing
- Availability and booking procedures
- FAQs about cleaning products used
- Service area coverage

## The Results (After 30 Days)

- **60% reduction** in manual support time
- **45 leads captured** outside business hours
- **4.8/5 customer satisfaction** rating
- Staff now focuses on service delivery, not answering messages

## Key Takeaways

1. Even "simple" businesses have complex FAQ needs
2. WhatsApp integration is essential for local businesses
3. 24/7 availability captures leads competitors miss

Ready to achieve similar results? [Book a demo](/demo) today.
    `,
  },
  {
    slug: "whatsapp-business-ai-guide",
    title: "WhatsApp Business AI: The Complete Guide for 2026",
    excerpt: "Everything you need to know about integrating AI chatbots with WhatsApp Business, from setup to best practices for customer engagement.",
    category: "guides",
    author: "Ted Simwa",
    date: "2026-02-14",
    readTime: "10 min",
    featured: false,
    image: "/blog/whatsapp-ai.jpg",
    content: `
# WhatsApp Business AI: The Complete Guide for 2026

WhatsApp has over 2 billion users worldwide. For businesses, it's become the primary channel for customer communication in many markets...
    `,
  },
  {
    slug: "5-signs-business-needs-ai-chatbot",
    title: "5 Signs Your Business Needs an AI Chatbot",
    excerpt: "Not sure if an AI chatbot is right for you? Here are five clear indicators that your business could benefit from automated customer service.",
    category: "guides",
    author: "Ted Simwa",
    date: "2026-02-07",
    readTime: "6 min",
    featured: false,
    image: "/blog/signs-chatbot.jpg",
    content: `
# 5 Signs Your Business Needs an AI Chatbot

## 1. You're Answering the Same Questions Over and Over

If your team spends significant time responding to repetitive inquiries, an AI chatbot can handle these instantly...

## 2. You're Missing After-Hours Inquiries

Customers don't stop having questions at 5pm...

## 3. Your Support Team is Overwhelmed

When response times slip and quality suffers...

## 4. You're Losing Leads to Competitors

Speed matters in sales...

## 5. You Want to Scale Without Hiring

Growing without proportionally growing support costs...
    `,
  },
  {
    slug: "rag-vs-fine-tuning",
    title: "RAG vs Fine-Tuning: Which is Better for Your AI Chatbot?",
    excerpt: "A technical comparison of two approaches to customizing AI chatbots, with practical recommendations for different use cases.",
    category: "ai",
    author: "Ted Simwa",
    date: "2026-01-31",
    readTime: "7 min",
    featured: false,
    image: "/blog/rag-vs-finetuning.jpg",
    content: `
# RAG vs Fine-Tuning: Which is Better for Your AI Chatbot?

When it comes to customizing AI for your business, two main approaches dominate: RAG and fine-tuning. Here's how they compare...
    `,
  },
  {
    slug: "train-ai-business-documents",
    title: "How to Train AI on Your Business Documents",
    excerpt: "A step-by-step guide to preparing and uploading your documents for AI training, including best practices for optimal results.",
    category: "guides",
    author: "Ted Simwa",
    date: "2026-01-24",
    readTime: "8 min",
    featured: false,
    image: "/blog/train-ai.jpg",
    content: `
# How to Train AI on Your Business Documents

Getting your AI chatbot to understand your business starts with proper document preparation...
    `,
  },
  {
    slug: "cost-unanswered-questions",
    title: "The Real Cost of Unanswered Customer Questions",
    excerpt: "Breaking down the hidden costs of slow or missing customer support, from lost sales to damaged reputation.",
    category: "industry",
    author: "Ted Simwa",
    date: "2026-01-17",
    readTime: "5 min",
    featured: false,
    image: "/blog/cost-questions.jpg",
    content: `
# The Real Cost of Unanswered Customer Questions

Every unanswered question represents potential lost revenue. Let's quantify the impact...
    `,
  },
  {
    slug: "ai-customer-service-law-firms",
    title: "AI Customer Service for Law Firms: A Practical Guide",
    excerpt: "How law firms can use AI chatbots to qualify leads, schedule consultations, and answer common legal FAQs while maintaining compliance.",
    category: "industry",
    author: "Ted Simwa",
    date: "2026-01-10",
    readTime: "9 min",
    featured: false,
    image: "/blog/law-firms-ai.jpg",
    content: `
# AI Customer Service for Law Firms: A Practical Guide

Law firms face unique challenges when it comes to client communication. Here's how AI can help...
    `,
  },
];

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  guides: "text-emerald-400",
  "case-studies": "text-amber-400",
  industry: "text-violet-400",
  product: "text-blue-400",
  ai: "text-rose-400",
};

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const heroRef = useInView();
  const featuredRef = useInView(0.2);
  const gridRef = useInView(0.1);

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = BLOG_POSTS.find((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
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
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary mb-4 tracking-wide">
              Blog
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-4">
              Insights & Ideas
            </h1>
            <p className="text-lg text-muted-foreground">
              Practical guides, case studies, and thoughts on AI, 
              customer service, and building better businesses.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FILTER BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pb-12">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background border-border focus:border-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURED POST
          ═══════════════════════════════════════════════════════════════════════ */}
      {featuredPost && selectedCategory === "all" && searchQuery === "" && (
        <section className="pb-16">
          <div 
            ref={featuredRef.ref}
            className={cn(
              "max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700",
              featuredRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Link to={`/blog/${featuredPost.slug}`} className="block group">
              <article className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center p-6 sm:p-8 lg:p-10 rounded-2xl border border-border bg-card/50 hover:border-primary/20 hover:bg-card transition-all">
                {/* Image placeholder */}
                <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📚</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Featured</span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                      Featured
                    </span>
                    <span className={cn("text-sm font-medium capitalize", CATEGORY_COLORS[featuredPost.category] || "text-muted-foreground")}>
                      {featuredPost.category.replace("-", " ")}
                    </span>
                  </div>
                  
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h2>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-[10px] font-bold text-white">
                        TS
                      </div>
                      <span>{featuredPost.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(featuredPost.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{featuredPost.readTime}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          POSTS GRID
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-24 lg:pb-32">
        <div 
          ref={gridRef.ref}
          className={cn(
            "max-w-[1400px] mx-auto px-6 lg:px-8 transition-all duration-700 delay-100",
            gridRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {regularPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {regularPosts.map((post, index) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <article className="h-full flex flex-col rounded-xl border border-border bg-card/30 overflow-hidden hover:border-primary/20 hover:bg-card/50 transition-all">
                    {/* Image placeholder */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center border-b border-border">
                      <span className="text-2xl opacity-50">
                        {post.category === "guides" && "📖"}
                        {post.category === "case-studies" && "📊"}
                        {post.category === "industry" && "🏢"}
                        {post.category === "product" && "🚀"}
                        {post.category === "ai" && "🤖"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 sm:p-6 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("text-xs font-medium capitalize", CATEGORY_COLORS[post.category] || "text-muted-foreground")}>
                          {post.category.replace("-", " ")}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-xs text-muted-foreground">
                          {post.readTime}
                        </span>
                      </div>
                      
                      <h3 className="font-heading text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.date)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                          Read
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No posts found matching your criteria.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Ready to get started?
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            See these ideas in action
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Book a free demo and see how NexaChat can transform 
            your customer support.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/demo">
                Book a demo
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
