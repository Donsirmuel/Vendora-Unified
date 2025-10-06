import React, { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackToTopButtonProps {
  /**
   * Number of pixels the user must scroll before the button appears.
   * Defaults to 320px to avoid showing the control while the hero is visible.
   */
  threshold?: number;
  className?: string;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({ threshold = 320, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateVisibility = () => {
      setIsVisible(window.scrollY > threshold);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      aria-label="Back to top"
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full shadow-lg transition-all duration-300",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        className
      )}
    >
      <ArrowUp className="h-4 w-4" aria-hidden />
      <span className="text-sm font-semibold">Back to top</span>
    </Button>
  );
};

export default BackToTopButton;
