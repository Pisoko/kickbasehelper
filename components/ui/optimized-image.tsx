"use client"

import Image from "next/image"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Lokale cn-Funktion, falls der Import aus @/lib/utils nicht funktioniert
const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs))
}

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  fill?: boolean
  sizes?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 80,
  fill = false,
  sizes,
  ...props
}: OptimizedImageProps & Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "width" | "height" | "className" | "priority" | "quality" | "fill" | "sizes">) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-cover"
        priority={priority}
        quality={quality}
        fill={fill}
        sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
        {...props}
      />
    </div>
  )
}