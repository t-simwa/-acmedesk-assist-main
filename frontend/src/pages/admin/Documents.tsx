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
} from "lucide-react";
import { Document, ApiError } from "@/lib/api";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useReindexDocument,
  useUpdateDocument,
} from "@/hooks/useDocuments";
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

const statusConfig = {
  indexed: { icon: CheckCircle2, label: "Indexed", className: "text-primary" },
  processing: { icon: Clock, label: "Processing", className: "text-muted-foreground" },
  error: { icon: AlertCircle, label: "Error", className: "text-destructive" },
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

export default function Documents() {
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

      await uploadMutation.mutateAsync(item.file);

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

  const handleDelete = async (docId: string) => {
    try {
      await deleteMutation.mutateAsync(docId);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      // React Query will automatically refetch documents list
    } catch (err) {
      // Error is handled by the mutation's onError
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRows);
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      setSelectedRows(new Set());
      // React Query will automatically refetch documents list
      toast({
        title: "Success",
        description: `${ids.length} document(s) deleted successfully`,
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
      await documentsApi.update(id, { name: editingName });
      await fetchDocuments(search);
      setEditingId(null);
      setEditingName("");
      toast({
        title: "Success",
        description: "Document name updated",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update document name",
        variant: "destructive",
      });
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

  const filtered = useMemo(() => {
    let result = documents.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

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
  }, [documents, search, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-muted-foreground" />;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-[14px] text-muted-foreground mt-1" id="documents-description">
            Manage knowledge base documents for the chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRows.size} selected
              </span>
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
                onClick={handleBulkDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </Button>
            </div>
          )}
          <Button onClick={handleUploadClick} disabled={uploadQueue.some((u) => u.status === "uploading")}>
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

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Upload Queue</h3>
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className="bg-background border border-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText size={16} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{item.file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(item.file.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "uploading" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pauseUpload(item.id)}
                      className="h-8"
                    >
                      <Pause size={14} />
                    </Button>
                  )}
                  {item.status === "paused" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resumeUpload(item.id)}
                      className="h-8"
                    >
                      <Play size={14} />
                    </Button>
                  )}
                  {item.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelUpload(item.id)}
                      className="h-8 text-destructive"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              </div>
              {item.status === "uploading" && (
                <Progress value={item.progress} className="h-2" />
              )}
              {item.status === "completed" && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 size={14} />
                  <span>Upload complete</span>
                </div>
              )}
              {item.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle size={14} />
                  <span>{item.error || "Upload failed"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
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
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
          dragOver
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50"
        }`}
      >
        <FileText size={24} className="mx-auto text-muted-foreground mb-2" aria-hidden="true" />
        <p className="text-[14px] text-muted-foreground">
          Drag and drop files here, or click Upload
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Supports .md, .txt, .html, .pdf, .docx — Max 10MB per file
        </p>
      </div>

      {/* Search and Table Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
            aria-label="Search documents"
            aria-describedby="documents-description"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
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

      {/* Table */}
      <div className="bg-background rounded-xl border border-border shadow-soft-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={48} className="text-muted-foreground mb-4" />
            <p className="text-[14px] text-muted-foreground">
              {documents.length === 0 ? "No documents uploaded yet" : "No documents match your search"}
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
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
                    className={isSelected ? "bg-muted" : ""}
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
                        <div className="flex items-center gap-1.5">
                          <StatusIcon size={14} className={status.className} />
                          <span className={`text-[13px] ${status.className}`}>{status.label}</span>
                        </div>
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
                            onClick={() => handleDelete(doc.id)}
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
    </div>
  );
}
