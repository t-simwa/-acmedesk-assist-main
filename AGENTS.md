# AGENTS.md - Development Guidelines for Agentic Coding

This file provides guidelines for agentic coding agents working on the AcmeDesk Assist codebase.

---

## Project Overview

AcmeDesk Assist is a full-stack RAG (Retrieval-Augmented Generation) assistant with:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with RAG pipeline (ChromaDB, embeddings, LLM)
- **Testing**: Vitest (frontend), pytest (backend)

---

## Build, Lint, and Test Commands

### Frontend (React)

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server (port 8080)
npm run build           # Production build
npm run build:dev       # Build in development mode

# Linting
npm run lint            # Run ESLint on all files

# Testing
npm test                # Run all tests once (vitest run)
npm run test:watch      # Run tests in watch mode

# Run a single test file
npx vitest run src/components/chat/ChatWidget.test.tsx

# Run tests matching a pattern
npx vitest run --grep "ChatWidget"
```

### Backend (FastAPI)

```bash
cd backend

# Run all tests
pytest

# Run a specific test file
pytest tests/test_api_health.py

# Run tests matching a pattern
pytest -k "health"

# Run with verbose output
pytest -v
```

---

## Code Style Guidelines

### Frontend (TypeScript + React)

#### Imports

Organize imports in the following order (use empty lines between groups):

```typescript
// 1. React imports
import { useState, useEffect, useCallback } from "react";
import React from "react";

// 2. External libraries (alphabetical)
import { format } from "date-fns";
import { X, ChevronDown } from "lucide-react";

// 3. Internal - @/lib (API, utilities)
import { chatApi, type ChatResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

// 4. Internal - @/hooks
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

// 5. Internal - @/components
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";

// 6. Internal - @/contexts
import { useAccessibility } from "@/contexts/AccessibilityContext";
```

**Use the `@` alias** for imports (points to `./src`):
- `import { Something } from "@/components/..."`
- `import { useSomething } from "@/hooks/..."`
- `import { something } from "@/lib/..."`

#### Types and Interfaces

- Use TypeScript interfaces for object shapes
- Use explicit return types for complex functions
- Use `type` for unions, intersections, and type aliases

```typescript
// Interface for object shapes
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{ index: number; title: string; doc_id: string }>;
}

// Type for status
type UploadStatus = "pending" | "uploading" | "completed" | "error";

// Type for API error
interface ApiError {
  message: string;
  errorType?: "network" | "rate_limit" | "timeout" | "server_error";
}
```

#### Component Naming

- Use **PascalCase** for component names: `ChatWidget`, `MessageBubble`, `DocumentsPage`
- Use **camelCase** for non-component functions: `formatDate()`, `handleSubmit()`
- Use **kebab-case** for file names: `chat-widget.tsx`, `message-bubble.tsx`

#### React Patterns

- Use functional components with hooks
- Destructure props for clarity
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Use `useRef` for mutable refs to DOM elements

```typescript
// Good: Destructured props with explicit types
export function ChatWidget({ onSend, disabled = false }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Good: useCallback for handlers passed to children
  const handleSend = useCallback(async (text: string) => {
    // ...
  }, [dependency]);
  
  // Good: useMemo for expensive computations
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => !msg.isError);
  }, [messages]);
  
  // Good: useRef for DOM refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  return <div>...</div>;
}
```

#### Error Handling

- Use try/catch blocks for async operations
- Display errors to users via toast notifications
- Type catch blocks appropriately

```typescript
try {
  const response = await chatApi.sendMessage({ session_id, message });
  // Handle response
} catch (error: unknown) {
  // Check error type
  if (error && typeof error === "object" && "errorType" in error) {
    const apiError = error as ApiError;
    // Handle specific error type
  } else if (error instanceof Error) {
    console.error("Error:", error.message);
  }
  
  // Show user-friendly error
  toast({
    title: "Error",
    description: "Failed to send message",
    variant: "destructive",
  });
}
```

#### Tailwind CSS

- Use semantic class names for colors (e.g., `text-foreground`, `bg-background`, `text-muted-foreground`)
- Use spacing and sizing tokens consistently
- Follow mobile-first responsive design patterns
- Use custom font classes: `font-heading`, `font-sans`, `font-chat`, `font-mono`

```tsx
// Mobile-first responsive
<div className="px-4 py-2 sm:px-6 sm:py-4 lg:px-8">
  <Button className="w-full sm:w-auto min-h-[44px]">
    Action
  </Button>
</div>

// Semantic colors
<div className="bg-primary text-primary-foreground">
<div className="bg-muted text-muted-foreground">
<div className="border border-border">
```

#### Accessibility

- Always include `aria-label` on interactive elements
- Use semantic HTML (`<button>`, `<input>`, `<nav>`, etc.)
- Include `role` attributes when semantic HTML isn't enough
- Support keyboard navigation
- Ensure focus states are visible (`focus-visible:outline-ring`)

```tsx
<button
  onClick={handleClick}
  aria-label="Close chat"
  className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
>
  <X size={18} />
</button>
```

---

### Backend (Python)

#### Type Hints

- Always use type hints for function parameters and return values
- Use `Optional` for nullable types
- Use `List`, `Dict` from typing or built-in generics

```python
from typing import Optional, List
from pydantic import BaseModel

class Document(BaseModel):
    id: str
    name: str
    status: str
    chunk_count: Optional[int] = None

async def get_document(doc_id: str) -> Optional[Document]:
    ...
```

#### FastAPI Patterns

- Use dependency injection for reusable logic
- Use Pydantic schemas for request/response validation
- Use async/await for I/O operations
- Follow RESTful URL patterns

```python
from fastapi import APIRouter, Depends, HTTPException
from app.services.document_service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    service: DocumentService = Depends(DocumentService)
) -> DocumentResponse:
    doc = await service.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
```

#### Testing

- Use `pytest` with `pytest-asyncio` for async tests
- Use `httpx.AsyncClient` for API testing
- Mock external dependencies

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
```

---

## Project Structure

```
acmedesk-assist-main/
├── frontend/                    # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── chat/            # Chat-related components
│   │   │   └── feedback/       # Feedback components
│   │   ├── pages/              # Page components
│   │   │   └── admin/           # Admin pages
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and API client
│   │   ├── contexts/           # React contexts
│   │   ├── test/               # Test utilities
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tailwind.config.ts
│   └── eslint.config.js
│
├── backend/                     # FastAPI + Python
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py           # Settings
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API routes
│   │   ├── services/          # Business logic
│   │   └── rag/               # RAG pipeline
│   ├── tests/                  # Backend tests
│   ├── scripts/               # Utility scripts
│   └── requirements.txt
│
└── docs/                       # Documentation
```

---

## Key Technologies

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components (Radix-based)
- **@tanstack/react-query** - Data fetching/caching
- **react-hook-form + zod** - Form validation
- **Vitest** - Testing
- **ESLint** - Linting

### Backend
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **ChromaDB** - Vector store
- **pytest** - Testing

---

## Common Development Patterns

### API Client (Frontend)

```typescript
// Define response types
interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Use the typed API
const response = await chatApi.sendMessage({
  session_id: sessionId,
  message: text,
});
```

### React Query Mutations

```typescript
// Use custom hooks for mutations
const uploadMutation = useUploadDocument();

const handleUpload = async (file: File) => {
  try {
    await uploadMutation.mutateAsync({ file });
    toast({ title: "Success", variant: "success" });
  } catch (error) {
    toast({ title: "Error", variant: "destructive" });
  }
};
```

### State Management

- **Local state**: `useState` for component-specific state
- **Server state**: React Query for server data
- **Global state**: React Context for theme, auth, accessibility

---

## Notes for Agents

1. **Always verify imports exist** before adding new imports
2. **Run lint and tests** before submitting changes
3. **Use TypeScript types** - avoid `any`
4. **Follow accessibility guidelines** - always add aria-labels
5. **Mobile-first design** - test on mobile breakpoints
6. **Error handling** - always handle errors gracefully
7. **Use existing components** - check `src/components/ui/` first
8. **API endpoints** - check backend routers for available endpoints

---

## Environment Setup

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on port 8080
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env with OPENAI_API_KEY and other config
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

Last updated: 2026-03-02
