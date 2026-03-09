import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20",
                success: "bg-brand-green/10 text-brand-green border border-brand-green/20",
                warning: "bg-brand-amber/10 text-brand-amber border border-brand-amber/20",
                danger: "bg-brand-red/10 text-brand-red border border-brand-red/20",
                purple: "bg-brand-purple/10 text-brand-purple border border-brand-purple/20",
                ghost: "bg-glass-200 text-white/60 border border-glass-border",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
