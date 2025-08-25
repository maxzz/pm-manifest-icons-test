import { collectedSymbols } from './collected-test';

console.log(collectedSymbols);

export function SectionMain() {
    return (
        <main className="flex items-center justify-center w-full h-full bg-slate-50">
            {Object.values(collectedSymbols).map((Icon) => (
                <div key={Icon.name}>
                    <Icon className="size-6" />
                </div>
            ))}
        </main>
    );
}
