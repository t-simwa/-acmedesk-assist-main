/**
 * Tests for Documents list component.
 * 
 * Tests:
 * - Component renders documents list from mock API data
 * - Displays document information correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Documents from "./Documents";
import * as api from "@/lib/api";

// Mock the API hooks
vi.mock("@/hooks/useDocuments", () => ({
  useDocuments: vi.fn(),
  useUploadDocument: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteDocument: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useReindexDocument: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateDocument: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the mobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

// Mock the debounce hook
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("Documents", () => {
  let queryClient: QueryClient;

  const mockDocuments: api.Document[] = [
    {
      id: "doc-1",
      name: "Getting Started Guide",
      type: "md",
      status: "indexed",
      file_path: "/storage/documents/doc-1.md",
      file_size: 1024,
      chunk_count: 5,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      last_indexed_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "doc-2",
      name: "API Documentation",
      type: "html",
      status: "processing",
      file_path: "/storage/documents/doc-2.html",
      file_size: 2048,
      chunk_count: 0,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
    {
      id: "doc-3",
      name: "Error Document",
      type: "txt",
      status: "error",
      file_path: "/storage/documents/doc-3.txt",
      file_size: 512,
      chunk_count: 0,
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
      error_message: "Failed to process document",
    },
  ];

  const mockDocumentsResponse: api.DocumentListResponse = {
    documents: mockDocuments,
    total: 3,
    limit: 50,
    offset: 0,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderDocuments = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Documents />
      </QueryClientProvider>
    );
  };

  it("renders documents list from mock API data", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: mockDocumentsResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      expect(screen.getByText("Getting Started Guide")).toBeInTheDocument();
      expect(screen.getByText("API Documentation")).toBeInTheDocument();
      expect(screen.getByText("Error Document")).toBeInTheDocument();
    });
  });

  it("displays document status correctly", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: mockDocumentsResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      // Check for indexed status
      expect(screen.getByText(/indexed/i)).toBeInTheDocument();
      // Check for processing status
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      // Check for error status
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("displays document type correctly", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: mockDocumentsResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      // Document types should be displayed (may be uppercase or formatted)
      const typeElements = screen.getAllByText(/md|html|txt/i);
      expect(typeElements.length).toBeGreaterThan(0);
    });
  });

  it("displays loading state", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    // Should show loading indicator
    await waitFor(() => {
      const loadingIndicator = screen.queryByText(/loading/i) ||
                              screen.queryByRole("progressbar") ||
                              document.querySelector('[data-testid="loading"]');
      expect(loadingIndicator).toBeTruthy();
    });
  });

  it("displays empty state when no documents", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: { documents: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      // Should show empty state message
      const emptyState = screen.queryByText(/no documents|empty/i) ||
                        screen.queryByText(/upload/i);
      expect(emptyState).toBeTruthy();
    });
  });

  it("displays error state when API fails", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Failed to fetch documents" } as any,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      // Should show error message
      const errorMessage = screen.queryByText(/error|failed|network/i);
      expect(errorMessage).toBeTruthy();
    });
  });

  it("displays document chunk count", async () => {
    const { useDocuments } = await import("@/hooks/useDocuments");
    vi.mocked(useDocuments).mockReturnValue({
      data: mockDocumentsResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderDocuments();

    await waitFor(() => {
      // Should display chunk count for indexed document
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });
});
