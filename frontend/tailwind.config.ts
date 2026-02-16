import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        lg: "960px",
        xl: "1200px",
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Main headings - Plus Jakarta Sans
        heading: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        // Description text and chat - Satoshi
        sans: ['Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        description: ['Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        chat: ['Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        // Technical data - Geist Mono
        mono: ['Geist Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Heading scale - responsive with Plus Jakarta Sans
        // Desktop (>1024px): 56px | Tablet (768-1024px): 40px | Mobile (<767px): 32px
        'h1': [
          '3.5rem', // 56px desktop
          {
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        'h2': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }], // 40px
        'h3': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }], // 32px
        'h4': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '700' }], // 24px
        'h5': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '700' }], // 20px
        'h6': ['1rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '700' }], // 16px
        
        // Description text - responsive with Satoshi Medium (500)
        // Desktop: 20px | Tablet: 18px | Mobile: 16px
        'description': [
          '1.25rem', // 20px desktop
          {
            lineHeight: '1.6',
            letterSpacing: '0',
            fontWeight: '500',
          },
        ],
        'description-tablet': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '500' }], // 18px
        'description-mobile': ['1rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '500' }], // 16px
        
        // Chat bubbles - responsive with Satoshi Regular (400)
        // Desktop: 16px | Tablet: 16px | Mobile: 15px
        'chat': [
          '1rem', // 16px desktop/tablet
          {
            lineHeight: '1.5',
            letterSpacing: '0',
            fontWeight: '400',
          },
        ],
        'chat-mobile': ['0.9375rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }], // 15px
        
        // Technical data (citations/tables) - responsive with Geist Mono
        // Desktop: 14px | Tablet: 13px | Mobile: 12px
        'technical': [
          '0.875rem', // 14px desktop
          {
            lineHeight: '1.4',
            letterSpacing: '0',
            fontWeight: '450',
          },
        ],
        'technical-tablet': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '450' }], // 13px
        'technical-mobile': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '450' }], // 12px
        
        // Legacy body text scale - kept for compatibility
        'body-lg': ['1.0625rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }], // 17px
        'body': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }], // 14px
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }], // 13px
        'body-xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }], // 12px
        
        // Label scale
        'label': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }], // 13px
        'label-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }], // 12px
        
        // Caption scale
        'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '400' }], // 11px
        'caption-xs': ['0.5625rem', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '400' }], // 9px
      },
      lineHeight: {
        'tight': '1.2',
        'snug': '1.3',
        'normal': '1.5',
        'relaxed': '1.6',
        'loose': '1.8',
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'normal': '0',
        'wide': '0.01em',
        'wider': '0.02em',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        status: {
          online: "hsl(var(--status-online))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        gray: {
          50: "hsl(var(--gray-50))",
          100: "hsl(var(--gray-100))",
          200: "hsl(var(--gray-200))",
          300: "hsl(var(--gray-300))",
          400: "hsl(var(--gray-400))",
          500: "hsl(var(--gray-500))",
          600: "hsl(var(--gray-600))",
          700: "hsl(var(--gray-700))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
          950: "hsl(var(--gray-950))",
        },
        brand: {
          primary: "hsl(var(--brand-primary))",
          "primary-foreground": "hsl(var(--brand-primary-foreground))",
        },
        chat: {
          user: "hsl(var(--chat-user-bg))",
          "user-foreground": "hsl(var(--chat-user-fg))",
          assistant: "hsl(var(--chat-assistant-bg))",
          "assistant-foreground": "hsl(var(--chat-assistant-fg))",
          panel: "hsl(var(--chat-panel-bg))",
          header: "hsl(var(--chat-header-bg))",
          "header-foreground": "hsl(var(--chat-header-fg))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        // Spacing & layout elevation system
        "soft-sm": "var(--shadow-sm)",
        "soft-md": "var(--shadow-md)",
        "soft-lg": "var(--shadow-lg)",
        soft: "var(--shadow-sm)",
        medium: "var(--shadow-md)",
        strong: "var(--shadow-lg)",
        chat: "var(--shadow-chat)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
