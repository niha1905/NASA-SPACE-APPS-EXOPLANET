import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  total: number;
}

const NavigationControls = ({
  onPrevious,
  onNext,
  currentIndex,
  total,
}: NavigationControlsProps) => {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        className="h-12 w-12 rounded-full border-primary/50 hover:border-primary hover:bg-primary/10 transition-all"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
                : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        className="h-12 w-12 rounded-full border-primary/50 hover:border-primary hover:bg-primary/10 transition-all"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default NavigationControls;
