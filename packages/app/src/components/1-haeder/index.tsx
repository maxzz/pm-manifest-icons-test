import { SymbolFire } from "../ui/icons/symbols";

export function SectionHeader() {
    return (
        <header className="px-4 w-full h-8 bg-background-light flex items-center justify-between">
            <div className="flex items-center gap-2">
                <SymbolFire className="size-6 text-red-600 [--fill-a:var(--color-hi)]" />
            </div>
            <div className="text-xs flex items-center gap-2">
                SVG Symbol Icons Tester
            </div>
        </header>
    );
}
