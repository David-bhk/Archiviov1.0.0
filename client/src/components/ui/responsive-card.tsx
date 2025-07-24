import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResponsiveCardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
}

export function ResponsiveCard({
  children,
  className,
  title,
  icon,
  actions,
  description,
  footer,
}: ResponsiveCardProps) {
  return (
    <Card className={cn("h-full flex flex-col hover:shadow-lg transition-shadow", className)}>
      {title && (
        <CardHeader className={cn("pb-3", footer ? "flex-shrink-0" : "")}>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center space-x-2 min-w-0 flex-1">
              {icon && <span className="flex-shrink-0">{icon}</span>}
              <span className="truncate text-base" title={title}>
                {title}
              </span>
            </CardTitle>
            {actions && <div className="flex-shrink-0 ml-2">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("flex-1 flex flex-col", title ? "pt-0" : "")}>
        {description && (
          <p
            className="text-slate-600 text-sm mb-4"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
            title={description}
          >
            {description}
          </p>
        )}
        <div className="flex-1">{children}</div>
        {footer && <div className="mt-auto pt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}

interface ResponsiveCardActionProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveCardActions({ children, className }: ResponsiveCardActionProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
