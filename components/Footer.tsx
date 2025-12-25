import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full border-t border-border-dark bg-background-dark py-8">
            <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-subtle">
                <p>© 2023 Nix. Security First.</p>
                <div className="flex gap-6">
                    <Link
                        className="hover:text-text-muted transition-colors"
                        href="#"
                    >
                        Privacy
                    </Link>
                    <Link
                        className="hover:text-text-muted transition-colors"
                        href="#"
                    >
                        Terms
                    </Link>
                    <Link
                        className="hover:text-text-muted transition-colors"
                        href="#"
                    >
                        Contact
                    </Link>
                </div>
            </div>
        </footer>
    );
}
