"use client";

import * as React from "react";

interface AlertDialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType>({
  open: false,
  onOpenChange: () => {},
});

export function AlertDialog({
  open = false,
  onOpenChange = () => {},
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = React.useContext(AlertDialogContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children.props as any)?.onClick?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <div onClick={() => onOpenChange(true)} {...props}>
      {children}
    </div>
  );
}

export function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <div
      ref={ref}
      onClick={() => onOpenChange(false)}
      className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${className}`}
      {...props}
    />
  );
});
AlertDialogOverlay.displayName = "AlertDialogOverlay";

export const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  const { open } = React.useContext(AlertDialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <AlertDialogOverlay />
      <div
        ref={ref}
        className={`relative z-50 grid w-full max-w-lg gap-4 border border-slate-200 bg-white p-6 shadow-xl rounded-2xl ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

export const AlertDialogHeader = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

export const AlertDialogFooter = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2 border-t border-slate-100 ${className}`}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

export const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold text-slate-900 ${className}`}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

export const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-slate-500 ${className}`}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", ...props }, ref) => {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        props.onClick?.(e);
        onOpenChange(false);
      }}
      className={`inline-flex h-9 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition ${className}`}
      {...props}
    />
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", ...props }, ref) => {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        props.onClick?.(e);
        onOpenChange(false);
      }}
      className={`mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:mt-0 transition ${className}`}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";
