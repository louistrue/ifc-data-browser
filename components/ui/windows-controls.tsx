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
    const [isClosing, setIsClosing] = useState(false)
    const [isMinimizing, setIsMinimizing] = useState(false)
    const [isMaximizing, setIsMaximizing] = useState(false)

    const handleClose = useCallback(() => {
        if (disabled || isClosing) return
        setIsClosing(true)
        onClose?.()
        // Reset animation state after animation completes
        setTimeout(() => setIsClosing(false), 400)
    }, [disabled, isClosing, onClose])

    const handleMinimize = useCallback(() => {
        if (disabled || isMinimizing) return
        setIsMinimizing(true)
        onMinimize?.()
        setTimeout(() => setIsMinimizing(false), 300)
    }, [disabled, isMinimizing, onMinimize])

    const handleMaximize = useCallback(() => {
        if (disabled || isMaximizing) return
        setIsMaximizing(true)
        onMaximize?.()
        setTimeout(() => setIsMaximizing(false), 350)
    }, [disabled, isMaximizing, onMaximize])

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
                        "w-4 h-4 flex items-center justify-center text-xs font-bold relative overflow-hidden",
                        "bg-red-500 hover:bg-red-600 active:bg-red-700",
                        "border border-red-600",
                        "transition-all duration-300 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1",
                        "hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]",
                        "active:scale-95 active:shadow-[0_0_8px_rgba(239,68,68,0.4)]",
                        disabled && "opacity-50 cursor-not-allowed",
                        isClosing && "animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                    )}
                    onClick={handleClose}
                    onKeyDown={(e) => handleKeyDown(e, handleClose)}
                    disabled={disabled}
                    aria-label="Close window"
                    title="Close window"
                >
                    <span className="text-white leading-none relative z-10">×</span>
                </button>

                {/* Minimize Button (_) */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center text-xs font-bold relative overflow-hidden",
                        "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
                        "border border-yellow-600",
                        "transition-all duration-300 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1",
                        "hover:shadow-[0_0_15px_rgba(234,179,8,0.6)]",
                        "active:scale-95 active:shadow-[0_0_8px_rgba(234,179,8,0.4)]",
                        disabled && "opacity-50 cursor-not-allowed",
                        isMinimizing && "animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.8)]"
                    )}
                    onClick={handleMinimize}
                    onKeyDown={(e) => handleKeyDown(e, handleMinimize)}
                    disabled={disabled}
                    aria-label="Minimize window"
                    title="Minimize window"
                >
                    <span className="text-white leading-none relative z-10">_</span>
                </button>

                {/* Maximize Button (□) */}
                <button
                    className={cn(
                        "w-4 h-4 flex items-center justify-center text-xs font-bold relative overflow-hidden",
                        "bg-green-500 hover:bg-green-600 active:bg-green-700",
                        "border border-green-600",
                        "transition-all duration-300 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-1",
                        "hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]",
                        "active:scale-95 active:shadow-[0_0_8px_rgba(34,197,94,0.4)]",
                        disabled && "opacity-50 cursor-not-allowed",
                        isMaximizing && "animate-spin shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                    )}
                    onClick={handleMaximize}
                    onKeyDown={(e) => handleKeyDown(e, handleMaximize)}
                    disabled={disabled}
                    aria-label="Maximize window"
                    title="Maximize window"
                >
                    <span className="text-white leading-none relative z-10">□</span>
                </button>
            </div>
        )
    }

    // Mac-style controls (existing design)
    return (
        <div className={cn("flex items-center gap-1.5", className)} role="group" aria-label="Window controls">
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-red-400 bg-red-500 relative",
                    "hover:scale-110 active:scale-95",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-[0_0_12px_rgba(239,68,68,0.6)]",
                    "active:shadow-[0_0_6px_rgba(239,68,68,0.4)]",
                    "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed",
                    isClosing && "animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.8)]"
                )}
                onClick={handleClose}
                onKeyDown={(e) => handleKeyDown(e, handleClose)}
                disabled={disabled}
                aria-label="Close window"
                title="Close window"
            />
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500 relative",
                    "hover:scale-110 active:scale-95",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-[0_0_12px_rgba(234,179,8,0.6)]",
                    "active:shadow-[0_0_6px_rgba(234,179,8,0.4)]",
                    "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed",
                    isMinimizing && "animate-bounce shadow-[0_0_16px_rgba(234,179,8,0.8)]"
                )}
                onClick={handleMinimize}
                onKeyDown={(e) => handleKeyDown(e, handleMinimize)}
                disabled={disabled}
                aria-label="Minimize window"
                title="Minimize window"
            />
            <button
                className={cn(
                    "w-3 h-3 rounded-full border border-green-400 bg-green-500 relative",
                    "hover:scale-110 active:scale-95",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-[0_0_12px_rgba(34,197,94,0.6)]",
                    "active:shadow-[0_0_6px_rgba(34,197,94,0.4)]",
                    "focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-1",
                    disabled && "opacity-50 cursor-not-allowed",
                    isMaximizing && "animate-spin shadow-[0_0_16px_rgba(34,197,94,0.8)]"
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
