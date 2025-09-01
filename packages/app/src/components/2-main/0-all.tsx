import { type CollectedIconType, collectedIconComponents, groupByFolder } from './8-collected-data';

export function SectionMain() {
    return (
        <main className="w-full h-full bg-slate-50 grid grid-cols-[1fr_repeat(var(--cols,2),auto)_1fr] place-items-start gap-4 overflow-auto" style={{ '--cols': iconsByFolder.length }}>
            {iconsByFolder.map(
                ([groupName, items], idx) => (
                    <section key={groupName} className="grid place-items-center" style={{ gridColumnStart: `${idx + 2}` }}>
                        <h3 className="my-2 text-sm font-medium text-sky-700">{groupName}</h3>

                        <div className="place-self-center grid gap-1">
                            {items.map(
                                (icon) => <SingleIcon icon={icon} />
                            )}
                        </div>
                    </section>
                )
            )}
        </main>
    );
}

function SingleIcon({ icon }: { icon: CollectedIconType; }) {
    const IconComponent = icon.component;
    return (
        <div className="border border-slate-500 bg-sky-50 rounded p-1" key={icon.name}>
            <IconComponent className="size-6" title={icon.name} />
        </div>
    );
}

const iconComponents = Object.values(collectedIconComponents).filter(c => c.name.startsWith('Symbol'));
const iconsByFolder = Object.entries(groupByFolder(iconComponents));
