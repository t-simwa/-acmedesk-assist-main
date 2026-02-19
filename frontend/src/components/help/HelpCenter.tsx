import { useState } from "react";
import { Book, FileText, MessageSquare, Settings, BarChart3, Upload, HelpCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    content: "Welcome to AcmeDesk Assist! This guide will help you set up and start using the platform. First, upload your knowledge base documents in the Documents page. Then configure your RAG settings in Settings. Finally, test the chat widget to see it in action.",
    tags: ["setup", "basics", "getting-started"],
  },
  {
    id: "uploading-documents",
    title: "Uploading and Managing Documents",
    category: "documents",
    content: "You can upload documents in multiple formats: Markdown (.md), HTML (.html), Text (.txt), PDF (.pdf), and Word (.docx). After uploading, documents are automatically processed and indexed. You can reindex documents if needed, or delete them if they're no longer relevant.",
    tags: ["documents", "upload", "management"],
  },
  {
    id: "rag-settings",
    title: "Understanding RAG Settings",
    category: "settings",
    content: "RAG (Retrieval-Augmented Generation) settings control how the AI retrieves and generates answers. Temperature controls creativity (0-2), Top-K controls how many document chunks to retrieve, Max Tokens limits response length, and Chunk Size/Overlap control how documents are split. Use presets for quick configuration or customize manually.",
    tags: ["settings", "rag", "configuration"],
  },
  {
    id: "analytics",
    title: "Understanding Analytics",
    category: "analytics",
    content: "The Analytics page shows key metrics about your chatbot's performance. View conversation trends, resolution rates, top questions, and more. Use date range filters to analyze specific time periods. Export data as CSV, Excel, or PDF for reporting.",
    tags: ["analytics", "metrics", "reporting"],
  },
  {
    id: "chat-widget",
    title: "Using the Chat Widget",
    category: "basics",
    content: "The chat widget appears on your public-facing pages. Users can ask questions and receive answers based on your knowledge base. The widget supports reactions (thumbs up/down), message copying, and conversation clearing. Configure the greeting message and colors in Settings > Branding.",
    tags: ["chat", "widget", "customer-facing"],
  },
  {
    id: "team-management",
    title: "Team Management and Roles",
    category: "admin",
    content: "Admins can invite team members and assign roles: Admin (full access), Analyst (read/write documents), or Viewer (read-only). Team members receive email invitations and can accept to join. You can update roles or remove members at any time.",
    tags: ["team", "roles", "collaboration"],
  },
  {
    id: "api-keys",
    title: "API Keys Management",
    category: "admin",
    content: "API keys allow programmatic access to AcmeDesk Assist. Create keys with optional expiration dates. Keys are shown only once on creation - copy them immediately. Revoke keys if they're compromised or no longer needed.",
    tags: ["api", "keys", "integration"],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting Common Issues",
    category: "support",
    content: "If documents aren't indexing: Check file format, ensure files aren't corrupted, and try reindexing. If chat responses are poor: Review your system prompt, adjust temperature/top-k settings, and ensure documents are properly indexed. For API errors: Check your API keys and rate limits.",
    tags: ["troubleshooting", "support", "issues"],
  },
];

const categories = [
  { id: "all", label: "All Topics", icon: Book },
  { id: "basics", label: "Getting Started", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "admin", label: "Administration", icon: HelpCircle },
  { id: "support", label: "Support", icon: HelpCircle },
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

  const faqItems = [
    {
      question: "How do I upload documents?",
      answer: "Go to the Documents page and click 'Upload Document' or drag and drop files. Supported formats include Markdown, HTML, Text, PDF, and Word documents.",
    },
    {
      question: "What are the recommended RAG settings?",
      answer: "Start with the 'Balanced' preset. Adjust temperature for creativity (higher = more creative), top-k for retrieval breadth, and chunk size based on your document structure.",
    },
    {
      question: "How do I customize the chat widget?",
      answer: "Navigate to Settings > Branding. You can upload a logo, customize colors, and set a custom greeting message. Changes apply immediately to the chat widget.",
    },
    {
      question: "Can I export analytics data?",
      answer: "Yes! On the Analytics page, use the export menu to download data as CSV, Excel, or generate a PDF report with charts and metrics.",
    },
    {
      question: "What user roles are available?",
      answer: "Three roles: Admin (full access), Analyst (can manage documents), and Viewer (read-only access). Assign roles when inviting team members.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-bold text-foreground">Help Center</h1>
        <p className="text-description text-muted-foreground">
          Find answers to common questions and learn how to use AcmeDesk Assist
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Input
          type="search"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  <Icon size={16} />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="mx-auto text-muted-foreground mb-4" size={48} />
                <p className="text-muted-foreground">No articles found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      {(() => {
                        const categoryMeta = categories.find((c) => c.id === article.category);
                        if (!categoryMeta?.icon) return null;
                        const CategoryIcon = categoryMeta.icon;
                        return <CategoryIcon size={14} />;
                      })()}
                      {categories.find((c) => c.id === article.category)?.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{article.content}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full">
                      Read more
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left font-medium">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Explore more documentation and support options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <a href="/admin/settings" target="_self">
              <Settings size={16} />
              Settings & Configuration
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} />
              API Documentation
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
