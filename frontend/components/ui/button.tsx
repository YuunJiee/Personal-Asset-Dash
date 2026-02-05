import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none px-4 py-2",
                    variant === 'default' && "bg-black text-white hover:bg-gray-800 shadow-sm",
                    variant === 'outline' && "border border-gray-200 hover:bg-gray-100 text-gray-900",
                    variant === 'ghost' && "hover:bg-gray-100 text-gray-700",
                    variant === 'destructive' && "bg-red-500 text-white hover:bg-red-600 shadow-sm",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
