# Errors Skills

Add error reports here when you encounter bugs during development.

Format:
```
fix this: [chunk-TKA7E7G6.js?v=cfbb5b1b:14080 The above error occurred in one of your React components:

    at Lazy
    at Suspense
    at div
    at PageTransition (http://localhost:8080/src/components/PageTransition.tsx:28:38)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:4130:5)
    at Outlet (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:4536:26)
    at div
    at PageTransition (http://localhost:8080/src/components/PageTransition.tsx:28:38)
    at main
    at div
    at div
    at AdminLayout (http://localhost:8080/src/components/admin/AdminLayout.tsx?t=1772650732675:42:22)
    at ProtectedRoute (http://localhost:8080/src/components/auth/ProtectedRoute.tsx?t=1772650732675:26:34)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:4130:5)
    at Routes (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:4600:5)
    at Router (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:4543:15)
    at BrowserRouter (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=cfbb5b1b:5289:5)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=cfbb5b1b:37:15)
    at TooltipProvider (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=cfbb5b1b:63:5)
    at QueryClientProvider (http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=cfbb5b1b:2874:3)
    at RoleProvider (http://localhost:8080/src/contexts/RoleContext.tsx?t=1772650732675:70:32)
    at AuthProvider (http://localhost:8080/src/contexts/AuthContext.tsx?t=1772650732675:27:32)
    at AccessibilityProvider (http://localhost:8080/src/contexts/AccessibilityContext.tsx?t=1772649584348:27:41)
    at ThemeProvider (http://localhost:8080/src/contexts/ThemeContext.tsx?t=1772649584375:25:33)
    at ErrorBoundary (http://localhost:8080/src/components/error/ErrorBoundary.tsx:297:9)
    at App

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.
ErrorBoundary.tsx:35 ErrorBoundary caught an error: TypeError: Failed to fetch dynamically imported module: http://localhost:8080/src/pages/admin/Settings.tsx?t=1772652042692 
Object

﻿

]
```

The assistant will analyze and provide fixes.
