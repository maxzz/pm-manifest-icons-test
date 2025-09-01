import { SymbolFire } from "../ui/icons/symbols";

export function SectionHeader() {
    return (
        <header className="px-4 w-full h-8 bg-background-light border-b border-sky-200 shadow flex items-center gap-1">
            <div className="flex items-center gap-2">
                {/* <SymbolFire className="size-6 text-amber-200 [--fill-a:var(--color-hi)]" /> */}
                <SymbolFire className="size-6 text-sky-500 [--fill-a:var(--color-sky-400)] opacity-25" />
            </div>
            <div className="text-xs font-semibold uppercase text-sky-700/25">
                SVG Symbol Icons Tester
            </div>
        </header>
    );
}
