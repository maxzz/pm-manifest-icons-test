import { SymbolFire } from "../ui/icons/symbols";

export function SectionHeader() {
    return (
        <header className="w-full h-8 bg-background-light flex items-center justify-between">
            <div className="px-4 flex items-center gap-2">
                <SymbolFire className="size-6" />
            </div>
            <div className="px-4 flex items-center gap-2">
                app header
            </div>
        </header>
    );
}
