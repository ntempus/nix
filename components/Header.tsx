import Link from "next/link";

export default function Header() {
    return (
        <header className="w-full border-b border-border-dark bg-background-dark sticky top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm group-hover:bg-primary-hover transition-colors">
                            <span className="material-symbols-outlined text-[18px]">
                                lock
                            </span>
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-white group-hover:text-text-main transition-colors">
                            Nix
                        </h1>
                    </Link>
                </div>
            </div>
        </header>
    );
}
