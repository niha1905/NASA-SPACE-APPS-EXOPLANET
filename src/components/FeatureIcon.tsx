import { Droplets, Wind, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureIconProps {
  type: "water" | "atmosphere" | "habitable";
  active: boolean;
  className?: string;
}

const FeatureIcon = ({ type, active, className }: FeatureIconProps) => {
  const icons = {
    water: Droplets,
    atmosphere: Wind,
    habitable: Sprout,
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300",
        active
          ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
          : "bg-muted/30 border-muted text-muted-foreground opacity-50",
        className
      )}
    >
      <Icon className={cn("h-4 w-4", active && "animate-glow-pulse")} />
      <span className="text-xs font-medium capitalize">{type}</span>
    </div>
  );
};

export default FeatureIcon;
