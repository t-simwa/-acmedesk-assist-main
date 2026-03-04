import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Branding/Logo";
import { CheckCircle2 } from "lucide-react";

const CONFETTI_COLORS = [
  "bg-primary",
  "bg-info",
  "bg-success",
  "bg-warning",
  "bg-error",
  "bg-purple-500",
];

function Confetti() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    colorClass: string;
    delay: number;
  }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20 - Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      colorClass: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          <div className={`w-3 h-3 ${particle.colorClass}`} />
        </div>
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function EmailVerified() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {showConfetti && <Confetti />}
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>

            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground mb-3">
              Email Verified!
            </h1>

            <p className="text-sm text-muted-foreground mb-8">
              Your account has been successfully verified. You can now log in and set up your chatbot.
            </p>

            <Button onClick={handleContinue} className="w-full h-10 font-medium" size="lg">
              Continue to Login
            </Button>

            <p className="mt-5 text-xs text-muted-foreground/70">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
