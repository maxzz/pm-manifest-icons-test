import { collectedSymbols } from './collected-test';

console.log(collectedSymbols);

export function SectionMain() {
    return (
        <main className="flex flex-col items-center justify-center w-full h-full bg-background-light">
            {Object.values(collectedSymbols).map((Icon) => (
                <div key={Icon.name}>
                    <Icon className="size-6" />
                </div>
            ))}
        </main>
    );
}
