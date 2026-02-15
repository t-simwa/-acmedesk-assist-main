import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Upload, Search, MoreHorizontal, CheckCircle2, Clock, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { documentsApi, Document, ApiError } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  indexed: { icon: CheckCircle2, label: "Indexed", className: "text-primary" },
  processing: { icon: Clock, label: "Processing", className: "text-muted-foreground" },
  error: { icon: AlertCircle, label: "Error", className: "text-destructive" },
};

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

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async (searchTerm?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsApi.list({ search: searchTerm || undefined });
      setDocuments(response.documents);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to load documents";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Refetch when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDocuments(search);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [search, fetchDocuments]);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validExtensions = [".md", ".html", ".htm", ".txt", ".pdf", ".docx"];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExtension)) {
      setError("Unsupported file format. Supported formats: .md, .html, .htm, .txt, .pdf, .docx");
      return;
    }

    // Validate file size (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds maximum allowed size of 10MB");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await documentsApi.upload(file);
      // Refresh document list
      await fetchDocuments(search);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to upload document";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Error uploading document:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleReindex = async (docId: string) => {
    try {
      setReindexing((prev) => new Set(prev).add(docId));
      setError(null);
      await documentsApi.reindex(docId);
      // Refresh document list
      await fetchDocuments(search);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to reindex document";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Error reindexing document:", err);
    } finally {
      setReindexing((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage knowledge base documents for the chatbot
          </p>
        </div>
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.html,.htm,.txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px]">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50"
        }`}
      >
        <FileText size={24} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-[14px] text-muted-foreground">
          Drag and drop files here, or click Upload
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Supports .md, .txt, .html, .pdf, .docx — Max 10MB per file
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors"
          aria-label="Search documents"
        />
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Type
                </th>
                <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Chunks
                </th>
                <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Updated
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((doc) => {
                const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.processing;
                const StatusIcon = status.icon;
                const isReindexing = reindexing.has(doc.id);
                return (
                  <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="text-[14px] font-medium text-foreground">{doc.name}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[13px] text-muted-foreground uppercase">{doc.type}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon size={14} className={status.className} />
                        <span className={`text-[13px] ${status.className}`}>{status.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[13px] text-muted-foreground">{doc.chunk_count || "—"}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[13px] text-muted-foreground">{formatDate(doc.updated_at)}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50"
                            disabled={isReindexing}
                            aria-label={`More options for ${doc.name}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleReindex(doc.id)}
                            disabled={isReindexing}
                            className="flex items-center gap-2"
                          >
                            {isReindexing ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Reindexing...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} />
                                Reindex
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
