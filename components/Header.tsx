import Link from "next/link";
import { Github } from "lucide-react";

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background-dark/60 backdrop-blur-xl transition-all duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary-hover text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-icon lucide-key"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" /></svg>
                            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20"></div>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-primary-light transition-colors">
                            Nix
                        </h1>
                    </Link>

                    <nav className="flex items-center gap-3">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                            aria-label="View source on GitHub"
                        >
                            <Github className="w-5 h-5" />
                        </a>


                    </nav>
                </div>
            </div>
        </header>
    );
}
