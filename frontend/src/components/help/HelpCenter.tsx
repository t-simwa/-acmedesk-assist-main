import { useState } from "react";
import { Book, FileText, MessageSquare, Settings, BarChart3, HelpCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
}

const helpArticles: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Getting Started with AcmeDesk Assist",
    category: "basics",
    content:
      "Welcome to AcmeDesk Assist! This guide will help you set up and start using the platform. First, upload your knowledge base documents in the Documents page. Then configure your RAG settings in Settings. Finally, test the chat widget to see it in action.",
    tags: ["setup", "basics", "getting-started"],
  },
  {
    id: "uploading-documents",
    title: "Uploading and Managing Documents",
    category: "documents",
    content:
      "You can upload documents in multiple formats: Markdown (.md), HTML (.html), Text (.txt), PDF (.pdf), and Word (.docx). After uploading, documents are automatically processed and indexed. You can reindex documents if needed, or delete them if they're no longer relevant.",
    tags: ["documents", "upload", "management"],
  },
  {
    id: "rag-settings",
    title: "Understanding RAG Settings",
    category: "settings",
    content:
      "RAG (Retrieval-Augmented Generation) settings control how the AI retrieves and generates answers. Temperature controls creativity (0-2), Top-K controls how many document chunks to retrieve, Max Tokens limits response length, and Chunk Size/Overlap control how documents are split. Use presets for quick configuration or customize manually.",
    tags: ["settings", "rag", "configuration"],
  },
  {
    id: "analytics",
    title: "Understanding Analytics",
    category: "analytics",
    content:
      "The Analytics page shows key metrics about your chatbot's performance. View conversation trends, resolution rates, top questions, and more. Use date range filters to analyze specific time periods. Export data as CSV, Excel, or PDF for reporting.",
    tags: ["analytics", "metrics", "reporting"],
  },
  {
    id: "chat-widget",
    title: "Using the Chat Widget",
    category: "basics",
    content:
      "The chat widget appears on your public-facing pages. Users can ask questions and receive answers based on your knowledge base. The widget supports reactions (thumbs up/down), message copying, and conversation clearing. Configure the greeting message and colors in Settings > Branding.",
    tags: ["chat", "widget", "customer-facing"],
  },
  {
    id: "team-management",
    title: "Team Management and Roles",
    category: "admin",
    content:
      "Admins can invite team members and assign roles: Admin (full access), Analyst (read/write documents), or Viewer (read-only). Team members receive email invitations and can accept to join. You can update roles or remove members at any time.",
    tags: ["team", "roles", "collaboration"],
  },
  {
    id: "api-keys",
    title: "API Keys Management",
    category: "admin",
    content:
      "API keys allow programmatic access to AcmeDesk Assist. Create keys with optional expiration dates. Keys are shown only once on creation - copy them immediately. Revoke keys if they're compromised or no longer needed.",
    tags: ["api", "keys", "integration"],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting Common Issues",
    category: "support",
    content:
      "If documents aren't indexing: Check file format, ensure files aren't corrupted, and try reindexing. If chat responses are poor: Review your system prompt, adjust temperature/top-k settings, and ensure documents are properly indexed. For API errors: Check your API keys and rate limits.",
    tags: ["troubleshooting", "support", "issues"],
  },
];

const categories = [
  { id: "all", label: "All", icon: Book },
  { id: "basics", label: "Getting Started", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "admin", label: "Administration", icon: HelpCircle },
  { id: "support", label: "Support", icon: HelpCircle },
];

const faqItems = [
  {
    question: "How do I upload documents?",
    answer:
      "Go to the Documents page and click 'Upload Document' or drag and drop files. Supported formats include Markdown, HTML, Text, PDF, and Word documents.",
  },
  {
    question: "What are the recommended RAG settings?",
    answer:
      "Start with the 'Balanced' preset. Adjust temperature for creativity (higher = more creative), top-k for retrieval breadth, and chunk size based on your document structure.",
  },
  {
    question: "How do I customize the chat widget?",
    answer:
      "Navigate to Settings > Branding. You can upload a logo, customize colors, and set a custom greeting message. Changes apply immediately to the chat widget.",
  },
  {
    question: "Can I export analytics data?",
    answer:
      "Yes! On the Analytics page, use the export menu to download data as CSV, Excel, or generate a PDF report with charts and metrics.",
  },
  {
    question: "What user roles are available?",
    answer:
      "Three roles: Admin (full access), Analyst (can manage documents), and Viewer (read-only access). Assign roles when inviting team members.",
  },
];

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredArticles = helpArticles.filter((article) => {
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full min-w-0">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Help Center</h1>
        <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">
          Find answers and learn how to use AcmeDesk Assist
        </p>
      </header>

      <div className="relative w-full max-w-xl">
        <Input
          type="search"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-xl"
          aria-label="Search help articles"
        />
      </div>

      <Tabs defaultValue="articles" className="mt-6 sm:mt-8 w-full min-w-0">
        <TabsList
          className={cn(
            "inline-flex h-auto w-full sm:w-auto min-w-0 rounded-xl bg-muted/40 p-1.5 gap-1",
            "flex"
          )}
        >
          <TabsTrigger
            value="articles"
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-lg px-4 text-[13px] sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Articles
          </TabsTrigger>
          <TabsTrigger
            value="faq"
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-lg px-4 text-[13px] sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-5 sm:mt-6 focus-visible:outline-none min-w-0">
          <div className="flex flex-wrap gap-2 mb-5 sm:mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2 rounded-xl min-h-[40px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {filteredArticles.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60",
                "bg-muted/20 py-12 sm:py-16 px-6 text-center min-h-[280px]"
              )}
            >
              <HelpCircle className="h-10 w-10 text-muted-foreground/70 mb-4" />
              <p className="text-sm font-medium text-foreground/90">No articles found</p>
              <p className="text-[13px] text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {filteredArticles.map((article) => {
                const categoryMeta = categories.find((c) => c.id === article.category);
                const CategoryIcon = categoryMeta?.icon;
                return (
                  <article
                    key={article.id}
                    className={cn(
                      "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
                      "flex flex-col p-4 sm:p-5 transition-colors hover:border-border/70 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {categoryMeta?.label ?? article.category}
                      </span>
                    </div>
                    <h3 className="text-[15px] sm:text-base font-semibold text-foreground leading-snug mb-2">
                      {article.title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground line-clamp-3 flex-1 mb-4">
                      {article.content}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full rounded-xl justify-center text-[13px]">
                      Read more
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-5 sm:mt-6 focus-visible:outline-none min-w-0">
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="rounded-2xl border border-border/50 bg-muted/10 overflow-hidden px-4 sm:px-5"
              >
                <AccordionTrigger className="text-left py-4 sm:py-5 font-medium text-[14px] sm:text-sm hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-muted-foreground pb-4 sm:pb-5 pt-0">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>

      <section
        className={cn(
          "mt-8 sm:mt-10 rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
          "p-4 sm:p-5 lg:p-6"
        )}
      >
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          More resources
        </h2>
        <p className="text-[12px] text-muted-foreground/80 mt-0.5 mb-4">Documentation and support</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" className="rounded-xl justify-start gap-2 min-h-[44px] sm:min-h-[40px]" asChild>
            <a href="/admin/settings">
              <Settings className="h-4 w-4 shrink-0" />
              Settings & configuration
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl justify-start gap-2 min-h-[44px] sm:min-h-[40px]" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 shrink-0" />
              API documentation
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
