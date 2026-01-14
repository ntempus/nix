"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Security() {
    return (
        <>
            <Header />
            <main className="flex-grow flex flex-col items-center justify-start pt-24 pb-24 px-4 sm:px-6 relative overflow-hidden min-h-screen">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                <div className="w-full max-w-3xl space-y-12">
                    {/* Hero Section */}
                    <div className="space-y-6 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                            Security by Design.
                        </h1>
                        <p className="text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
                            We don't trust our servers with your data, and neither should you.
                            Here is how Nix guarantees your secrets remain secret.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Section 1: Client-Side Encryption */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-8 rounded-2xl bg-surface-dark border border-border-dark"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined text-2xl">lock</span>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-xl font-semibold text-white">Client-Side Encryption</h2>
                                    <p className="text-text-muted leading-relaxed">
                                        Encryption happens <strong>in your browser</strong> using the Web Crypto API (AES-GCM) before any data touches the network. The server only ever receives the encrypted blob.
                                    </p>
                                    <p className="text-text-muted leading-relaxed">
                                        The encryption key is generated locally and is part of the URL hash (the part after <code>#</code>).
                                        Because hash fragments are never sent to the server, <strong>we literally cannot decrypt your data</strong> even if we wanted to.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Section 2: Zero Knowledge Architecture */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-8 rounded-2xl bg-surface-dark border border-border-dark"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined text-2xl">visibility_off</span>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-xl font-semibold text-white">Zero Knowledge Architecture</h2>
                                    <p className="text-text-muted leading-relaxed">
                                        Nix operates on a zero-knowledge basis. We store the encrypted message, but we do not store the key.
                                    </p>
                                    <ul className="list-disc list-inside text-text-muted space-y-2 ml-2">
                                        <li>The key never leaves your device (except when you share the link).</li>
                                        <li>If our database were compromised, the attacker would only find useless encrypted gibberish.</li>
                                        <li>We have no logs of your keys or decrypted content.</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>

                        {/* Section 3: Ephemeral Storage */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-8 rounded-2xl bg-surface-dark border border-border-dark"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined text-2xl">timer_off</span>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-xl font-semibold text-white">Ephemeral & Self-Destructing</h2>
                                    <p className="text-text-muted leading-relaxed">
                                        Data is transient. You choose the lifetime of your secret (from one-time use to 24 hours).
                                    </p>
                                    <p className="text-text-muted leading-relaxed">
                                        Once a "Burn on read" link is visited, it is immediately deleted from our database.
                                        Time-based links are automatically purged by a background worker precisely when they expire.
                                        Once deleted, data is unrecoverable.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* FAQ / Technical Details */}
                    <div className="pt-8 border-t border-border-dark">
                        <h3 className="text-2xl font-bold text-white mb-6 text-center">Technical Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-xl bg-background-dark/50 border border-border-dark">
                                <h4 className="font-mono text-indigo-400 mb-2">Algorithm</h4>
                                <p className="text-sm text-text-muted">AES-GCM (256-bit)</p>
                            </div>
                            <div className="p-6 rounded-xl bg-background-dark/50 border border-border-dark">
                                <h4 className="font-mono text-indigo-400 mb-2">Key Generation</h4>
                                <p className="text-sm text-text-muted">Web Crypto API: window.crypto.subtle</p>
                            </div>
                            <div className="p-6 rounded-xl bg-background-dark/50 border border-border-dark">
                                <h4 className="font-mono text-indigo-400 mb-2">Key Transport</h4>
                                <p className="text-sm text-text-muted">URL Fragment Identifier (Client-only)</p>
                            </div>
                            <a
                                href="https://github.com/ntempus/nix"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-6 rounded-xl bg-background-dark/50 border border-border-dark hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-mono text-indigo-400">Source Code</h4>
                                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">open_in_new</span>
                                </div>
                                <p className="text-sm text-text-muted group-hover:text-text-main transition-colors">Open Source & Auditable on GitHub</p>
                            </a>
                        </div>
                    </div>

                </div>

                {/* CTA Section */}
                <div className="flex flex-col items-center justify-center pt-12 pb-6 text-center space-y-6">
                    <h3 className="text-2xl font-bold text-white">Ready to share securely?</h3>
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover px-8 py-3 text-base font-medium text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/40"
                    >
                        <span className="material-symbols-outlined">add_link</span>
                        Create a Secure Link
                    </Link>
                </div>

            </main>
            <Footer />
        </>
    );
}
