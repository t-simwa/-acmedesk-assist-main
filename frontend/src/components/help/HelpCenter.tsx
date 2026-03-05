import { useState } from "react";
import { 
  BookOpen, FileText, BarChart3, MessageSquare, Settings, HelpCircle, 
  ExternalLink, Mail, Calendar, MessageCircle, Search, ChevronRight,
  ThumbsUp, ThumbsDown, Clock, CheckCircle2, ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  readTime: string;
  lastUpdated: string;
}

const helpArticles: HelpArticle[] = [
  { id: "getting-started", title: "How to upload your first document", category: "getting-started", content: "Learn how to upload your first document to the knowledge base...", readTime: "3 min", lastUpdated: "Jan 15, 2026" },
  { id: "configure-chatbot", title: "How to configure your chatbot", category: "getting-started", content: "Configure your chatbot settings and behavior...", readTime: "5 min", lastUpdated: "Jan 20, 2026" },
  { id: "install-website", title: "How to install on your website", category: "getting-started", content: "Install the chat widget on your website...", readTime: "4 min", lastUpdated: "Jan 18, 2026" },
  { id: "test-live", title: "How to test before going live", category: "getting-started", content: "Test your chatbot before making it public...", readTime: "3 min", lastUpdated: "Jan 22, 2026" },
  { id: "understanding-dashboard", title: "Understanding your dashboard", category: "getting-started", content: "Navigate and understand all dashboard features...", readTime: "6 min", lastUpdated: "Jan 10, 2026" },
  { id: "file-types", title: "What file types are supported?", category: "knowledge-base", content: "We support Markdown, HTML, Text, PDF, and Word documents...", readTime: "2 min", lastUpdated: "Jan 12, 2026" },
  { id: "rag-explained", title: "How does RAG work?", category: "knowledge-base", content: "RAG (Retrieval-Augmented Generation) combines your documents with AI...", readTime: "5 min", lastUpdated: "Jan 14, 2026" },
  { id: "improve-accuracy", title: "How to improve chatbot accuracy", category: "knowledge-base", content: "Tips and best practices for better responses...", readTime: "4 min", lastUpdated: "Jan 16, 2026" },
  { id: "managing-documents", title: "Managing and updating documents", category: "knowledge-base", content: "Add, edit, and remove documents from your knowledge base...", readTime: "3 min", lastUpdated: "Jan 19, 2026" },
  { id: "chunk-sizes", title: "Understanding chunk sizes", category: "knowledge-base", content: "Learn how document chunking affects AI responses...", readTime: "4 min", lastUpdated: "Jan 21, 2026" },
  { id: "setup-whatsapp", title: "Setting up WhatsApp", category: "channels", content: "Connect your WhatsApp Business account...", readTime: "6 min", lastUpdated: "Jan 8, 2026" },
  { id: "setup-instagram", title: "Setting up Instagram", category: "channels", content: "Connect your Instagram Business account...", readTime: "5 min", lastUpdated: "Jan 9, 2026" },
  { id: "setup-messenger", title: "Setting up Facebook Messenger", category: "channels", content: "Connect Facebook Messenger for support...", readTime: "5 min", lastUpdated: "Jan 11, 2026" },
  { id: "setup-email", title: "Setting up Email", category: "channels", content: "Configure email channel for support...", readTime: "4 min", lastUpdated: "Jan 13, 2026" },
  { id: "setup-sms", title: "Setting up SMS", category: "channels", content: "Connect SMS for customer communications...", readTime: "4 min", lastUpdated: "Jan 15, 2026" },
  { id: "unified-inbox", title: "Understanding the unified inbox", category: "channels", content: "Manage all conversations in one place...", readTime: "3 min", lastUpdated: "Jan 17, 2026" },
  { id: "lead-capture", title: "How lead capture works", category: "leads", content: "Learn about automatic lead collection...", readTime: "3 min", lastUpdated: "Jan 6, 2026" },
  { id: "managing-leads", title: "Managing your leads", category: "leads", content: "View, edit, and export leads...", readTime: "4 min", lastUpdated: "Jan 7, 2026" },
  { id: "conversation-outcomes", title: "Understanding conversation outcomes", category: "leads", content: "Track and analyze conversation results...", readTime: "3 min", lastUpdated: "Jan 9, 2026" },
  { id: "escalation-rules", title: "Setting up escalation rules", category: "leads", content: "Automatically escalate conversations to humans...", readTime: "5 min", lastUpdated: "Jan 11, 2026" },
  { id: "understanding-metrics", title: "Understanding your metrics", category: "analytics", content: "Learn about key performance indicators...", readTime: "4 min", lastUpdated: "Jan 5, 2026" },
  { id: "resolution-rate", title: "What is resolution rate?", category: "analytics", content: "Track how many conversations are resolved...", readTime: "2 min", lastUpdated: "Jan 7, 2026" },
  { id: "exporting-reports", title: "Exporting reports", category: "analytics", content: "Download analytics data in various formats...", readTime: "3 min", lastUpdated: "Jan 9, 2026" },
  { id: "scheduled-reports", title: "Scheduling automated reports", category: "analytics", content: "Set up automatic report delivery...", readTime: "4 min", lastUpdated: "Jan 11, 2026" },
  { id: "billing-explained", title: "How billing works", category: "billing", content: "Understand your subscription and billing cycle...", readTime: "4 min", lastUpdated: "Jan 3, 2026" },
  { id: "upgrading-plan", title: "Upgrading your plan", category: "billing", content: "Change to a higher tier plan...", readTime: "3 min", lastUpdated: "Jan 5, 2026" },
  { id: "cancel-subscription", title: "Cancelling your subscription", category: "billing", content: "How to cancel your subscription...", readTime: "2 min", lastUpdated: "Jan 7, 2026" },
  { id: "download-invoices", title: "Download invoices", category: "billing", content: "Access and download your invoices...", readTime: "2 min", lastUpdated: "Jan 9, 2026" },
];

const categories = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "knowledge-base", label: "Knowledge Base", icon: FileText },
  { id: "channels", label: "Channels", icon: MessageSquare },
  { id: "leads", label: "Leads & Conversations", icon: BarChart3 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: Settings },
];

const quickLinks = [
  { id: "getting-started", title: "Getting Started", description: "Set up your account and first chatbot", icon: BookOpen, count: 5 },
  { id: "documents", title: "Managing Documents", description: "Upload and organize your knowledge base", icon: FileText, count: 5 },
  { id: "analytics", title: "Understanding Analytics", description: "Track performance and metrics", icon: BarChart3, count: 4 },
  { id: "channels", title: "Connecting Channels", description: "Add more ways for customers to reach you", icon: MessageSquare, count: 6 },
];

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const filteredArticles = helpArticles.filter((article) => {
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryArticles = (categoryId: string) => {
    return helpArticles.filter(a => a.category === categoryId).slice(0, 4);
  };

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    setHelpful(null);
  };

  if (selectedArticle) {
    const relatedArticles = helpArticles
      .filter(a => a.category === selectedArticle.category && a.id !== selectedArticle.id)
      .slice(0, 3);

    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-2 text-sm">
          <button 
            onClick={() => setSelectedArticle(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Help Center
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{selectedArticle.title}</span>
        </div>

        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card">
          <div className="px-4 sm:px-6 py-5 sm:py-6 border-b border-border">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {selectedArticle.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {selectedArticle.readTime} read
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Last updated: {selectedArticle.lastUpdated}
              </span>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground">{selectedArticle.content}</p>
              <p className="text-sm text-muted-foreground mt-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">Prerequisites</h3>
              <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                <li>An active AcmeDesk account</li>
                <li>Documents ready to upload (Markdown, HTML, PDF, or Word)</li>
                <li>Admin access to your website (for installation)</li>
              </ul>
              <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">Step-by-Step Guide</h3>
              <ol className="list-decimal pl-4 text-sm text-muted-foreground space-y-2">
                <li>Navigate to the Documents page from the sidebar</li>
                <li>Click the "Upload" button or drag and drop your files</li>
                <li>Wait for the upload to complete and indexing to finish</li>
                <li>Your documents are now ready to be used by the AI</li>
              </ol>
              <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">Tips</h3>
              <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                <li>Use clear, well-structured documents for better responses</li>
                <li>Keep paragraphs short and use headers</li>
                <li>Update documents regularly for fresh information</li>
              </ul>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 border-t border-border bg-muted/20">
            <p className="text-sm font-medium text-foreground mb-3">Was this helpful?</p>
            <div className="flex gap-2">
              <Button 
                variant={helpful === true ? "default" : "outline"} 
                size="sm" 
                className="gap-1.5"
                onClick={() => setHelpful(true)}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Yes
              </Button>
              <Button 
                variant={helpful === false ? "default" : "outline"} 
                size="sm" 
                className="gap-1.5"
                onClick={() => setHelpful(false)}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                No
              </Button>
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div className="px-4 sm:px-6 py-5 sm:py-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Related Articles</h3>
              <div className="space-y-2">
                {relatedArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-sm text-foreground">{article.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 py-5 sm:py-6 border-t border-border bg-primary/5">
            <p className="text-sm font-medium text-foreground mb-3">Still need help?</p>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              Contact Support
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
          Help Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-description">
          Find answers and learn how to use AcmeDesk
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.id}
              onClick={() => setSelectedCategory(link.id === "documents" ? "knowledge-base" : link.id)}
              className="rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">{link.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">{link.description}</p>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl overflow-hidden border bg-card">
        <div className="px-4 sm:px-6 py-4 border-b">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                selectedCategory === "all"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              All
            </button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    selectedCategory === cat.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {selectedCategory === "all" ? (
            <div className="space-y-8">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat.label}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {getCategoryArticles(cat.id).map((article) => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article)}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-sm text-foreground">{article.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-sm text-foreground">{article.title}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                  No articles found. Try a different search term.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Contact Support
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-description">
            Can't find what you're looking for?
          </p>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <button className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email Support</p>
                <p className="text-xs text-muted-foreground">Reply within 24h</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 text-violet-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Book a Call</p>
                <p className="text-xs text-muted-foreground">Schedule a demo</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Live Chat</p>
                <p className="text-xs text-muted-foreground">Chat with our bot</p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
