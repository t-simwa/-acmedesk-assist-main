import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════════════════════════════════════════
   404 NOT FOUND PAGE - MILESTONE 12.4.2
   Friendly error page with navigation options
   ═══════════════════════════════════════════════════════════════════════════════ */

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-purple/10 rounded-full blur-[96px]" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-[150px] md:text-[200px] font-bold leading-none bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
            404
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Oops! Page Not Found
        </h1>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
          Don't worry, let's get you back on track.
        </p>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            size="lg"
            className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90"
            asChild
          >
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              Go to Homepage
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-700 hover:bg-gray-800/50"
            asChild
          >
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500 mb-4">Or try these popular pages:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/features"
              className="px-4 py-2 text-sm rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="px-4 py-2 text-sm rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/blog"
              className="px-4 py-2 text-sm rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              Blog
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 text-sm rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Help Link */}
        <div className="mt-8">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Need help? Contact us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
