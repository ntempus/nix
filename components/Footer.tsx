import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full border-t border-border-dark bg-background-dark py-8">
            <div className="mx-auto max-w-7xl px-4 flex items-center justify-center text-xs text-text-subtle">
                <p>© {new Date().getFullYear()} Nix. Security First.</p>
            </div>
        </footer>
    );
}
