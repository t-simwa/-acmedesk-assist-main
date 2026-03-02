/**
 * GlobalSearch — Cmd+K / Ctrl+K modal search
 *
 * Spec 7.1.4: Opened via search icon in TopBar or keyboard shortcut
 * Features: live search (debounced), keyboard navigation, recent searches
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessagesSquare,
  UserCheck,
  FileText,
  Users,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: "conversation" | "lead" | "document" | "contact";
  title: string;
  subtitle: string;
  path: string;
}

// ─── Category icons/labels ────────────────────────────────────────────────────

const CATEGORY_META: Record<
  SearchResult["type"],
  { icon: React.ElementType; label: string; color: string }
> = {
  conversation: { icon: MessagesSquare, label: "Conversations", color: "#4F8EF7" },
  lead: { icon: UserCheck, label: "Leads", color: "#10B981" },
  document: { icon: FileText, label: "Documents", color: "#F59E0B" },
  contact: { icon: Users, label: "Contacts", color: "#7C3AED" },
};

// ─── Mock search results (replace with real API calls when backend ready) ─────

const MOCK_RESULTS: SearchResult[] = [
  { id: "c1", type: "conversation", title: "Conversation with John Smith", subtitle: "3 messages · Web Widget · 2 hours ago", path: "/dashboard/conversations?id=c1" },
  { id: "c2", type: "conversation", title: "Conversation with Sarah Lee", subtitle: "7 messages · WhatsApp · Yesterday", path: "/dashboard/conversations?id=c2" },
  { id: "l1", type: "lead", title: "John Smith", subtitle: "john@example.com · Web Widget", path: "/dashboard/leads?id=l1" },
  { id: "l2", type: "lead", title: "Sarah Lee", subtitle: "sarah@email.com · WhatsApp · New", path: "/dashboard/leads?id=l2" },
  { id: "d1", type: "document", title: "Product Catalog 2026.pdf", subtitle: "32 pages · Indexed 3 days ago", path: "/dashboard/documents?id=d1" },
  { id: "d2", type: "document", title: "Shipping Policy", subtitle: "1 page · Indexed 1 week ago", path: "/dashboard/documents?id=d2" },
  { id: "co1", type: "contact", title: "John Smith", subtitle: "john@example.com · 2 conversations", path: "/dashboard/contacts?id=co1" },
];

const RECENT_SEARCHES_KEY = "nexachat-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const existing = getRecentSearches().filter((s) => s !== query);
  const updated = [query, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Result Row ───────────────────────────────────────────────────────────────

function ResultRow({
  result,
  isActive,
  onSelect,
}: {
  result: SearchResult;
  isActive: boolean;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[result.type];
  const IconEl = meta.icon;
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <button
      ref={ref}
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 focus:outline-none"
      style={{
        background: isActive ? "rgba(79,142,247,0.1)" : "transparent",
        borderLeft: isActive ? `3px solid ${meta.color}` : "3px solid transparent",
      }}
      onMouseEnter={(e) =>
        !isActive &&
        ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")
      }
      onMouseLeave={(e) =>
        !isActive &&
        ((e.currentTarget as HTMLElement).style.background = "transparent")
      }
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-md"
        style={{
          width: 32,
          height: 32,
          background: `${meta.color}20`,
        }}
      >
        <IconEl size={15} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-medium truncate"
          style={{ color: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {result.title}
        </div>
        <div className="text-[11px] truncate" style={{ color: "#6B7280" }}>
          {result.subtitle}
        </div>
      </div>
      <ArrowRight size={14} style={{ color: "#4B5563", flexShrink: 0 }} />
    </button>
  );
}

// ─── GlobalSearch ─────────────────────────────────────────────────────────────

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search (150ms)
  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const lower = q.toLowerCase();
      const filtered = MOCK_RESULTS.filter(
        (r) =>
          r.title.toLowerCase().includes(lower) ||
          r.subtitle.toLowerCase().includes(lower)
      );
      setResults(filtered);
      setActiveIndex(0);
    }, 150);
  }, []);

  useEffect(() => {
    runSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && results[activeIndex]) {
        handleSelect(results[activeIndex]);
        return;
      }
    },
    [isOpen, results, activeIndex]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (result: SearchResult) => {
    if (query.trim()) addRecentSearch(query.trim());
    onClose();
    navigate(result.path);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }
  const flatResults = results; // used for keyboard nav index

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-start justify-center pt-[10vh]"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200 }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="w-full max-w-[640px] mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#0D1117",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          maxHeight: "60vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div
          className="flex items-center gap-3 px-4"
          style={{
            height: 56,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search size={18} style={{ color: "#6B7280", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, leads, documents…"
            className="flex-1 bg-transparent border-none outline-none text-[14px]"
            style={{
              color: "#F9FAFB",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex-shrink-0 focus:outline-none"
              style={{ color: "#6B7280" }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            className="flex-shrink-0 hidden sm:flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#6B7280",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results / empty state */}
        <div className="overflow-y-auto flex-1">
          {query.trim() === "" ? (
            /* Show recent searches or suggestions */
            recentSearches.length > 0 ? (
              <div>
                <div
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "#4B5563" }}
                >
                  Recent Searches
                </div>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left focus:outline-none transition-colors duration-100"
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                    <Clock size={14} style={{ color: "#4B5563", flexShrink: 0 }} />
                    <span className="text-[13px]" style={{ color: "#9CA3AF" }}>
                      {term}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <Search size={32} className="mx-auto mb-3" style={{ color: "#374151" }} />
                <p className="text-[13px]" style={{ color: "#6B7280" }}>
                  Search across conversations, leads, documents, and contacts
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  {(["conversation", "lead", "document", "contact"] as const).map((type) => {
                    const meta = CATEGORY_META[type];
                    const IconEl = meta.icon;
                    return (
                      <div
                        key={type}
                        className="flex flex-col items-center gap-1"
                        style={{ color: "#4B5563" }}
                      >
                        <div
                          className="flex items-center justify-center rounded-lg"
                          style={{
                            width: 36,
                            height: 36,
                            background: `${meta.color}15`,
                          }}
                        >
                          <IconEl size={16} style={{ color: meta.color }} />
                        </div>
                        <span className="text-[10px]">{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px]" style={{ color: "#6B7280" }}>
                No results for &quot;<strong style={{ color: "#9CA3AF" }}>{query}</strong>&quot;
              </p>
              <p className="text-[12px] mt-1" style={{ color: "#4B5563" }}>
                Try different keywords
              </p>
            </div>
          ) : (
            /* Grouped results */
            Object.entries(grouped).map(([type, items]) => {
              const meta = CATEGORY_META[type as SearchResult["type"]];
              return (
                <div key={type}>
                  <div
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563" }}
                  >
                    {meta.label}
                  </div>
                  {items.map((result) => {
                    const globalIdx = flatResults.indexOf(result);
                    return (
                      <ResultRow
                        key={result.id}
                        result={result}
                        isActive={globalIdx === activeIndex}
                        onSelect={() => handleSelect(result)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { key: "↑↓", desc: "Navigate" },
            { key: "↵", desc: "Select" },
            { key: "Esc", desc: "Close" },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd
                className="flex items-center px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#6B7280",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {key}
              </kbd>
              <span className="text-[11px]" style={{ color: "#4B5563" }}>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
