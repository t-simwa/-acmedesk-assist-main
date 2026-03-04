/**
 * Tests for ChatWidget component.
 * 
 * Tests:
 * - Component renders without errors
 * - Widget opens and closes
 * - Sends messages and renders responses with mock API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatWidget } from "./ChatWidget";
import * as api from "@/lib/api";

// Mock the API module
vi.mock("@/lib/api", () => ({
  chatApi: {
    sendMessage: vi.fn(),
  },
  conversationsApi: {
    getHistory: vi.fn(),
  },
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

// Mock the accessibility context
vi.mock("@/contexts/AccessibilityContext", () => ({
  useAccessibility: () => ({
    reduceMotion: false,
  }),
}));

// Mock the Logo component
vi.mock("@/components/Branding/Logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

// Mock the ConfirmationDialog component
vi.mock("@/components/feedback/ConfirmationDialog", () => ({
  ConfirmationDialog: ({ open, onConfirm, onCancel }: any) =>
    open ? (
      <div data-testid="confirmation-dialog">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

// Mock formatResponse utility
vi.mock("@/utils/formatResponse", () => ({
  formatResponse: (text: string) => text,
}));

describe("ChatWidget", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderChatWidget = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChatWidget />
      </QueryClientProvider>
    );
  };

  it("renders chat widget button", () => {
    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    expect(button).toBeInTheDocument();
  });

  it("opens chat widget when button is clicked", async () => {
    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      // Chat panel should be visible
      const chatPanel = screen.getByRole("dialog", { hidden: true }) || 
                       document.querySelector('[data-testid="chat-panel"]');
      expect(chatPanel || screen.getByText(/hi there/i)).toBeTruthy();
    });
  });

  it("displays greeting message on open", async () => {
    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      const greeting = screen.getByText(/hi there|help with questions/i);
      expect(greeting).toBeInTheDocument();
    });
  });

  it("sends message and displays response", async () => {
    const mockResponse: api.ChatResponse = {
      answer: "This is a test response from the API.",
      sources: [
        {
          doc_id: "test-doc-1",
          chunk_index: 0,
          title: "Test Document",
          snippet: "Test snippet",
          score: 0.95,
        },
      ],
      metadata: {
        session_id: "test-session",
        query_time_ms: 150.5,
        sources_count: 1,
        timestamp: new Date().toISOString(),
      },
    };

    vi.mocked(api.chatApi.sendMessage).mockResolvedValue(mockResponse);

    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/hi there|help with questions/i)).toBeInTheDocument();
    });

    // Find and interact with the input
    const input = screen.getByPlaceholderText(/type your message/i) || 
                  screen.getByRole("textbox");
    
    if (input) {
      fireEvent.change(input, { target: { value: "What is NexaChat?" } });
      
      // Find and click send button
      const sendButton = screen.getByRole("button", { name: /send/i }) ||
                        screen.getByLabelText(/send/i) ||
                        input.closest("form")?.querySelector('button[type="submit"]');
      
      if (sendButton) {
        fireEvent.click(sendButton);
      } else if (input.closest("form")) {
        fireEvent.submit(input.closest("form")!);
      }
    }

    // Wait for API call
    await waitFor(() => {
      expect(api.chatApi.sendMessage).toHaveBeenCalledWith({
        session_id: expect.any(String),
        message: "What is NexaChat?",
      });
    });

    // Wait for response to appear
    await waitFor(() => {
      expect(screen.getByText("This is a test response from the API.")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays user message immediately", async () => {
    const mockResponse: api.ChatResponse = {
      answer: "Response",
      sources: [],
      metadata: {
        session_id: "test-session",
        query_time_ms: 100,
        sources_count: 0,
        timestamp: new Date().toISOString(),
      },
    };

    vi.mocked(api.chatApi.sendMessage).mockResolvedValue(mockResponse);

    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/hi there|help with questions/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i) || 
                  screen.getByRole("textbox");
    
    if (input) {
      fireEvent.change(input, { target: { value: "Test message" } });
      
      const sendButton = screen.getByRole("button", { name: /send/i }) ||
                        input.closest("form")?.querySelector('button[type="submit"]');
      
      if (sendButton) {
        fireEvent.click(sendButton);
      } else if (input.closest("form")) {
        fireEvent.submit(input.closest("form")!);
      }

      // User message should appear immediately
      await waitFor(() => {
        expect(screen.getByText("Test message")).toBeInTheDocument();
      });
    }
  });

  it("handles API errors gracefully", async () => {
    const mockError = new Error("Network error");
    vi.mocked(api.chatApi.sendMessage).mockRejectedValue(mockError);

    renderChatWidget();
    const button = screen.getByRole("button", { name: /chat with us/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/hi there|help with questions/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i) || 
                  screen.getByRole("textbox");
    
    if (input) {
      fireEvent.change(input, { target: { value: "Test" } });
      
      const sendButton = screen.getByRole("button", { name: /send/i }) ||
                        input.closest("form")?.querySelector('button[type="submit"]');
      
      if (sendButton) {
        fireEvent.click(sendButton);
      } else if (input.closest("form")) {
        fireEvent.submit(input.closest("form")!);
      }

      // Error message should appear
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|network|unable/i);
        expect(errorMessage || screen.getByText(/retry/i)).toBeTruthy();
      }, { timeout: 3000 });
    }
  });
});
