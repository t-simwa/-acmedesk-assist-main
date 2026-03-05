import { useParams, Link, Navigate } from "react-router-dom";
import {
  Calendar, Clock, ArrowLeft, ArrowRight,
  Twitter, Linkedin, Link as LinkIcon, Check,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BLOG_POSTS } from "./Blog";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   BLOG POST PAGE
   Clean reading experience with sticky TOC
   
   Design principles:
   - Content-first with generous typography
   - Sticky sidebar that adds value without distraction
   - Subtle animations for engagement
   - Clear hierarchy with muted accents
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

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  guides: "text-emerald-400 bg-emerald-500/10",
  "case-studies": "text-amber-400 bg-amber-500/10",
  industry: "text-violet-400 bg-violet-500/10",
  product: "text-blue-400 bg-blue-500/10",
  ai: "text-rose-400 bg-rose-500/10",
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState("");

  const headerRef = useInView();

  const post = BLOG_POSTS.find((p) => p.slug === slug);

  // Track active heading on scroll
  useEffect(() => {
    if (!post) return;
    
    const handleScroll = () => {
      const headingElements = document.querySelectorAll("h2[id]");
      let current = "";
      
      headingElements.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 150) {
          current = heading.id;
        }
      });
      
      setActiveHeading(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  // Get related posts (same category, excluding current)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 3);

  // If not enough related posts, fill with other posts
  const additionalPosts = relatedPosts.length < 3
    ? BLOG_POSTS.filter((p) => p.slug !== post.slug && !relatedPosts.includes(p)).slice(0, 3 - relatedPosts.length)
    : [];

  const allRelatedPosts = [...relatedPosts, ...additionalPosts];

  // Extract headings for TOC
  const headings = post.content
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => ({
      text: line.replace("## ", ""),
      id: line.replace("## ", "").toLowerCase().replace(/\s+/g, "-"),
    }));

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(post.title);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const categoryClass = CATEGORY_COLORS[post.category] || "text-primary bg-primary/10";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          ARTICLE HEADER
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
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>

          {/* Category */}
          <div className="flex items-center gap-3 mb-6">
            <span className={cn("px-3 py-1 text-xs font-semibold rounded-full capitalize", categoryClass)}>
              {post.category.replace("-", " ")}
            </span>
            <span className="text-sm text-muted-foreground">
              {post.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-xs font-bold text-white">
                TS
              </div>
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(post.date)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT WITH SIDEBAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_280px] gap-12 lg:gap-16">
            {/* Article Content */}
            <article className="max-w-3xl">
              {/* Prose Content */}
              <div className="prose-content">
                {post.content.split("\n").map((line, index) => {
                  if (line.startsWith("# ")) {
                    return null; // Skip H1, we have it above
                  }
                  if (line.startsWith("## ")) {
                    const text = line.replace("## ", "");
                    const id = text.toLowerCase().replace(/\s+/g, "-");
                    return (
                      <h2 
                        key={index} 
                        id={id} 
                        className="font-heading text-2xl font-bold text-foreground mt-12 mb-4 scroll-mt-28"
                      >
                        {text}
                      </h2>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h3 key={index} className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">
                        {line.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("- **")) {
                    const match = line.match(/- \*\*(.+?)\*\* (.+)/);
                    if (match) {
                      return (
                        <li key={index} className="text-muted-foreground ml-4 mb-2 list-disc">
                          <span className="font-semibold text-foreground">{match[1]}</span> {match[2]}
                        </li>
                      );
                    }
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <li key={index} className="text-muted-foreground ml-4 mb-2 list-disc">
                        {line.replace("- ", "")}
                      </li>
                    );
                  }
                  if (line.match(/^\d+\./)) {
                    return (
                      <li key={index} className="text-muted-foreground ml-4 mb-2 list-decimal">
                        {line.replace(/^\d+\.\s*/, "")}
                      </li>
                    );
                  }
                  if (line.trim() === "") {
                    return <div key={index} className="h-4" />;
                  }
                  // Handle links in text
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                  if (linkRegex.test(line)) {
                    const segments: React.ReactNode[] = [];
                    let lastIndex = 0;
                    let match;
                    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
                    
                    while ((match = regex.exec(line)) !== null) {
                      if (match.index > lastIndex) {
                        segments.push(line.slice(lastIndex, match.index));
                      }
                      segments.push(
                        <Link 
                          key={match.index} 
                          to={match[2]} 
                          className="text-primary hover:underline"
                        >
                          {match[1]}
                        </Link>
                      );
                      lastIndex = match.index + match[0].length;
                    }
                    if (lastIndex < line.length) {
                      segments.push(line.slice(lastIndex));
                    }
                    
                    return (
                      <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                        {segments}
                      </p>
                    );
                  }
                  return (
                    <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                      {line}
                    </p>
                  );
                })}
              </div>

              {/* Mid-Article CTA */}
              <div className="my-16 p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  Ready to see this in action?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Book a free 15-minute demo and discover how NexaChat can transform
                  your customer support.
                </p>
                <Button asChild>
                  <Link to="/demo">
                    Book your free demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Author Box */}
              <div className="mt-16 p-6 rounded-xl border border-border bg-card/50">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                    TS
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Written by
                    </p>
                    <h4 className="font-heading font-semibold text-lg text-foreground mb-2">
                      Ted Simwa
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Founder & Lead Developer at NexaChat. AI specialist helping businesses 
                      automate customer support. IBM certified in RAG and full-stack development.
                    </p>
                  </div>
                </div>
              </div>

              {/* Share Buttons - Mobile */}
              <div className="mt-8 pt-8 border-t border-border lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Share this article
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="w-10 h-10 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </article>

            {/* Sticky Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-8">
                {/* Table of Contents */}
                {headings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      On this page
                    </p>
                    <nav className="space-y-1">
                      {headings.map((heading, index) => (
                        <a
                          key={index}
                          href={`#${heading.id}`}
                          className={cn(
                            "block text-sm py-1.5 pl-3 border-l-2 transition-colors",
                            activeHeading === heading.id
                              ? "text-foreground border-primary"
                              : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/50"
                          )}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Share */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Share
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <Twitter className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CTA Card */}
                <div className="p-5 rounded-xl border border-border bg-card/50">
                  <h4 className="font-heading font-semibold text-foreground mb-2">
                    Transform your support
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    See how NexaChat can automate your customer service.
                  </p>
                  <Button className="w-full" size="sm" asChild>
                    <Link to="/demo">Book demo</Link>
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          RELATED POSTS
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Continue reading
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-10">
            Related articles
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {allRelatedPosts.map((relatedPost) => {
              const relatedCategoryClass = CATEGORY_COLORS[relatedPost.category] || "text-primary";
              
              return (
                <Link
                  key={relatedPost.slug}
                  to={`/blog/${relatedPost.slug}`}
                  className="group"
                >
                  <article className="h-full flex flex-col rounded-xl border border-border bg-card/30 overflow-hidden hover:border-primary/20 hover:bg-card/50 transition-all">
                    {/* Image placeholder */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center border-b border-border">
                      <span className="text-2xl opacity-50">
                        {relatedPost.category === "guides" && "📖"}
                        {relatedPost.category === "case-studies" && "📊"}
                        {relatedPost.category === "industry" && "🏢"}
                        {relatedPost.category === "product" && "🚀"}
                        {relatedPost.category === "ai" && "🤖"}
                      </span>
                    </div>
                    
                    <div className="flex-1 p-5 flex flex-col">
                      <span className={cn("text-xs font-medium mb-2 capitalize", relatedCategoryClass.split(" ")[0])}>
                        {relatedPost.category.replace("-", " ")}
                      </span>
                      <h3 className="font-heading text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-auto">
                        {relatedPost.readTime}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
        
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Ready to get started?
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Transform your customer support
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Join hundreds of businesses using NexaChat to automate 
            customer service and capture more leads.
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
