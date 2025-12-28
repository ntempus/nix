"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DropdownMenuProps = {
    options: {
        label: string;
        onClick: () => void;
        Icon?: React.ReactNode;
    }[];
    children: React.ReactNode;
};

const DropdownMenu = ({ options, children }: DropdownMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Close on Escape key
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                onClick={toggleDropdown}
                className="min-w-[150px] justify-between px-4 py-2 bg-surface-lighter/60 hover:bg-surface-lighter/90 shadow-[0_0_20px_rgba(0,0,0,0.2)] border border-border-light/50 rounded-xl backdrop-blur-md text-text-main transition-all duration-300"
            >
                <span className="truncate">{children ?? "Menu"}</span>
                <motion.span
                    className="ml-2 flex-shrink-0"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "circOut" }}
                >
                    <ChevronDown className="h-4 w-4 opacity-70" />
                </motion.span>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 z-50 w-full min-w-[180px] mt-2 p-1.5 bg-surface-lighter/95 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col gap-1 border border-white/10 origin-top-right overflow-hidden"
                    >
                        {options && options.length > 0 ? (
                            options.map((option, index) => (
                                <motion.button
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        duration: 0.2,
                                        delay: index * 0.03, // Stagger effect
                                        ease: "easeOut",
                                    }}
                                    key={option.label}
                                    onClick={() => {
                                        setIsOpen(false);
                                        option.onClick();
                                    }}
                                    className="group relative px-3 py-2.5 cursor-pointer text-text-main text-sm rounded-lg w-full text-left flex items-center gap-x-3 transition-all hover:bg-white/10 active:scale-98"
                                >
                                    {option.Icon && (
                                        <span className="text-text-muted group-hover:text-white transition-colors">
                                            {option.Icon}
                                        </span>
                                    )}
                                    <span className="font-medium">{option.label}</span>
                                </motion.button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-text-muted text-xs">No options</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export { DropdownMenu };
