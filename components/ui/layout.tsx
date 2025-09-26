"use client"

import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Lokale cn-Funktion, falls der Import aus @/lib/utils nicht funktioniert
const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs))
}

interface LayoutProps {
  children: React.ReactNode
  className?: string
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={cn(
      "container mx-auto px-4 py-6 md:py-8 max-w-7xl",
      className
    )}>
      {children}
    </div>
  )
}

interface LayoutHeaderProps {
  children: React.ReactNode
  className?: string
}

export function LayoutHeader({ children, className }: LayoutHeaderProps) {
  return (
    <header className={cn(
      "mb-6 flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0",
      className
    )}>
      {children}
    </header>
  )
}

interface LayoutTitleProps {
  children: React.ReactNode
  className?: string
}

export function LayoutTitle({ children, className }: LayoutTitleProps) {
  return (
    <h1 className={cn(
      "text-2xl font-bold tracking-tight md:text-3xl",
      className
    )}>
      {children}
    </h1>
  )
}

interface LayoutContentProps {
  children: React.ReactNode
  className?: string
}

export function LayoutContent({ children, className }: LayoutContentProps) {
  return (
    <main className={cn(
      "flex-1",
      className
    )}>
      {children}
    </main>
  )
}

interface LayoutSidebarProps {
  children: React.ReactNode
  className?: string
  side?: "left" | "right"
}

export function LayoutSidebar({ 
  children, 
  className,
  side = "right"
}: LayoutSidebarProps) {
  return (
    <aside className={cn(
      "w-full md:w-72 lg:w-80 shrink-0",
      side === "left" ? "md:mr-6 lg:mr-8" : "md:ml-6 lg:ml-8",
      className
    )}>
      {children}
    </aside>
  )
}

interface LayoutGridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4
}

export function LayoutGrid({ 
  children, 
  className,
  cols = 3
}: LayoutGridProps) {
  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      cols === 1 && "grid-cols-1",
      cols === 2 && "grid-cols-1 sm:grid-cols-2",
      cols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      cols === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

interface LayoutCardProps {
  children: React.ReactNode
  className?: string
}

export function LayoutCard({ children, className }: LayoutCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-slate-700 bg-slate-800/50 p-4 md:p-6",
      className
    )}>
      {children}
    </div>
  )
}

interface LayoutFooterProps {
  children: React.ReactNode
  className?: string
}

export function LayoutFooter({ children, className }: LayoutFooterProps) {
  return (
    <footer className={cn(
      "mt-8 border-t border-slate-700 pt-6 text-sm text-slate-400",
      className
    )}>
      {children}
    </footer>
  )
}

export function LayoutDivider() {
  return <div className="my-6 border-t border-slate-700" />
}

export function LayoutSection({ children, className }: LayoutProps) {
  return (
    <section className={cn("mb-8", className)}>
      {children}
    </section>
  )
}

export function LayoutSectionTitle({ children, className }: LayoutProps) {
  return (
    <h2 className={cn("mb-4 text-xl font-semibold", className)}>
      {children}
    </h2>
  )
}