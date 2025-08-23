import { UISymbolDefs } from "../ui/icons/symbols";

export function App() {
    return (
        <div className="min-h-screen bg-slate-100 grid place-items-center">
            <UISymbolDefs />
            Start
        </div>
    );
}

// import { SectionHeader } from "../1-debug-header";
// import { SectionMain } from "../2-main";
// import { SectionFooter } from "../3-footer";
// import { appSettings } from "@/store";

export function AppContent() {
    return (<>
        <div className={topClasses}>
            {/* <SectionHeader />
            <SectionMain />
            <SectionFooter /> */}
        </div>
    </>);
}

const topClasses = "h-screen text-sm text-foreground bg-background grid grid-rows-[auto,1fr,auto] overflow-hidden"; {/* debug-screens */ }
