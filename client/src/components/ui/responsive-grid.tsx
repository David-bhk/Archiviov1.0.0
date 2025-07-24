import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    default?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: number;
}

export function ResponsiveGrid({ 
  children, 
  className, 
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 6
}: ResponsiveGridProps) {
  const gridClasses = [
    `grid`,
    `gap-${gap}`,
    `grid-cols-${columns.default || 1}`
  ];

  if (columns.md) gridClasses.push(`md:grid-cols-${columns.md}`);
  if (columns.lg) gridClasses.push(`lg:grid-cols-${columns.lg}`);
  if (columns.xl) gridClasses.push(`xl:grid-cols-${columns.xl}`);
  if (columns["2xl"]) gridClasses.push(`2xl:grid-cols-${columns["2xl"]}`);

  return (
    <div className={cn(gridClasses.join(" "), className)}>
      {children}
    </div>
  );
}
