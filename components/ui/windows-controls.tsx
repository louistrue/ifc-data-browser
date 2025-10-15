"use client"

import React, { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface WindowsControlsProps {
    variant?: "mac" | "xp"
    onClose?: () => void
    onMinimize?: () => void
    onMaximize?: () => void
    disabled?: boolean
    className?: string
}

export function WindowsControls({
    variant = "mac",
    onClose,
    onMinimize,
    onMaximize,
    disabled = false,
    className
}: WindowsControlsProps) {
    const [isAnimating, setIsAnimating] = useState(false)

    const handleClose = useCallback(() => {
        if (disabled || isAnimating) return
        setIsAnimating(true)
        onClose?.()
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 400)
    }, [disabled, isAnimating, onClose])

    const handleMinimize = useCallback(() => {
        if (disabled || isAnimating) return
        setIsAnimating(true)
        onMinimize?.()
        setTimeout(() => setIsAnimating(false), 300)
    }, [disabled, isAnimating, onMinimize])

    const handleMaximize = useCallback(() => {
        if (disabled || isAnimating) return
        setIsAnimating(true)
        onMaximize?.()
        setTimeout(() => setIsAnimating(false), 350)
    }, [disabled, isAnimating, onMaximize])

    const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            action()
        }
    }, [])

    if (variant === "xp") {
        return (
            <div className={cn("flex items-center gap-1", className)} role="group" aria-label="Window controls">
                {/* Close Button (×) */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center text-xs font-bold",
                        "bg-red-500 hover:bg-red-600 active:bg-red-700",
                        "border border-red-600 shadow-sm",
                        "transition-all duration-150 ease-in-out",
                        "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1",
                        disabled && "opacity-50 cursor-not-allowed",
                        isAnimating && "animate-pulse"
                    )}
                    onClick={handleClose}
                    onKeyDown={(e) => handleKeyDown(e, handleClose)}
                    disabled={disabled}
                    aria-label="Close window"
                    title="Close window"
                >
                    <span className="text-white leading-none">×</span>
                </button>

                {/* Minimize Button (_) */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center text-xs font-bold",
                        "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
                        "border border-yellow-600 shadow-sm",
                        "transition-all duration-150 ease-in-out",
                        "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1",
                        disabled && "opacity-50 cursor-not-allowed",
                        isAnimating && "animate-bounce"
                    )}
                    onClick={handleMinimize}
                    onKeyDown={(e) => handleKeyDown(e, handleMinimize)}
                    disabled={disabled}
                    aria-label="Minimize window"
                    title="Minimize window"
                >
                    <span className="text-white leading-none">_</span>
                </button>

                {/* Maximize Button (□) */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center text-xs font-bold",
                        "bg-green-500 hover:bg-green-600 active:bg-green-700",
                        "border border-green-600 shadow-sm",
                        "transition-all duration-150 ease-in-out",
                        "focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-1",
                        disabled && "opacity-50 cursor-not-allowed",
                        isAnimating && "animate-spin"
                    )}
                    onClick={handleMaximize}
                    onKeyDown={(e) => handleKeyDown(e, handleMaximize)}
                    disabled={disabled}
                    aria-label="Maximize window"
                    title="Maximize window"
                >
                    <span className="text-white leading-none">□</span>
                </button>
            </div>
        )
    }

    // Mac-style controls (existing design)
    return (
        <div className={cn("flex items-center gap-1.5", className)} role="group" aria-label="Window controls">
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-red-400 bg-red-500",
                    "hover:scale-110 active:scale-95 transition-transform duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleClose}
                onKeyDown={(e) => handleKeyDown(e, handleClose)}
                disabled={disabled}
                aria-label="Close window"
                title="Close window"
            />
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500",
                    "hover:scale-110 active:scale-95 transition-transform duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleMinimize}
                onKeyDown={(e) => handleKeyDown(e, handleMinimize)}
                disabled={disabled}
                aria-label="Minimize window"
                title="Minimize window"
            />
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-green-400 bg-green-500",
                    "hover:scale-110 active:scale-95 transition-transform duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleMaximize}
                onKeyDown={(e) => handleKeyDown(e, handleMaximize)}
                disabled={disabled}
                aria-label="Maximize window"
                title="Maximize window"
            />
        </div>
    )
}
