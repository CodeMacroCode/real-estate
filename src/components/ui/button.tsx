import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => {
    let baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    let variantStyles = "bg-blue-600 text-white hover:bg-blue-700 shadow-sm";
    if (variant === "outline") {
      variantStyles = "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
    } else if (variant === "ghost") {
      variantStyles = "hover:bg-slate-100 text-slate-700";
    } else if (variant === "link") {
      variantStyles = "text-blue-600 underline-offset-4 hover:underline p-0";
    }

    let sizeStyles = "h-9 px-4 py-2 text-sm";
    if (size === "sm") {
      sizeStyles = "h-8 rounded-md px-3 text-xs";
    } else if (size === "lg") {
      sizeStyles = "h-11 rounded-lg px-8 text-base";
    } else if (size === "icon") {
      sizeStyles = "h-9 w-9 p-0";
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

