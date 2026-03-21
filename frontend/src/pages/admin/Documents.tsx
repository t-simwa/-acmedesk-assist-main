import { useState, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Upload,
  Search,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Eye,
  Trash2,
  Download,
  Archive,
  ArchiveRestore,
  Replace,
  CloudUpload,
  Link2,
  ChevronLeft,
  ChevronRight,
  FileType,
  File,
  FileCode,
  FileSpreadsheet,
  Globe,
  Lightbulb,
  FolderOpen,
  Database,
  Plus,
  Settings,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  HardDrive,
  Activity,
  AlertTriangle,
  FileCheck,
  FileClock,
  FileWarning,
  MessageSquareText,
  Send,
  Type,
} from "lucide-react";
import {
  type Document,
  type ApiError,
  type StorageUsageResponse,
  type DocumentUploadResponse,
  documentsApi,
  chatApi,
} from "@/lib/api";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useReindexDocument,
  useUpdateDocument,
} from "@/hooks/useDocuments";
import {
  useKnowledgeBases,
  useKnowledgeBasePreferences,
  useCreateKnowledgeBase,
  useUpdateKnowledgeBase,
  useDeleteKnowledgeBase,
} from "@/hooks/useKnowledgeBases";
import { useContentAnalytics } from "@/hooks/useAnalytics";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_META: Record<string, { dot: string; badge: string; label: string; spinning?: boolean }> = {
  ready:      { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Ready" },
  processing: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",         label: "Processing", spinning: true },
  archived:   { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",         label: "Archived" },
  failed:     { dot: "bg-rose-400",    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",         label: "Failed" },
};

const FILE_TYPE_META: Record<string, { icon: typeof FileText; label: string }> = {
  pdf:  { icon: FileText,        label: "PDF" },
  docx: { icon: FileType,        label: "DOCX" },
  doc:  { icon: FileType,        label: "DOC" },
  txt:  { icon: File,            label: "TXT" },
  csv:  { icon: FileSpreadsheet, label: "CSV" },
  html: { icon: FileCode,        label: "HTML" },
  htm:  { icon: FileCode,        label: "HTML" },
  md:   { icon: FileText,        label: "MD" },
  url:  { icon: Globe,           label: "URL" },
};

const KPI_CARDS = [
  {
    key: "total" as const,
    label: "Total Documents",
    icon: <FileText className="h-4 w-4" />,
    accent: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "ready" as const,
    label: "Ready",
    icon: <FileCheck className="h-4 w-4" />,
    accent: "from-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    key: "processing" as const,
    label: "Processing",
    icon: <FileClock className="h-4 w-4" />,
    accent: "from-blue-500/5 to-transparent",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    key: "failed" as const,
    label: "Failed",
    icon: <FileWarning className="h-4 w-4" />,
    accent: "from-rose-500/5 to-transparent",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
];

type SortField = "filename" | "file_type" | "status" | "file_size" | "chunk_count" | "upload_date";
type SortDirection = "asc" | "desc";
type UploadTab = "file" | "url" | "text";

interface UploadFileItem {
  id: string;
  file: File;
  progress: number;
  stage: "uploading" | "processing" | "indexing" | "ready" | "error";
  error?: string;
  documentId?: string;
}

interface TestMessage {
  role: "user" | "assistant";
  content: string;
}

const ITEMS_PER_PAGE = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const VALID_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".csv", ".html", ".htm", ".md"];
const ACCEPT_STRING = ".pdf,.docx,.doc,.txt,.csv,.html,.htm,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/plain,text/html,text/markdown";

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStorageSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function getFileTypeMeta(type: string | null | undefined) {
  const safeType = (type || "unknown").toLowerCase();
  return FILE_TYPE_META[safeType] || { icon: FileText, label: safeType.toUpperCase() };
}

function getStatusMeta(status: string) {
  return STATUS_META[status] || STATUS_META.processing;
}

function getStorageBarColor(percent: number): string {
  if (percent >= 90) return "bg-rose-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-emerald-500";
}

function getHealthGrade(score: number): { label: string; badge: string } {
  if (score >= 90) return { label: "Excellent", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (score >= 75) return { label: "Good", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (score >= 60) return { label: "Fair", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  return { label: "Needs Work", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
}

function TrendIndicator({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
      isPositive && "text-emerald-500",
      isNegative && "text-rose-500",
      !isPositive && !isNegative && "text-muted-foreground",
    )}>
      {value > 0 && <TrendingUp className="h-3 w-3" />}
      {value < 0 && <TrendingDown className="h-3 w-3" />}
      {value === 0 && <Minus className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Documents() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("upload_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [reindexing, setReindexing] = useState<Set<string>>(new Set());

  // Upload
  const [uploadTab, setUploadTab] = useState<UploadTab>("file");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFileItem[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlImporting, setUrlImporting] = useState(false);
  const [plainTextName, setPlainTextName] = useState("");
  const [plainTextContent, setPlainTextContent] = useState("");
  const [plainTextSubmitting, setPlainTextSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadZoneRef = useRef<HTMLDivElement>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chunksExpanded, setChunksExpanded] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);

  // Replace
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Knowledge base
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | undefined>(undefined);
  const [knowledgeBaseDialogOpen, setKnowledgeBaseDialogOpen] = useState(false);
  const [createKBDialogOpen, setCreateKBDialogOpen] = useState(false);
  const [newKBName, setNewKBName] = useState("");
  const [newKBDescription, setNewKBDescription] = useState("");

  // Test Knowledge Base drawer
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const testMessagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    itemId: string;
    fileName: string;
    response: DocumentUploadResponse;
    resolve: (uploadAnyway: boolean) => void;
  } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: documentsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useDocuments({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(typeFilter && typeFilter !== "all" ? { type: typeFilter } : {}),
  });

  const documents = documentsData?.documents || [];

  // Storage usage
  const { data: storageUsage } = useQuery<StorageUsageResponse>({
    queryKey: ["documents", "storage-usage"],
    queryFn: () => documentsApi.getStorageUsage(),
    staleTime: 5 * 60 * 1000,
  });

  // Knowledge bases
  const { knowledgeBases, loading: kbLoading, refetch: refetchKBs } = useKnowledgeBases();
  const { preferences, updatePreferences, refetch: refetchPrefs } = useKnowledgeBasePreferences();
  const { createKnowledgeBase, loading: creatingKB } = useCreateKnowledgeBase();
  const { updateKnowledgeBase } = useUpdateKnowledgeBase();
  const { deleteKnowledgeBase } = useDeleteKnowledgeBase();

  // Content analytics for gap alert and knowledge health score
  const { data: contentAnalytics } = useContentAnalytics({ range: "30d" });

  const knowledgeHealthScore = useMemo(() => {
    if (!contentAnalytics) return null;
    const unanswered = contentAnalytics.total_unanswered ?? 0;
    const raw = Math.max(20, 100 - unanswered * 4);
    return Math.round(raw);
  }, [contentAnalytics]);

  // Mutations
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const reindexMutation = useReindexDocument();
  const _updateMutation = useUpdateDocument();

  // ── Computed ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = documents.length;
    const ready = documents.filter((d) => d.status === "ready").length;
    const processing = documents.filter((d) => d.status === "processing").length;
    const failed = documents.filter((d) => d.status === "failed").length;
    return { total, ready, processing, failed };
  }, [documents]);

  const filtered = useMemo(() => {
    let result = [...documents];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.original_filename.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "filename":
          aVal = (a.original_filename || a.filename).toLowerCase();
          bVal = (b.original_filename || b.filename).toLowerCase();
          break;
        case "file_type":
          aVal = a.file_type.toLowerCase();
          bVal = b.file_type.toLowerCase();
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "file_size":
          aVal = a.file_size || 0;
          bVal = b.file_size || 0;
          break;
        case "chunk_count":
          aVal = a.chunk_count || 0;
          bVal = b.chunk_count || 0;
          break;
        case "upload_date":
          aVal = new Date(a.upload_date || a.created_at).getTime();
          bVal = new Date(b.upload_date || b.created_at).getTime();
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, search, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const hasActiveFilters = (statusFilter !== null && statusFilter !== "all") || (typeFilter !== null && typeFilter !== "all");

  // Auto-expand upload zone for first-time users (0 docs)
  const shouldAutoExpandUpload = !loading && documents.length === 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("asc");
      return field;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter(null);
    setTypeFilter(null);
    setSearch("");
    setPage(1);
  }, []);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllSelection = useCallback(() => {
    if (selectedRows.size === paginated.length && paginated.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginated.map((d) => d.id)));
    }
  }, [selectedRows.size, paginated]);

  // File upload
  const pollDocumentStatus = useCallback(
    async (docId: string, itemId: string) => {
      let done = false;
      while (!done) {
        try {
          const status = await documentsApi.getStatus(docId);

          let itemStillExists = true;
          setUploadQueue((prev) => {
            const exists = prev.some((u) => u.id === itemId);
            if (!exists) {
              itemStillExists = false;
              return prev;
            }
            const stage: UploadFileItem["stage"] =
              status.status === "ready"
                ? "ready"
                : status.status === "failed" || status.status === "error"
                ? "error"
                : status.progress >= 70
                ? "indexing"
                : "processing";

            return prev.map((u) =>
              u.id === itemId
                ? {
                    ...u,
                    progress: Math.min(100, status.progress),
                    stage,
                    error: status.error_message ?? u.error,
                  }
                : u
            );
          });

          if (!itemStillExists) break;

          if (status.status === "ready") {
            done = true;
            setTimeout(() => {
              setUploadQueue((prev) => prev.filter((u) => u.id !== itemId));
            }, 2500);
          } else if (status.status === "failed" || status.status === "error") {
            done = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch {
          done = true;
        }
      }
    },
    []
  );

  const requestDuplicateDecision = useCallback(
    (itemId: string, fileName: string, response: DocumentUploadResponse) =>
      new Promise<boolean>((resolve) => {
        setDuplicatePrompt({ itemId, fileName, response, resolve });
      }),
    []
  );

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      const id = `${Date.now()}-${i}`;

      if (!VALID_EXTENSIONS.includes(ext)) {
        toast({
          title: "Invalid file",
          description: `${file.name} has unsupported format. Accepts: PDF, DOCX, TXT, CSV, MD, HTML`,
          variant: "destructive",
        });
        newItems.push({ id, file, progress: 0, stage: "error", error: `${file.name} has unsupported format` });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 50MB limit`, variant: "destructive" });
        newItems.push({ id, file, progress: 0, stage: "error", error: `${file.name} exceeds 50MB limit` });
        continue;
      }

      newItems.push({ id, file, progress: 0, stage: "uploading" });
    }

    if (newItems.length === 0) return;
    setUploadQueue((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      if (item.stage === "error") continue;

      try {
        let allowUpload = true;
        try {
          const dupe = await documentsApi.checkDuplicate(item.file);
          if (dupe.is_duplicate && dupe.can_proceed) {
            allowUpload = await requestDuplicateDecision(item.id, item.file.name, {
              id: dupe.duplicate_of || "",
              name: item.file.name,
              status: "processing",
              message: "",
              is_duplicate: dupe.is_duplicate,
              duplicate_of: dupe.duplicate_of,
            });
          }
        } catch {
          allowUpload = true;
        }

        if (!allowUpload) {
          setUploadQueue((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? { ...u, stage: "error", progress: 0, error: "Upload cancelled (duplicate of an existing document)." }
                : u
            )
          );
          continue;
        }

        const response = await uploadMutation.mutateAsync({
          file: item.file,
          knowledge_base_id: selectedKnowledgeBaseId,
        });

        setUploadQueue((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, documentId: response.id, stage: "processing", progress: 10, error: undefined }
              : u
          )
        );

        void pollDocumentStatus(response.id, item.id);
      } catch (err) {
        const apiError = err as ApiError;
        setUploadQueue((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, stage: "error", error: apiError?.message || "Upload failed", progress: 0 }
              : u
          )
        );
      }
    }
  }, [uploadMutation, selectedKnowledgeBaseId, toast, pollDocumentStatus, requestDuplicateDecision]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const cancelUpload = useCallback((id: string) => {
    setUploadQueue((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // URL import
  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return;
    setUrlImporting(true);
    try {
      await documentsApi.ingestUrl(urlInput.trim());
      toast({ title: "URL imported", description: "Content is being processed from the URL.", variant: "success" });
      setUrlInput("");
      refetch();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Import failed", description: apiError?.message || "Failed to import URL", variant: "destructive" });
    } finally {
      setUrlImporting(false);
    }
  }, [urlInput, toast, refetch]);

  // Plain text upload
  const handlePlainTextSubmit = useCallback(async () => {
    if (!plainTextName.trim() || !plainTextContent.trim()) return;
    setPlainTextSubmitting(true);
    try {
      const blob = new Blob([plainTextContent], { type: "text/plain" });
      const fileName = plainTextName.trim().endsWith(".txt") ? plainTextName.trim() : `${plainTextName.trim()}.txt`;
      const file = new window.File([blob], fileName, { type: "text/plain" });
      await uploadMutation.mutateAsync({
        file,
        knowledge_base_id: selectedKnowledgeBaseId,
      });
      toast({ title: "Text uploaded", description: "Plain text content is being processed.", variant: "success" });
      setPlainTextName("");
      setPlainTextContent("");
      refetch();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Upload failed", description: apiError?.message || "Failed to upload text content", variant: "destructive" });
    } finally {
      setPlainTextSubmitting(false);
    }
  }, [plainTextName, plainTextContent, uploadMutation, selectedKnowledgeBaseId, toast, refetch]);

  // Document actions
  const handlePreview = useCallback(async (doc: Document) => {
    try {
      const detail = await documentsApi.get(doc.id);
      setPreviewDoc(detail.document);
      setPreviewOpen(true);
      setChunksExpanded(false);
    } catch {
      toast({ title: "Error", description: "Failed to load document details", variant: "destructive" });
    }
  }, [toast]);

  const handleDownload = useCallback((doc: Document) => {
    if (doc.storage_url) {
      window.open(doc.storage_url, "_blank");
    }
  }, []);

  const handleTestSend = useCallback(async () => {
    if (!testInput.trim() || testLoading) return;
    const question = testInput.trim();
    setTestInput("");
    setTestMessages((prev) => [...prev, { role: "user", content: question }]);
    setTestLoading(true);

    try {
      const response = await chatApi.sendMessage({ message: question });
      setTestMessages((prev) => [...prev, { role: "assistant", content: response.answer || "No answer returned." }]);
    } catch (error) {
      const apiError = error as ApiError;
      setTestMessages((prev) => [...prev, { role: "assistant", content: `Error: ${apiError?.message || "Failed to get response."}` }]);
    } finally {
      setTestLoading(false);
      setTimeout(() => testMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [testInput, testLoading]);

  const handleArchive = useCallback(async (doc: Document) => {
    try {
      if (doc.is_archived || doc.status === "archived") {
        await documentsApi.restore(doc.id);
        toast({ title: "Document restored", description: `"${doc.original_filename}" is now active in your knowledge base.`, variant: "success" });
      } else {
        await documentsApi.archive(doc.id);
        toast({ title: "Document archived", description: `"${doc.original_filename}" has been archived.`, variant: "success" });
      }
      refetch();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Error", description: apiError?.message || "Action failed", variant: "destructive" });
    }
  }, [toast, refetch]);

  const handleReplace = useCallback((docId: string) => {
    setReplaceTargetId(docId);
    setTimeout(() => replaceInputRef.current?.click(), 100);
  }, []);

  const handleReplaceFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceTargetId) return;
    try {
      await documentsApi.replace(replaceTargetId, file);
      toast({ title: "Document replaced", description: "New version uploaded successfully.", variant: "success" });
      refetch();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Replace failed", description: apiError?.message || "Failed to replace document", variant: "destructive" });
    } finally {
      setReplaceTargetId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }, [replaceTargetId, toast, refetch]);

  const handleReindex = useCallback(async (docId: string) => {
    try {
      setReindexing((prev) => new Set(prev).add(docId));
      await reindexMutation.mutateAsync(docId);
    } finally {
      setReindexing((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }, [reindexMutation]);

  const handleDeleteClick = useCallback((docId: string) => {
    setDeleteTargetId(docId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
    } finally {
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, deleteMutation]);

  const confirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedRows);
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      setSelectedRows(new Set());
      toast({ title: "Documents deleted", description: `${ids.length} document(s) deleted successfully.`, variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to delete some documents", variant: "destructive" });
    }
  }, [selectedRows, deleteMutation, toast]);

  const confirmBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedRows);
    try {
      await Promise.all(ids.map((id) => documentsApi.archive(id)));
      setSelectedRows(new Set());
      refetch();
      toast({ title: "Documents archived", description: `${ids.length} document(s) archived.`, variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to archive some documents", variant: "destructive" });
    }
  }, [selectedRows, refetch, toast]);

  const scrollToUpload = useCallback(() => {
    setUploadOpen(true);
    setTimeout(() => uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // Stage label for upload pipeline
  const stageMeta: Record<string, { label: string; color: string }> = {
    uploading:  { label: "Uploading",  color: "text-blue-400" },
    processing: { label: "Processing", color: "text-amber-400" },
    indexing:   { label: "Indexing",   color: "text-violet-400" },
    ready:      { label: "Ready",      color: "text-emerald-400" },
    error:      { label: "Failed",     color: "text-rose-400" },
  };

  const plainTextWordCount = plainTextContent.trim().split(/\s+/).filter(Boolean).length;

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Manage documents that power your chatbot&apos;s intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* KB Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setKnowledgeBaseDialogOpen(true)}>
                <Database className="h-3.5 w-3.5 mr-2" />
                Manage KBs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateKBDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Create KB
              </DropdownMenuItem>
              {preferences && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await updatePreferences({
                        ...preferences,
                        use_default_kb: !preferences.use_default_kb,
                      });
                      refetchPrefs();
                    }}
                  >
                    {preferences.use_default_kb
                      ? <><ToggleRight className="h-3.5 w-3.5 mr-2 text-primary" />Default KB: On</>
                      : <><ToggleLeft className="h-3.5 w-3.5 mr-2" />Default KB: Off</>
                    }
                  </DropdownMenuItem>
                </>
              )}
              {knowledgeBases.filter((kb) => kb.is_active && (!kb.is_default || preferences?.use_default_kb)).length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Upload Target</p>
                    <Select
                      value={selectedKnowledgeBaseId || "none"}
                      onValueChange={(v) => setSelectedKnowledgeBaseId(v === "none" ? undefined : v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (unassigned)</SelectItem>
                        {knowledgeBases
                          .filter((kb) => kb.is_active && (!kb.is_default || preferences?.use_default_kb))
                          .map((kb) => (
                            <SelectItem key={kb.id} value={kb.id}>
                              {kb.name} {kb.is_default ? "(Default)" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => setTestDrawerOpen(true)}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Test Knowledge</span>
          </Button>

          <Button
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={scrollToUpload}
            disabled={uploadQueue.some((u) => u.stage === "uploading")}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Documents</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            onChange={(e) => {
              handleFileSelect(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="hidden"
            aria-label="Upload document files"
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleReplaceFileChange}
            className="hidden"
            aria-label="Replace document file"
          />
        </div>
      </div>

      {/* ── 2. KPI STAT CARDS ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_CARDS.map((card) => {
            const value = stats[card.key];
            return (
              <div
                key={card.key}
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                  "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                )}
              >
                {/* Gradient accent on hover */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  card.accent,
                )} />
                <div className="relative">
                  {/* Icon box */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center mb-3",
                    card.iconBg,
                  )}>
                    <div className={card.iconColor}>
                      {card.icon}
                    </div>
                  </div>

                  {/* Label */}
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                    {card.label}
                  </p>

                  {/* Value + Trend */}
                  <div className="flex items-end gap-2 flex-wrap">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                      {value.toLocaleString()}
                    </p>
                    <div className="pb-0.5">
                      <TrendIndicator value={null} />
                    </div>
                  </div>

                  {/* Subtext */}
                  <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                    vs last period
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. STORAGE + KNOWLEDGE HEALTH ROW ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Storage Usage (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <HardDrive className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Storage Usage
              </p>
            </div>
            {storageUsage && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatStorageSize(storageUsage.used_bytes)} / {formatStorageSize(storageUsage.limit_bytes)}
              </span>
            )}
          </div>
          {storageUsage ? (
            <>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getStorageBarColor(storageUsage.used_percent))}
                  style={{ width: `${Math.min(100, storageUsage.used_percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {Math.round(storageUsage.used_percent)}%
                </span>
                <span className="text-xs text-muted-foreground font-description">used</span>
              </div>
              {storageUsage.used_percent >= 90 && (
                <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5">
                  <p className="text-[11px] text-rose-400 font-medium">Storage nearly full. Consider archiving old documents.</p>
                </div>
              )}
              {storageUsage.used_percent >= 75 && storageUsage.used_percent < 90 && (
                <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                  <p className="text-[11px] text-amber-400 font-medium">Storage usage is high.</p>
                </div>
              )}
            </>
          ) : (
            <Skeleton className="h-8 w-full rounded-lg" />
          )}
        </div>

        {/* Knowledge Health (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
              Knowledge Health
            </p>
          </div>
          {knowledgeHealthScore !== null ? (
            <>
              <div className="flex items-end gap-2 mb-1">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                  {knowledgeHealthScore}%
                </p>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold font-heading tracking-wide mb-1",
                  getHealthGrade(knowledgeHealthScore).badge,
                )}>
                  {getHealthGrade(knowledgeHealthScore).label}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    knowledgeHealthScore >= 75 ? "bg-emerald-500" : knowledgeHealthScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${knowledgeHealthScore}%` }}
                />
              </div>
              <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                Based on unanswered questions in last 30 days
              </p>
            </>
          ) : (
            <Skeleton className="h-12 w-full rounded-lg" />
          )}
        </div>
      </div>

      {/* ── 4. KNOWLEDGE GAP ALERT (conditional) ────────────────────────── */}
      {contentAnalytics?.total_unanswered !== undefined && contentAnalytics.total_unanswered > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Knowledge Gap Alert</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-description">
                {contentAnalytics.total_unanswered} unanswered question{contentAnalytics.total_unanswered > 1 ? "s" : ""} detected in the last 30 days. Upload relevant documents to improve coverage.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={scrollToUpload}
                >
                  <Upload className="h-3 w-3" />
                  Upload docs
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-amber-500"
                  onClick={() => window.location.href = "/dashboard/analytics?tab=content"}
                >
                  View gaps
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. FILTER BAR ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search documents..."
            className="h-9 w-full sm:w-[220px] pl-8 text-xs"
            aria-label="Search documents"
          />
        </div>

        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? null : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter || "all"} onValueChange={(v) => { setTypeFilter(v === "all" ? null : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="txt">TXT</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="md">Markdown</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="link" size="sm" className="text-primary text-xs" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        {/* Bulk actions */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              {selectedRows.size} selected
            </span>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => setBulkArchiveDialogOpen(true)}>
              <Archive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Archive</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 text-rose-400 hover:text-rose-400" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRows(new Set())} aria-label="Clear selection">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── 6. DATA TABLE ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div>
            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-3 w-10"><Skeleton className="h-3 w-3" /></th>
                  <th className="px-3 py-3"><Skeleton className="h-3 w-12" /></th>
                  <th className="px-3 py-3"><Skeleton className="h-3 w-16" /></th>
                  <th className="px-3 py-3"><Skeleton className="h-3 w-8" /></th>
                  <th className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-12" /></th>
                  <th className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-16" /></th>
                  <th className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-3 w-20" /></th>
                  <th className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-3 w-16" /></th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-6 w-6" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sm:hidden divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Failed to load documents</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{queryError.message}</p>
            <Button variant="link" size="sm" className="text-primary text-xs mt-2" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              {documents.length === 0 ? (
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Search className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {documents.length === 0 ? "No documents uploaded yet" : "No documents match your filters"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {documents.length === 0
                ? "Upload PDF, DOCX, TXT, or CSV files to build your chatbot's knowledge base."
                : "Try adjusting your search or filters."}
            </p>
            {documents.length === 0 ? (
              <Button size="sm" className="h-8 text-xs gap-1.5 mt-3" onClick={scrollToUpload}>
                <Upload className="h-3.5 w-3.5" />
                Upload Document
              </Button>
            ) : (
              <Button variant="link" size="sm" className="text-primary text-xs mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-3 w-10">
                    <Checkbox
                      checked={selectedRows.size === paginated.length && paginated.length > 0}
                      onCheckedChange={toggleAllSelection}
                      aria-label="Select all documents"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground w-10">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left">
                    <button onClick={() => handleSort("filename")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hover:text-foreground transition-colors">
                      Filename
                      {sortField === "filename" && <ChevronDown className={cn("h-3 w-3 transition-transform", sortDirection === "asc" && "rotate-180")} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">
                    <button onClick={() => handleSort("file_size")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hover:text-foreground transition-colors">
                      Size
                      {sortField === "file_size" && <ChevronDown className={cn("h-3 w-3 transition-transform", sortDirection === "asc" && "rotate-180")} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">
                    <button onClick={() => handleSort("chunk_count")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hover:text-foreground transition-colors">
                      Chunks
                      {sortField === "chunk_count" && <ChevronDown className={cn("h-3 w-3 transition-transform", sortDirection === "asc" && "rotate-180")} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left hidden xl:table-cell">
                    <button onClick={() => handleSort("upload_date")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hover:text-foreground transition-colors">
                      Upload Date
                      {sortField === "upload_date" && <ChevronDown className={cn("h-3 w-3 transition-transform", sortDirection === "asc" && "rotate-180")} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left hidden xl:table-cell text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Last Used
                  </th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((doc) => {
                  const typeMeta = getFileTypeMeta(doc.source_url ? "url" : doc.file_type);
                  const TypeIcon = typeMeta.icon;
                  const statusMeta = getStatusMeta(doc.status);
                  const isSelected = selectedRows.has(doc.id);
                  const isReindexingDoc = reindexing.has(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/5 hover:bg-primary/8"
                      )}
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(doc.id)}
                          aria-label={`Select ${doc.original_filename}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate max-w-[300px] block text-left"
                        >
                          {doc.original_filename || doc.filename}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading tracking-wide",
                          statusMeta.badge
                        )}>
                          {statusMeta.spinning && <Loader2 className="h-3 w-3 animate-spin" />}
                          {!statusMeta.spinning && <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />}
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">{formatFileSize(doc.file_size)}</span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">
                          {doc.page_count ? `${doc.page_count}p / ` : ""}{doc.chunk_count || "—"} chunks
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {formatDate(doc.upload_date || doc.created_at)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {formatDate(doc.last_retrieved_at)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isReindexingDoc} aria-label={`Actions for ${doc.original_filename}`}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(doc)}>
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {doc.storage_url && (
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                <Download className="h-3.5 w-3.5 mr-2" />
                                Download original
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleArchive(doc)}>
                              {doc.is_archived || doc.status === "archived" ? (
                                <><ArchiveRestore className="h-3.5 w-3.5 mr-2" />Restore</>
                              ) : (
                                <><Archive className="h-3.5 w-3.5 mr-2" />Archive</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReplace(doc.id)}>
                              <Replace className="h-3.5 w-3.5 mr-2" />
                              Replace
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReindex(doc.id)}
                              disabled={isReindexingDoc}
                            >
                              {isReindexingDoc ? (
                                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Reindexing...</>
                              ) : (
                                <><RefreshCw className="h-3.5 w-3.5 mr-2" />Reindex</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(doc.id)}
                              className="text-rose-400 focus:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y">
              {paginated.map((doc) => {
                const typeMeta = getFileTypeMeta(doc.source_url ? "url" : doc.file_type);
                const TypeIcon = typeMeta.icon;
                const statusMeta = getStatusMeta(doc.status);
                const isSelected = selectedRows.has(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(doc.id)}
                      className="mt-1 shrink-0"
                      aria-label={`Select ${doc.original_filename}`}
                    />
                    <TypeIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0" onClick={() => handlePreview(doc)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{doc.original_filename || doc.filename}</span>
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold font-heading shrink-0",
                          statusMeta.badge
                        )}>
                          {statusMeta.spinning && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {!statusMeta.spinning && <span className={cn("h-1 w-1 rounded-full", statusMeta.dot)} />}
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {formatFileSize(doc.file_size)} &middot; {doc.chunk_count || 0} chunks &middot; {formatDate(doc.upload_date || doc.created_at)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Actions">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(doc)}>
                          {doc.is_archived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-2" />Restore</> : <><Archive className="h-3.5 w-3.5 mr-2" />Archive</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(doc.id)} className="text-rose-400 focus:text-rose-400">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 7. UPLOAD ZONE (collapsible, 3 tabs) ────────────────────────── */}
      <div ref={uploadZoneRef}>
        <Collapsible open={uploadOpen || shouldAutoExpandUpload} onOpenChange={setUploadOpen}>
          <div className="rounded-xl border bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <CloudUpload className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Upload Documents
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  (uploadOpen || shouldAutoExpandUpload) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t">
                {/* 3-tab navigation */}
                <div className="flex items-center gap-1 px-4 pt-3">
                  {([
                    { id: "file" as const, label: "File Upload", icon: CloudUpload },
                    { id: "url" as const, label: "Website URL", icon: Link2 },
                    { id: "text" as const, label: "Plain Text", icon: Type },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setUploadTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all",
                        uploadTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {uploadTab === "file" && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop zone for document uploads. Click or drag files here to upload."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleUploadClick(); }
                    }}
                    className={cn(
                      "m-4 p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] rounded-lg border-2 border-dashed",
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn("mb-4 transition-transform duration-200", dragOver && "scale-110")}>
                      <CloudUpload
                        size={40}
                        className={cn("mx-auto", dragOver ? "text-primary" : "text-muted-foreground")}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accepts: PDF, DOCX, TXT, CSV, MD, HTML &middot; Max 50MB per file
                    </p>
                  </div>
                )}

                {uploadTab === "url" && (
                  <div className="p-4">
                    <div className="flex gap-2 max-w-lg">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/docs/page"
                        className="h-9 text-xs flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
                      />
                      <Button
                        size="sm"
                        className="h-9 text-xs gap-1.5"
                        onClick={handleUrlImport}
                        disabled={urlImporting || !urlInput.trim()}
                      >
                        {urlImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Import
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter a public URL to scrape and ingest its content into your knowledge base.
                    </p>
                  </div>
                )}

                {uploadTab === "text" && (
                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium font-heading text-muted-foreground">Document Name</label>
                      <Input
                        value={plainTextName}
                        onChange={(e) => setPlainTextName(e.target.value)}
                        placeholder="e.g. Return Policy FAQ"
                        className="h-9 text-xs max-w-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium font-heading text-muted-foreground">Content</label>
                        <span className="text-[10px] text-muted-foreground font-mono">{plainTextWordCount} words</span>
                      </div>
                      <Textarea
                        value={plainTextContent}
                        onChange={(e) => setPlainTextContent(e.target.value)}
                        placeholder="Paste or type your document content here..."
                        className="text-xs min-h-[120px] resize-y"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 text-xs gap-1.5"
                      onClick={handlePlainTextSubmit}
                      disabled={plainTextSubmitting || !plainTextName.trim() || !plainTextContent.trim()}
                    >
                      {plainTextSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload Text
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* ── UPLOAD QUEUE (processing pipeline) ──────────────────────────── */}
      {uploadQueue.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
              Upload Progress ({uploadQueue.length})
            </span>
          </div>
          <div className="divide-y">
            {uploadQueue.map((item) => {
              const meta = stageMeta[item.stage];
              return (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{item.file.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-[11px] font-semibold font-heading", meta.color)}>
                          {(item.stage === "uploading" || item.stage === "processing" || item.stage === "indexing") && (
                            <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                          )}
                          {item.stage === "ready" && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                          {item.stage === "error" && <AlertCircle className="inline h-3 w-3 mr-1" />}
                          {meta.label}
                        </span>
                        {item.stage !== "ready" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => cancelUpload(item.id)}
                            aria-label="Cancel upload"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.stage !== "error" && (
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            item.stage === "ready" ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.stage === "error" && item.error && (
                      <p className="text-xs text-rose-400 mt-0.5">{item.error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 8. TIPS SECTION ─────────────────────────────────────────────── */}
      {!loading && documents.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-0">
            <Lightbulb className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
              Tips to improve accuracy
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="rounded-xl border bg-card p-4 sm:p-5 -mt-3">
            <ul className="space-y-1.5 text-xs text-muted-foreground font-description">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                Upload specific, detailed documents
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                Keep documents focused on one topic
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                Update documents when your business information changes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                Check Analytics &rarr; Unanswered Questions for knowledge gaps
              </li>
            </ul>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TEST KNOWLEDGE BASE DRAWER (Sheet)
         ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={testDrawerOpen} onOpenChange={setTestDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b shrink-0">
            <SheetTitle className="font-heading text-base font-semibold text-foreground">
              Test Knowledge Base
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Ask questions to verify your chatbot&apos;s knowledge.
            </SheetDescription>
          </SheetHeader>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {testMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageSquareText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Ask a question</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Test how your chatbot responds using your uploaded documents.
                </p>
              </div>
            )}
            {testMessages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "px-4 py-2.5 max-w-[85%] sm:max-w-[75%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : "bg-muted border rounded-2xl rounded-bl-md"
                )}>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    msg.role === "assistant" && "text-foreground"
                  )}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {testLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={testMessagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t px-4 py-3 shrink-0">
            <div className="flex gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type a question..."
                className="h-9 text-xs flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTestSend(); } }}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleTestSend}
                disabled={testLoading || !testInput.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS & MODALS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ── DOCUMENT PREVIEW MODAL ───────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
            <DialogTitle className="font-heading text-base font-semibold text-foreground">
              {previewDoc?.original_filename || previewDoc?.filename || "Document Preview"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              This is what your chatbot can read
            </DialogDescription>
          </div>

          {previewDoc && (
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Type", value: (previewDoc.file_type || "—").toUpperCase() },
                  { label: "Status", value: getStatusMeta(previewDoc.status).label },
                  { label: "Size", value: formatFileSize(previewDoc.file_size) },
                  { label: "Pages", value: previewDoc.page_count ?? "—" },
                  { label: "Chunks", value: previewDoc.chunk_count || 0 },
                  { label: "Uploaded", value: formatDate(previewDoc.upload_date || previewDoc.created_at) },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium text-foreground font-mono">{item.value}</p>
                  </div>
                ))}
              </div>

              {previewDoc.status && (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading tracking-wide",
                    getStatusMeta(previewDoc.status).badge
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", getStatusMeta(previewDoc.status).dot)} />
                    {getStatusMeta(previewDoc.status).label}
                  </span>
                </div>
              )}

              {previewDoc.error_message && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">Error</p>
                    <p>{previewDoc.error_message}</p>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted/30 border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {previewDoc.chunk_count || 0} chunks extracted
                  </p>
                  <button
                    onClick={() => setChunksExpanded(!chunksExpanded)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {chunksExpanded ? "Hide chunks" : "View all chunks"}
                  </button>
                </div>
                {chunksExpanded && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground/60 italic">
                      Chunk data will be loaded from the API when available.
                    </p>
                  </div>
                )}
              </div>

              {previewDoc.last_retrieved_at && (
                <p className="text-xs text-muted-foreground">
                  Last used in conversation: <span className="font-mono">{formatDate(previewDoc.last_retrieved_at)}</span>
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── KB MANAGEMENT DIALOG ─────────────────────────────────────────── */}
      <Dialog open={knowledgeBaseDialogOpen} onOpenChange={setKnowledgeBaseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
            <DialogTitle className="font-heading text-base font-semibold text-foreground">
              Manage Knowledge Bases
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Create, edit, and manage your custom knowledge bases
            </DialogDescription>
          </div>
          <div className="px-6 py-5 space-y-3">
            {/* Default KB toggle */}
            {!kbLoading && preferences && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Default Knowledge Base</span>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold font-heading bg-gray-500/10 text-gray-400 border-gray-500/20">
                      System
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Documentation from data/docs folder</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={async () => {
                    await updatePreferences({ ...preferences, use_default_kb: !preferences.use_default_kb });
                    refetchPrefs();
                  }}
                >
                  {preferences.use_default_kb
                    ? <><ToggleRight className="h-4 w-4 text-primary" /><span>Enabled</span></>
                    : <><ToggleLeft className="h-4 w-4 text-muted-foreground" /><span>Disabled</span></>
                  }
                </Button>
              </div>
            )}

            {knowledgeBases.filter((kb) => !kb.is_default).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No custom knowledge bases yet.</p>
            ) : (
              knowledgeBases
                .filter((kb) => !kb.is_default)
                .map((kb) => (
                  <div key={kb.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{kb.name}</p>
                      {kb.description && <p className="text-xs text-muted-foreground mt-0.5">{kb.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={async () => {
                          try {
                            await updateKnowledgeBase(kb.id, { is_active: !kb.is_active });
                            refetchKBs();
                          } catch { /* handled by hook */ }
                        }}
                      >
                        {kb.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-400 hover:text-rose-400"
                        onClick={async () => {
                          if (confirm(`Delete knowledge base "${kb.name}"?`)) {
                            try {
                              await deleteKnowledgeBase(kb.id);
                              refetchKBs();
                            } catch { /* handled by hook */ }
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CREATE KB DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={createKBDialogOpen} onOpenChange={setCreateKBDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
            <DialogTitle className="font-heading text-base font-semibold text-foreground">
              Create Knowledge Base
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Organize your documents into separate knowledge bases.
            </DialogDescription>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium font-heading">Name</label>
              <Input
                value={newKBName}
                onChange={(e) => setNewKBName(e.target.value)}
                placeholder="My Knowledge Base"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium font-heading">Description (optional)</label>
              <Input
                value={newKBDescription}
                onChange={(e) => setNewKBDescription(e.target.value)}
                placeholder="What this knowledge base is for"
                className="h-9 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => { setCreateKBDialogOpen(false); setNewKBName(""); setNewKBDescription(""); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs gap-1.5"
                disabled={creatingKB || !newKBName.trim()}
                onClick={async () => {
                  if (!newKBName.trim()) return;
                  try {
                    await createKnowledgeBase({
                      name: newKBName.trim(),
                      ...(newKBDescription.trim() ? { description: newKBDescription.trim() } : {}),
                    });
                    setCreateKBDialogOpen(false);
                    setNewKBName("");
                    setNewKBDescription("");
                    refetchKBs();
                  } catch { /* handled by hook */ }
                }}
              >
                {creatingKB && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMATION DIALOGS ─────────────────────────────────────────── */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Document"
        description="Deleting this removes it from your chatbot's knowledge. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationDialog
        open={!!duplicatePrompt}
        onOpenChange={(open) => {
          if (!open && duplicatePrompt) {
            duplicatePrompt.resolve(false);
            setDuplicatePrompt(null);
          }
        }}
        title="Duplicate document detected"
        description={
          duplicatePrompt
            ? duplicatePrompt.response.duplicate_of
              ? `"${duplicatePrompt.fileName}" appears to be a duplicate of an existing document. Upload anyway?`
              : `"${duplicatePrompt.fileName}" appears to be a duplicate. Upload anyway?`
            : ""
        }
        confirmLabel="Upload anyway"
        cancelLabel="Cancel"
        confirmVariant="default"
        onConfirm={() => {
          if (duplicatePrompt) {
            duplicatePrompt.resolve(true);
            setDuplicatePrompt(null);
          }
        }}
      />

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Documents"
        description={`Deleting ${selectedRows.size} document(s) removes them from your chatbot's knowledge. This cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmBulkDelete}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationDialog
        open={bulkArchiveDialogOpen}
        onOpenChange={setBulkArchiveDialogOpen}
        title="Archive Documents"
        description={`Archive ${selectedRows.size} document(s)? They will be removed from your chatbot's active knowledge but can be restored later.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        confirmVariant="default"
        onConfirm={confirmBulkArchive}
        isLoading={false}
      />
    </div>
  );
}
