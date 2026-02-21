import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  FileText,
  Upload,
  Search,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Pause,
  Play,
  Check,
  FileIcon,
  FileCode,
  File,
  Database,
  Plus,
  Settings,
  ToggleLeft,
  ToggleRight,
  Filter,
  FilterX,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Document, ApiError, documentsApi } from "@/lib/api";
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
import { useDebounce } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/error/EmptyState";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCountUp } from "@/hooks/useCountUp";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const statusConfig = {
  indexed: { icon: CheckCircle2, label: "Indexed", className: "text-green-600 dark:text-green-500", bgColor: "bg-green-50 dark:bg-green-950/20", borderColor: "border-green-200 dark:border-green-800" },
  processing: { icon: Clock, label: "Processing", className: "text-amber-600 dark:text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/20", borderColor: "border-amber-200 dark:border-amber-800" },
  error: { icon: AlertCircle, label: "Error", className: "text-red-600 dark:text-red-500", bgColor: "bg-red-50 dark:bg-red-950/20", borderColor: "border-red-200 dark:border-red-800" },
};

type SortField = "name" | "type" | "status" | "chunk_count" | "updated_at";
type SortDirection = "asc" | "desc";

interface UploadFileItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "paused" | "completed" | "error";
  error?: string;
  preview?: string;
}

interface ColumnVisibility {
  name: boolean;
  type: boolean;
  status: boolean;
  chunks: boolean;
  updated: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pdf":
      return FileText;
    case "docx":
      return FileText;
    case "html":
    case "htm":
      return FileCode;
    case "md":
    case "markdown":
      return FileText;
    case "txt":
      return File;
    default:
      return FileIcon;
  }
}

function readFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      reader.readAsText(file);
    } else {
      resolve("");
    }
  });
}

// Mobile Document Card Component with Swipe Actions
interface MobileDocumentCardProps {
  doc: Document;
  status: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; className: string };
  StatusIcon: React.ComponentType<{ size?: number; className?: string }>;
  FileIcon: React.ComponentType<{ size?: number; className?: string }>;
  isSelected: boolean;
  isReindexing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onReindex: () => void;
  onDelete: () => void;
  formatDate: (dateString: string) => string;
}

function MobileDocumentCard({
  doc,
  status,
  StatusIcon,
  FileIcon,
  isSelected,
  isReindexing,
  onSelect,
  onPreview,
  onEdit,
  onReindex,
  onDelete,
  formatDate,
}: MobileDocumentCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const SWIPE_THRESHOLD = 100;
  const ACTION_WIDTH = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      e.preventDefault();
      setSwipeOffset(Math.max(-ACTION_WIDTH, deltaX));
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;
    const shouldReveal = swipeOffset < -SWIPE_THRESHOLD / 2;

    if (shouldReveal) {
      setSwipeOffset(-ACTION_WIDTH);
    } else {
      setSwipeOffset(0);
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  };

  return (
    <div className="relative overflow-hidden touch-pan-y">
      {/* Swipe Actions Background */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center bg-destructive/90 z-10 transition-all duration-200"
        style={{ width: `${ACTION_WIDTH}px`, transform: `translateX(${ACTION_WIDTH + swipeOffset}px)` }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full text-destructive-foreground hover:bg-destructive rounded-none min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setSwipeOffset(0);
          }}
          aria-label={`Delete ${doc.name}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </Button>
      </div>

      {/* Card Content */}
      <div
        className={`relative bg-background border border-border rounded-lg p-4 transition-transform duration-200 ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1 min-w-[44px] min-h-[44px]"
            aria-label={`Select ${doc.name}`}
          />
          <div className="flex-1 min-w-0">
            <button
              onClick={onPreview}
              className="flex items-start gap-2 w-full text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
              aria-label={`Preview ${doc.name} document`}
            >
              <FileIcon size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-medium text-foreground truncate">{doc.name}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[12px] uppercase">
                    {doc.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${status.className} ${status.bgColor} ${status.borderColor} border text-[12px] font-medium`}
                  >
                    <StatusIcon size={12} className="mr-1" aria-hidden="true" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[12px] text-muted-foreground">
                  {doc.chunk_count !== null && doc.chunk_count !== undefined && (
                    <span>{doc.chunk_count} chunks</span>
                  )}
                  <span>{formatDate(doc.updated_at)}</span>
                </div>
              </div>
            </button>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreview}
                className="flex-1 min-h-[44px] text-[14px]"
                aria-label={`Preview ${doc.name}`}
              >
                <Eye size={16} className="mr-2" aria-hidden="true" />
                Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="flex-1 min-h-[44px] text-[14px]"
                aria-label={`Edit ${doc.name}`}
              >
                <Edit2 size={16} className="mr-2" aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReindex}
                disabled={isReindexing}
                className="flex-1 min-h-[44px] text-[14px]"
                aria-label={isReindexing ? `Reindexing ${doc.name}` : `Reindex ${doc.name}`}
              >
                {isReindexing ? (
                  <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={16} className="mr-2" aria-hidden="true" />
                )}
                Reindex
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [reindexing, setReindexing] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFileItem[]>([]);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    name: true,
    type: true,
    status: true,
    chunks: true,
    updated: true,
  });
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | undefined>(undefined);
  const [knowledgeBaseDialogOpen, setKnowledgeBaseDialogOpen] = useState(false);
  const [createKBDialogOpen, setCreateKBDialogOpen] = useState(false);
  const [newKBName, setNewKBName] = useState("");
  const [newKBDescription, setNewKBDescription] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [kbSectionOpen, setKbSectionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use React Query for documents fetching with caching
  const {
    data: documentsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useDocuments({ search: debouncedSearch || undefined });

  const documents = documentsData?.documents || [];
  const error = queryError?.message || null;

  // Knowledge Bases
  const { knowledgeBases, loading: kbLoading, refetch: refetchKBs } = useKnowledgeBases();
  const { preferences, updatePreferences, refetch: refetchPrefs } = useKnowledgeBasePreferences();
  const { createKnowledgeBase, loading: creatingKB } = useCreateKnowledgeBase();
  const { updateKnowledgeBase, loading: updatingKB } = useUpdateKnowledgeBase();
  const { deleteKnowledgeBase, loading: deletingKB } = useDeleteKnowledgeBase();

  // Mutations
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const reindexMutation = useReindexDocument();
  const updateMutation = useUpdateDocument();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validExtensions = [".md", ".html", ".htm", ".txt", ".pdf", ".docx"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const newFiles: UploadFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: "Invalid file",
          description: `${file.name} has unsupported format`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const preview = await readFilePreview(file).catch(() => "");
      const uploadItem: UploadFileItem = {
        id: `${Date.now()}-${i}`,
        file,
        progress: 0,
        status: "pending",
        preview: preview.substring(0, 500),
      };
      newFiles.push(uploadItem);
    }

    setUploadQueue((prev) => [...prev, ...newFiles]);
    processUploadQueue([...uploadQueue, ...newFiles]);
  };

  const processUploadQueue = async (queue: UploadFileItem[]) => {
    for (const item of queue) {
      if (item.status === "pending" || item.status === "paused") {
        await uploadFile(item);
      }
    }
  };

  const uploadFile = async (item: UploadFileItem) => {
    setUploadQueue((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i))
    );

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadQueue((prev) =>
          prev.map((i) => {
            if (i.id === item.id && i.status === "uploading" && i.progress < 90) {
              return { ...i, progress: i.progress + 10 };
            }
            return i;
          })
        );
      }, 200);

      await uploadMutation.mutateAsync({ file: item.file, knowledge_base_id: selectedKnowledgeBaseId });

      clearInterval(progressInterval);
      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "completed", progress: 100 } : i
        )
      );

      // React Query will automatically refetch documents list
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((i) => i.id !== item.id));
      }, 2000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to upload document";
      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", error: errorMessage, progress: 0 }
            : i
        )
      );
    }
  };

  const pauseUpload = (id: string) => {
    setUploadQueue((prev) =>
      prev.map((i) => (i.id === id && i.status === "uploading" ? { ...i, status: "paused" } : i))
    );
  };

  const resumeUpload = (id: string) => {
    const item = uploadQueue.find((i) => i.id === id);
    if (item) {
      uploadFile(item);
    }
  };

  const cancelUpload = (id: string) => {
    setUploadQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleReindex = async (docId: string) => {
    try {
      setReindexing((prev) => new Set(prev).add(docId));
      await reindexMutation.mutateAsync(docId);
      // React Query will automatically refetch documents list
    } catch (err) {
      // Error is handled by the mutation's onError
    } finally {
      setReindexing((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const handleDeleteClick = (docId: string) => {
    setDeleteTargetId(docId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      // React Query will automatically refetch documents list
    } catch (err) {
      // Error is handled by the mutation's onError
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedRows.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedRows);
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      setSelectedRows(new Set());
      // React Query will automatically refetch documents list
      toast({
        title: "Success",
        description: `${ids.length} document(s) deleted successfully`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete some documents",
        variant: "destructive",
      });
    }
  };

  const handleBulkReindex = async () => {
    const ids = Array.from(selectedRows);
    try {
      setReindexing(new Set(ids));
      await Promise.all(ids.map((id) => reindexMutation.mutateAsync(id)));
      setSelectedRows(new Set());
      // React Query will automatically refetch documents list
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to reindex some documents",
        variant: "destructive",
      });
    } finally {
      setReindexing(new Set());
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEditStart = (doc: Document) => {
    setEditingId(doc.id);
    setEditingName(doc.name);
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, updates: { name: editingName } });
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handlePreview = async (doc: Document) => {
    try {
      const detail = await documentsApi.get(doc.id);
      setPreviewDocument(detail.document);
      setPreviewOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive",
      });
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map((d) => d.id)));
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = documents.length;
    const indexed = documents.filter((d) => d.status === "indexed").length;
    const processing = documents.filter((d) => d.status === "processing").length;
    const error = documents.filter((d) => d.status === "error").length;
    return { total, indexed, processing, error };
  }, [documents]);

  // Animated stats
  const totalCount = useCountUp(stats.total, 800, 0, "");
  const indexedCount = useCountUp(stats.indexed, 800, 0, "");
  const processingCount = useCountUp(stats.processing, 800, 0, "");
  const errorCount = useCountUp(stats.error, 800, 0, "");

  const filtered = useMemo(() => {
    let result = documents.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      result = result.filter((d) => d.type.toLowerCase() === typeFilter.toLowerCase());
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "updated_at" || sortField === "name") {
        aVal = sortField === "updated_at" ? new Date(aVal).getTime() : aVal.toLowerCase();
        bVal = sortField === "updated_at" ? new Date(bVal).getTime() : bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, search, sortField, sortDirection, statusFilter, typeFilter]);

  const hasActiveFilters = statusFilter !== null && statusFilter !== "all" || (typeFilter !== null && typeFilter !== "all");
  const clearFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-muted-foreground" />;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1" id="documents-description">
            Manage knowledge base documents for the chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleUploadClick} 
            disabled={uploadQueue.some((u) => u.status === "uploading")}
            className={isTablet ? "min-h-[44px]" : ""}
          >
            <Upload size={16} className="mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.html,.htm,.txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload document files"
          />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className={`grid grid-cols-1 ${isTablet ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"} gap-4`}>
        <div className="bg-background rounded-xl border border-border/40 p-6 hover:border-border/60 transition-all duration-200 hover:shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-semibold text-foreground tracking-tight mb-2">
              {totalCount}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Total Documents
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border/40 p-6 hover:border-border/60 transition-all duration-200 hover:shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-semibold text-green-600 dark:text-green-500 tracking-tight mb-2">
              {indexedCount}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Indexed
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border/40 p-6 hover:border-border/60 transition-all duration-200 hover:shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-500 tracking-tight mb-2">
              {processingCount}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Processing
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border/40 p-6 hover:border-border/60 transition-all duration-200 hover:shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-semibold text-red-600 dark:text-red-500 tracking-tight mb-2">
              {errorCount}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Errors
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className={isTablet ? "h-11 text-base" : ""}
            aria-label="Search documents"
            aria-describedby="documents-description"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}>
            <SelectTrigger className={`w-[140px] ${isTablet ? "min-h-[44px]" : ""}`}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? null : v)}>
            <SelectTrigger className={`w-[140px] ${isTablet ? "min-h-[44px]" : ""}`}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="md">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="txt">Text</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className={isTablet ? "min-h-[44px]" : ""}
            >
              <FilterX size={14} className="mr-2" />
              Clear
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={isTablet ? "min-h-[44px]" : ""}>
                <Eye size={14} className="mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(columnVisibility).map(([key, visible]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={visible}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, [key]: checked }))
                  }
                >
                  {key === "name" && "Name"}
                  {key === "type" && "Type"}
                  {key === "status" && "Status"}
                  {key === "chunks" && "Chunks"}
                  {key === "updated" && "Updated"}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {statusFilter && statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter}
              <button
                onClick={() => setStatusFilter(null)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                aria-label="Remove status filter"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
          {typeFilter && typeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter.toUpperCase()}
              <button
                onClick={() => setTypeFilter(null)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                aria-label="Remove type filter"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Enhanced Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        role="button"
        tabIndex={0}
        aria-label="Drop zone for document uploads. Click or drag files here to upload."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleUploadClick();
          }
        }}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[200px] flex flex-col items-center justify-center ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
          dragOver ? "bg-primary/5 opacity-100" : "opacity-0"
        }`} />
        <div className="relative z-10">
          <div className={`mb-4 transition-transform duration-200 ${dragOver ? "scale-110" : ""}`}>
            <FileText size={48} className={`mx-auto ${dragOver ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">
            Drag and drop files here
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports .md, .txt, .html, .pdf, .docx — Max 10MB per file
          </p>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-4 border border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload size={16} />
            Upload Queue ({uploadQueue.length})
          </h3>
          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="bg-background border border-border rounded-lg p-4 space-y-3 transition-all hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText size={18} className="text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{item.file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "uploading" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => pauseUpload(item.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Pause upload"
                      >
                        <Pause size={14} />
                      </Button>
                    )}
                    {item.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resumeUpload(item.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Resume upload"
                      >
                        <Play size={14} />
                      </Button>
                    )}
                    {item.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelUpload(item.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label="Cancel upload"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                {item.status === "uploading" && (
                  <div className="space-y-1">
                    <Progress value={item.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{item.progress}%</span>
                  </div>
                )}
                {item.status === "completed" && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                    <CheckCircle2 size={16} />
                    <span>Upload complete</span>
                  </div>
                )}
                {item.status === "error" && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle size={16} />
                    <span>{item.error || "Upload failed"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base Management Section - Collapsible */}
      <Collapsible open={kbSectionOpen} onOpenChange={setKbSectionOpen}>
        <div className="bg-card border border-border rounded-lg">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-primary" />
                <h3 className="text-[15px] font-semibold text-foreground">Knowledge Bases</h3>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${kbSectionOpen ? "rotate-90" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKnowledgeBaseDialogOpen(true)}
                className={isTablet ? "min-h-[44px]" : ""}
              >
                <Settings size={16} className="mr-2" />
                Manage
              </Button>
            </div>

            {/* Default KB Toggle */}
        {kbLoading || (preferences === null && !error) ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : preferences ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Default Knowledge Base</span>
                <Badge variant="secondary">System</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Documentation from data/docs folder
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (preferences) {
                  await updatePreferences({
                    ...preferences,
                    use_default_kb: !preferences.use_default_kb,
                  });
                  refetchPrefs();
                }
              }}
              className="flex items-center gap-2"
            >
              {preferences.use_default_kb ? (
                <>
                  <ToggleRight size={20} className="text-primary" />
                  <span className="text-sm">Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={20} className="text-muted-foreground" />
                  <span className="text-sm">Disabled</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg mb-3">
            <p className="text-sm">Failed to load preferences. Please refresh the page.</p>
          </div>
        )}

        {/* Custom Knowledge Bases */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Custom Knowledge Bases</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateKBDialogOpen(true)}
              className={isTablet ? "min-h-[44px]" : ""}
            >
              <Plus size={16} className="mr-2" />
              Create
            </Button>
          </div>
          {kbLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : knowledgeBases.filter((kb) => !kb.is_default).length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded">
              No custom knowledge bases. Create one to organize your documents.
            </p>
          ) : (
            <div className="space-y-2">
              {knowledgeBases
                .filter((kb) => !kb.is_default)
                .map((kb) => (
                  <div
                    key={kb.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{kb.name}</span>
                        {kb.description && (
                          <span className="text-xs text-muted-foreground">• {kb.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={preferences?.active_kb_ids.includes(kb.id) || false}
                        onCheckedChange={async (checked) => {
                          if (preferences) {
                            const newActiveIds = checked
                              ? [...preferences.active_kb_ids, kb.id]
                              : preferences.active_kb_ids.filter((id) => id !== kb.id);
                            await updatePreferences({
                              ...preferences,
                              active_kb_ids: newActiveIds,
                            });
                            refetchPrefs();
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {preferences?.active_kb_ids.includes(kb.id) ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

            {/* Knowledge Base Selection for Upload */}
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium mb-2 block">Upload to Knowledge Base</label>
              <Select
                value={selectedKnowledgeBaseId || "none"}
                onValueChange={(value) => setSelectedKnowledgeBaseId(value === "none" ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a knowledge base (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (unassigned)</SelectItem>
                  {knowledgeBases
                    .filter((kb) => kb.is_active && (!kb.is_default || preferences?.use_default_kb))
                    .map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name} {kb.is_default && "(Default)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Documents uploaded without a selection will not be assigned to any knowledge base.
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Knowledge Base Management Dialog */}
      <Dialog open={knowledgeBaseDialogOpen} onOpenChange={setKnowledgeBaseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Knowledge Bases</DialogTitle>
            <DialogDescription>
              Create, edit, and manage your custom knowledge bases
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {knowledgeBases
              .filter((kb) => !kb.is_default)
              .map((kb) => (
                <div key={kb.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{kb.name}</div>
                    {kb.description && (
                      <div className="text-sm text-muted-foreground mt-1">{kb.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateKnowledgeBase(kb.id, { is_active: !kb.is_active });
                          refetchKBs();
                        } catch (err) {
                          // Error handled by hook
                        }
                      }}
                    >
                      {kb.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Delete knowledge base "${kb.name}"?`)) {
                          try {
                            await deleteKnowledgeBase(kb.id);
                            refetchKBs();
                          } catch (err) {
                            // Error handled by hook
                          }
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Knowledge Base Dialog */}
      <Dialog open={createKBDialogOpen} onOpenChange={setCreateKBDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Create a new knowledge base to organize your documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newKBName}
                onChange={(e) => setNewKBName(e.target.value)}
                placeholder="My Knowledge Base"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                value={newKBDescription}
                onChange={(e) => setNewKBDescription(e.target.value)}
                placeholder="Description of this knowledge base"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateKBDialogOpen(false);
                  setNewKBName("");
                  setNewKBDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newKBName.trim()) {
                    toast({
                      title: "Error",
                      description: "Name is required",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    await createKnowledgeBase({
                      name: newKBName.trim(),
                      description: newKBDescription.trim() || undefined,
                    });
                    setCreateKBDialogOpen(false);
                    setNewKBName("");
                    setNewKBDescription("");
                    refetchKBs();
                    // Auto-select the new KB
                    const newKB = knowledgeBases.find((kb) => kb.name === newKBName.trim());
                    if (newKB) {
                      setSelectedKnowledgeBaseId(newKB.id);
                    }
                  } catch (err) {
                    // Error handled by hook
                  }
                }}
                disabled={creatingKB || !newKBName.trim()}
              >
                {creatingKB ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Bulk Action Floating Bar */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium">
            {selectedRows.size} document{selectedRows.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReindex}
              disabled={Array.from(selectedRows).some((id) => reindexing.has(id))}
            >
              <RefreshCw size={14} className="mr-2" />
              Reindex
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDeleteClick}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              className="ml-2"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : queryError ? (
          <div className="p-6">
            <NetworkErrorState
              error={queryError as ApiError}
              onRetry={() => refetch()}
              variant="compact"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={documents.length === 0 ? FileText : Search}
              title={documents.length === 0 ? "No documents uploaded yet" : "No documents match your search"}
              description={
                documents.length === 0
                  ? "Get started by uploading your first document. Supported formats include Markdown, HTML, Text, PDF, and DOCX."
                  : "Try adjusting your search or filters to find what you're looking for."
              }
              action={
                documents.length === 0
                  ? {
                      label: "Upload Document",
                      onClick: () => fileInputRef.current?.click(),
                      variant: "default",
                    }
                  : undefined
              }
              secondaryAction={
                documents.length > 0
                  ? {
                      label: "Clear Search",
                      onClick: () => setSearch(""),
                      variant: "outline",
                    }
                  : undefined
              }
              size="md"
            />
          </div>
        ) : isMobile ? (
          // Mobile Card View with Swipe Actions
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filtered.map((doc) => {
              const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.processing;
              const StatusIcon = status.icon;
              const isReindexing = reindexing.has(doc.id);
              const isSelected = selectedRows.has(doc.id);
              const FileIcon = getFileIcon(doc.type);

              return (
                <MobileDocumentCard
                  key={doc.id}
                  doc={doc}
                  status={status}
                  StatusIcon={StatusIcon}
                  FileIcon={FileIcon}
                  isSelected={isSelected}
                  isReindexing={isReindexing}
                  onSelect={() => toggleRowSelection(doc.id)}
                  onPreview={() => handlePreview(doc)}
                  onEdit={() => handleEditStart(doc)}
                  onReindex={() => handleReindex(doc.id)}
                  onDelete={() => handleDeleteClick(doc.id)}
                  formatDate={formatDate}
                />
              );
            })}
          </div>
        ) : (
          // Desktop & Tablet Table View
          <div className={`max-h-[600px] overflow-y-auto ${isTablet ? "overflow-x-auto" : ""}`}>
            <Table className={isTablet ? "min-w-[800px]" : ""}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAllSelection}
                    aria-label="Select all documents"
                  />
                </TableHead>
                {columnVisibility.name && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                )}
                {columnVisibility.type && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("type")}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Type
                      <SortIcon field="type" />
                    </button>
                  </TableHead>
                )}
                {columnVisibility.status && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                )}
                {columnVisibility.chunks && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("chunk_count")}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Chunks
                      <SortIcon field="chunk_count" />
                    </button>
                  </TableHead>
                )}
                {columnVisibility.updated && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("updated_at")}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Updated
                      <SortIcon field="updated_at" />
                    </button>
                  </TableHead>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => {
                const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.processing;
                const StatusIcon = status.icon;
                const isReindexing = reindexing.has(doc.id);
                const isSelected = selectedRows.has(doc.id);
                const isEditing = editingId === doc.id;
                const FileIcon = getFileIcon(doc.type);

                return (
                  <TableRow
                    key={doc.id}
                    className={`transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(doc.id)}
                        aria-label={`Select ${doc.name}`}
                      />
                    </TableCell>
                    {columnVisibility.name && (
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(doc.id);
                                if (e.key === "Escape") handleEditCancel();
                              }}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSave(doc.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePreview(doc)}
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                            aria-label={`Preview ${doc.name} document`}
                          >
                            <FileIcon size={16} className="text-muted-foreground" aria-hidden="true" />
                            <span className="text-[14px] font-medium text-foreground">{doc.name}</span>
                          </button>
                        )}
                      </TableCell>
                    )}
                    {columnVisibility.type && (
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {doc.type}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.status && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${status.className} ${status.bgColor} ${status.borderColor} border font-medium`}
                        >
                          <StatusIcon size={12} className="mr-1.5" />
                          {status.label}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.chunks && (
                      <TableCell>
                        <span className="text-[13px] text-muted-foreground">{doc.chunk_count || "—"}</span>
                      </TableCell>
                    )}
                    {columnVisibility.updated && (
                      <TableCell>
                        <span className="text-[13px] text-muted-foreground">{formatDate(doc.updated_at)}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={isReindexing}
                            aria-label={`More options for ${doc.name}`}
                            aria-haspopup="true"
                          >
                            <MoreHorizontal size={16} aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(doc)} aria-label={`Preview ${doc.name}`}>
                            <Eye size={14} className="mr-2" aria-hidden="true" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditStart(doc)} aria-label={`Edit name of ${doc.name}`}>
                            <Edit2 size={14} className="mr-2" aria-hidden="true" />
                            Edit Name
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReindex(doc.id)}
                            disabled={isReindexing}
                            aria-label={isReindexing ? `Reindexing ${doc.name}` : `Reindex ${doc.name}`}
                          >
                            {isReindexing ? (
                              <>
                                <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" />
                                Reindexing...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} className="mr-2" aria-hidden="true" />
                                Reindex
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(doc.id)}
                            className="text-destructive"
                            aria-label={`Delete ${doc.name}`}
                          >
                            <Trash2 size={14} className="mr-2" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Document Preview Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{previewDocument?.name}</SheetTitle>
            <SheetDescription>
              Document details and preview
            </SheetDescription>
          </SheetHeader>
          {previewDocument && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{previewDocument.type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = statusConfig[previewDocument.status as keyof typeof statusConfig] || statusConfig.processing;
                      const StatusIcon = status.icon;
                      return (
                        <>
                          <StatusIcon size={14} className={status.className} />
                          <span className={`text-sm ${status.className}`}>{status.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chunk Count</p>
                  <p className="text-sm font-medium">{previewDocument.chunk_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Size</p>
                  <p className="text-sm font-medium">{formatFileSize(previewDocument.file_size)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(previewDocument.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Indexed</p>
                  <p className="text-sm font-medium">
                    {previewDocument.last_indexed_at
                      ? formatDate(previewDocument.last_indexed_at)
                      : "Never"}
                  </p>
                </div>
              </div>
              {previewDocument.error_message && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Error:</p>
                    <p>{previewDocument.error_message}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Document Statistics</p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Chunks:</span>
                    <span className="text-sm font-medium">{previewDocument.chunk_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">File Size:</span>
                    <span className="text-sm font-medium">{formatFileSize(previewDocument.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated:</span>
                    <span className="text-sm font-medium">{formatDate(previewDocument.updated_at)}</span>
                  </div>
                  {previewDocument.last_indexed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Indexed:</span>
                      <span className="text-sm font-medium">{formatDate(previewDocument.last_indexed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Documents"
        description={`Are you sure you want to delete ${selectedRows.size} document(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmBulkDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
