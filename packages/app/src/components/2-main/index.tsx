import { collectedIconComponents } from './collected-test';

const filtered = Object.values(collectedIconComponents).filter(c => c.name.startsWith('Symbol'));

export function SectionMain() {
    return (
        <main className="w-full h-full bg-slate-50 flex items-center justify-center flex-wrap">
            {Object.values(filtered).map((Icon) => (
                <div key={Icon.name}>
                    <Icon className="size-6" />
                </div>
            ))}
        </main>
    );
}
