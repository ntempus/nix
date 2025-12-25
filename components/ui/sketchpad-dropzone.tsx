"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

export type DropFile = {
    id: string
    file: File
}

interface SketchpadDropzoneProps {
    files: DropFile[]
    onDrop?: (files: FileList) => void
    onRemove?: (id: string) => void
    onClear?: () => void
}

export function SketchpadDropzone({ files, onDrop, onRemove, onClear }: SketchpadDropzoneProps) {
    const dropRef = React.useRef<HTMLDivElement | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement | null>(null)

    // Handle drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (e.dataTransfer.files && onDrop) {
            onDrop(e.dataTransfer.files)
        }
    }

    // Handle click to open file manager
    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && onDrop) {
            onDrop(e.target.files)
            e.target.value = "" // reset input so same file can be selected again
        }
    }

    // Calculate total size
    const totalSize = files.reduce((acc, file) => acc + file.file.size, 0)
    const formattedTotalSize = (totalSize / (1024 * 1024)).toFixed(2)
    const isOverLimit = totalSize > 10 * 1024 * 1024

    return (
        <div>
            {/* Hidden file input */}
            <input
                type="file"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {/* Drop Zone / Sketchpad */}
            {/* Drop Zone / Sketchpad */}
            <div
                ref={dropRef}
                onClick={handleClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg h-[400px] bg-white dark:bg-surface-lighter flex flex-col overflow-hidden transition-colors hover:border-primary/50 ${isOverLimit ? 'border-danger/50 dark:border-danger/50' : 'border-gray-400 dark:border-border-light'}`}
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.05) 25px), repeating-linear-gradient(-90deg, transparent, transparent 24px, rgba(0,0,0,0.05) 25px)"
                }}
            >
                {/* Header Actions (Visible when files exist) */}
                {files.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-b border-border-light bg-surface-lighter/80 backdrop-blur-sm z-10 sticky top-0 shrink-0"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering file input
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-text-muted">
                                {files.length} file{files.length !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${isOverLimit ? 'bg-danger/10 text-danger border-danger/20' : 'bg-surface-highlight text-text-muted border-border-light'}`}>
                                {formattedTotalSize} MB / 10 MB
                            </span>
                        </div>
                        {onClear && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClear()
                                }}
                                className="h-8 text-xs hover:text-danger hover:bg-danger/10 text-text-muted"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 relative w-full scrollbar-thin scrollbar-thumb-surface-highlight scrollbar-track-transparent hover:scrollbar-thumb-border-light">
                    <div className="flex flex-wrap gap-4 items-start content-start min-h-full">
                        {files.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 transition-colors">
                                    cloud_upload
                                </span>
                                <p className="mb-2 text-sm text-text-muted transition-colors">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-text-subtle">
                                    Any file type (PDF, DOCX, IMG, ZIP, etc.) • Max 10MB recommended
                                </p>
                            </div>
                        )}
                        <AnimatePresence mode="popLayout">
                            {files.map((file) => (
                                <motion.div
                                    key={file.id}
                                    initial={{ scale: 0, rotate: -2, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="relative"
                                    layout
                                >
                                    <Card className="w-40 bg-yellow-50 dark:bg-surface-dark shadow-md relative border-border-light group hover:shadow-lg transition-all hover:border-primary/30">
                                        <CardContent className="p-3 flex justify-between items-start gap-2">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <p className="font-medium text-xs break-all text-gray-900 dark:text-text-main line-clamp-3 leading-relaxed" title={file.file.name}>{file.file.name}</p>
                                                <p className="text-[10px] text-text-muted">{(file.file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            {onRemove && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1 shrink-0 hover:bg-danger/10 hover:text-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onRemove(file.id)
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}
