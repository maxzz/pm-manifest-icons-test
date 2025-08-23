import { SectionHeader } from "../1-haeder";
import { SectionMain } from "../2-main";
import { SectionFooter } from "../3-footer";
import { UISymbolDefs } from "../ui/icons/symbols";

export function App() {
    return (
        <div className={topClasses}>
            <UISymbolDefs />
            <SectionHeader />
            <SectionMain />
            <SectionFooter />
        </div>
    );
}

const topClasses = "h-screen text-sm text-foreground bg-background grid grid-rows-[auto,1fr,auto] overflow-hidden"; {/* debug-screens */ }
