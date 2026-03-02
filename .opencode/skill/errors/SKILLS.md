# Errors Skills

Add error reports here when you encounter bugs during development.

Format:
```
fix this: [chunk-TKA7E7G6.js?v=ae23c99b:521 Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?

Check the render method of `Primitive.button.SlotClone`.
    at Tooltip (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=ae23c99b:107:5)
    at http://localhost:8080/node_modules/.vite/deps/chunk-XXH7C2GO.js?v=ae23c99b:79:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-XXH7C2GO.js?v=ae23c99b:56:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-WF3O6GQC.js?v=ae23c99b:43:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-XXH7C2GO.js?v=ae23c99b:79:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-XXH7C2GO.js?v=ae23c99b:56:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-WF3O6GQC.js?v=ae23c99b:43:13
    at http://localhost:8080/node_modules/.vite/deps/chunk-H327Z3KL.js?v=ae23c99b:1955:13
    at http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-dropdown-menu.js?v=ae23c99b:144:13
    at http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-dropdown-menu.js?v=ae23c99b:932:13
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at Popper (http://localhost:8080/node_modules/.vite/deps/chunk-H327Z3KL.js?v=ae23c99b:1947:11)
    at Menu (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-dropdown-menu.js?v=ae23c99b:98:11)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at DropdownMenu (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-dropdown-menu.js?v=ae23c99b:897:5)
    at div
    at header
    at TopBar (http://localhost:8080/src/components/layout/TopBar.tsx?t=1772450141519:172:26)
    at div
    at div
    at AdminLayout (http://localhost:8080/src/components/admin/AdminLayout.tsx?t=1772450141519:41:22)
    at ProtectedRoute (http://localhost:8080/src/components/auth/ProtectedRoute.tsx?t=1772450141519:26:34)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4130:5)
    at Routes (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4600:5)
    at Router (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4543:15)
    at BrowserRouter (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:5289:5)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at TooltipProvider (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=ae23c99b:63:5)
    at QueryClientProvider (http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=ae23c99b:2874:3)
    at RoleProvider (http://localhost:8080/src/contexts/RoleContext.tsx?t=1772450141519:70:32)
    at AuthProvider (http://localhost:8080/src/contexts/AuthContext.tsx?t=1772450141519:27:32)
    at AccessibilityProvider (http://localhost:8080/src/contexts/AccessibilityContext.tsx:27:41)
    at ThemeProvider (http://localhost:8080/src/contexts/ThemeContext.tsx:25:33)
    at ErrorBoundary (http://localhost:8080/src/components/error/ErrorBoundary.tsx:297:9)
    at App

App.tsx:39 
 GET http://localhost:8080/src/pages/admin/Analytics.tsx?t=1772450628510 net::ERR_ABORTED 500 (Internal Server Error)
client:892 [vite] Internal Server Error
  × Expected '</', got 'div'
      ╭─[C:/Users/Ted Simwa/Desktop/Vanity/Work/IT/my-projects/acmedesk-assist-main/frontend/src/pages/admin/Analytics.tsx:1181:1]
 1178 │               trendLabel="vs last period"
 1179 │               icon={<ThumbsUp className="w-5 h-5" />}
 1180 │             />
 1181 │       </div>
      ·         ───
 1182 │ 
 1183 │           </>
 1184 │         )}
      ╰────


Caused by:
    Syntax Error
2
chunk-PMKBOVCG.js?v=ae23c99b:903 Uncaught TypeError: Failed to fetch dynamically imported module: http://localhost:8080/src/pages/admin/Analytics.tsx?t=1772450628510
chunk-TKA7E7G6.js?v=ae23c99b:14080 The above error occurred in one of your React components:

    at Lazy
    at Suspense
    at div
    at PageTransition (http://localhost:8080/src/components/PageTransition.tsx:28:38)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4130:5)
    at Outlet (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4536:26)
    at div
    at PageTransition (http://localhost:8080/src/components/PageTransition.tsx:28:38)
    at main
    at div
    at div
    at AdminLayout (http://localhost:8080/src/components/admin/AdminLayout.tsx?t=1772450141519:41:22)
    at ProtectedRoute (http://localhost:8080/src/components/auth/ProtectedRoute.tsx?t=1772450141519:26:34)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4130:5)
    at Routes (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4600:5)
    at Router (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:4543:15)
    at BrowserRouter (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ae23c99b:5289:5)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-ZVO65UMV.js?v=ae23c99b:37:15)
    at TooltipProvider (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=ae23c99b:63:5)
    at QueryClientProvider (http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=ae23c99b:2874:3)
    at RoleProvider (http://localhost:8080/src/contexts/RoleContext.tsx?t=1772450141519:70:32)
    at AuthProvider (http://localhost:8080/src/contexts/AuthContext.tsx?t=1772450141519:27:32)
    at AccessibilityProvider (http://localhost:8080/src/contexts/AccessibilityContext.tsx:27:41)
    at ThemeProvider (http://localhost:8080/src/contexts/ThemeContext.tsx:25:33)
    at ErrorBoundary (http://localhost:8080/src/components/error/ErrorBoundary.tsx:297:9)
    at App

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.
ErrorBoundary.tsx:35 ErrorBoundary caught an error: TypeError: Failed to fetch dynamically imported module: http://localhost:8080/src/pages/admin/Analytics.tsx?t=1772450628510 
{componentStack: '\n    at Lazy\n    at Suspense\n    at div\n    at Pag…ponents/error/ErrorBoundary.tsx:297:9)\n    at App'}
﻿

]
```

The assistant will analyze and provide fixes.
