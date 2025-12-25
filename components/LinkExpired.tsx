import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";

export default function LinkExpired() {
    return (
        <>
            <Header />

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-20 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="layout-content-container flex flex-col max-w-[480px] w-full relative z-10">
                    <div className="flex flex-col items-center gap-8 bg-surface-dark p-8 md:p-10 rounded-2xl shadow-card border border-surface-border">
                        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20">
                            <span className="material-symbols-outlined text-[36px] text-red-500">
                                link_off
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-center">
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white">
                                Link Expired or Viewed
                            </h1>
                            <p className="text-text-muted text-[15px] font-normal leading-relaxed max-w-sm">
                                For security reasons, this secret is no longer available. It has
                                either been viewed and deleted, or the 24-hour expiration time
                                has passed.
                            </p>
                        </div>
                        <div className="flex flex-col w-full gap-3 mt-2">
                            <button className="group flex w-full cursor-pointer items-center justify-center rounded-xl h-11 px-6 bg-primary hover:bg-primary-hover border border-transparent text-white text-[14px] font-semibold tracking-wide transition-all shadow-glow">
                                <span className="mr-2 material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                                    add_circle
                                </span>
                                <span>Create a New Secret</span>
                            </button>
                            <Link
                                className="flex w-full cursor-pointer items-center justify-center rounded-xl h-10 px-6 text-text-muted hover:text-white hover:bg-surface-border text-[13px] font-medium transition-all"
                                href="#"
                            >
                                Learn more about our security model
                            </Link>
                        </div>
                    </div>
                    <div className="mt-8 flex items-center justify-center gap-2 text-text-muted text-xs font-medium bg-surface-darker/50 py-2 px-4 rounded-full border border-surface-border/50 self-center backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[16px] text-gray-500">
                            lock
                        </span>
                        <span>Zero-knowledge encryption. No logs.</span>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
