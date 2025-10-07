import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  value: number;
  label: string;
  className?: string;
}

const ProbabilityBar = ({ value, label, className }: ProbabilityBarProps) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.round(animatedValue * 100);
  const barColor =
    percentage >= 80
      ? "bg-primary"
      : percentage >= 60
      ? "bg-secondary"
      : "bg-accent";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{percentage}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            barColor,
            "shadow-[0_0_10px_currentColor]"
          )}
          style={{ width: `${animatedValue * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProbabilityBar;
