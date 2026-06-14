import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("min-h-9 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition duration-200 hover:-translate-y-px hover:bg-primary-hover hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-primary focus:shadow-focus aria-[invalid=true]:border-destructive", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition focus:border-primary focus:shadow-focus aria-[invalid=true]:border-destructive", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-primary focus:shadow-focus aria-[invalid=true]:border-destructive", className)} {...props} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-card", className)}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block text-[13px] text-muted-foreground">{hint}</span>}</label>;
}
