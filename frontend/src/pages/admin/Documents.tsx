import { useState } from "react";
import { FileText, Upload, Search, MoreHorizontal, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface DocItem {
  id: string;
  name: string;
  type: "markdown" | "html" | "txt";
  status: "indexed" | "processing" | "error";
  chunks: number;
  updatedAt: string;
}

const mockDocs: DocItem[] = [
  { id: "1", name: "Getting Started Guide", type: "markdown", status: "indexed", chunks: 24, updatedAt: "2 hours ago" },
  { id: "2", name: "API Reference", type: "markdown", status: "indexed", chunks: 67, updatedAt: "1 day ago" },
  { id: "3", name: "Billing & Pricing FAQ", type: "markdown", status: "indexed", chunks: 12, updatedAt: "3 days ago" },
  { id: "4", name: "Integration Setup", type: "html", status: "indexed", chunks: 31, updatedAt: "5 days ago" },
  { id: "5", name: "Troubleshooting Guide", type: "markdown", status: "indexed", chunks: 18, updatedAt: "1 week ago" },
  { id: "6", name: "SSO Configuration", type: "markdown", status: "processing", chunks: 0, updatedAt: "Just now" },
  { id: "7", name: "Data Export Docs", type: "txt", status: "error", chunks: 0, updatedAt: "2 hours ago" },
  { id: "8", name: "Webhook Events Reference", type: "markdown", status: "indexed", chunks: 42, updatedAt: "2 weeks ago" },
];

const statusConfig = {
  indexed: { icon: CheckCircle2, label: "Indexed", className: "text-primary" },
  processing: { icon: Clock, label: "Processing", className: "text-muted-foreground" },
  error: { icon: AlertCircle, label: "Error", className: "text-destructive" },
};

export default function Documents() {
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const filtered = mockDocs.filter((d) =>
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
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity">
          <Upload size={16} />
          Upload
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${
          dragOver
            ? "border-primary bg-accent"
            : "border-border"
        }`}
      >
        <FileText size={24} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-[14px] text-muted-foreground">
          Drag and drop files here, or click Upload
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Supports .md, .txt, .html — Max 10MB per file
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
          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-background rounded-xl border border-border shadow-soft-sm overflow-hidden">
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
              const status = statusConfig[doc.status];
              const StatusIcon = status.icon;
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
                    <span className="text-[13px] text-muted-foreground">{doc.chunks || "—"}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-[13px] text-muted-foreground">{doc.updatedAt}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
