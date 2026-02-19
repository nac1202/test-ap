import Link from "next/link";
import { Menu } from "lucide-react";

export function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-cyan-600 text-white shadow-md flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-xl font-bold tracking-wide">
                    Kizuna Safety
                </Link>
            </div>
            <button className="p-2 hover:bg-cyan-700 rounded-full transition-colors">
                <Menu className="w-6 h-6" />
            </button>
        </header>
    );
}
