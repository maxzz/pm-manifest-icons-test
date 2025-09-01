import { type CollectedIconType, collectedIconComponents, groupByFolder } from './collected-data';

export function SectionMain() {
    return (
        <main className="w-full h-full bg-slate-50 flex items-center justify-center flex-wrap">
            {iconsByFolder.map(
                ([groupName, items]) => (
                    <section key={groupName} className="flex flex-col bg-amber-100 m-1">
                        <h3 className="text-sm font-medium mb-2">{groupName}</h3>
                        <div className="flex flex-col flex-wrap 1gap-4">
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

function SingleIcon({ icon }: { icon: CollectedIconType }) {
    const IconComponent = icon.component;
    return (
        <div className="border border-slate-200 rounded-md p-1" key={icon.name}>
            <IconComponent className="size-6" title={icon.name} />
        </div>
    );
}

const iconComponents = Object.values(collectedIconComponents).filter(c => c.name.startsWith('Symbol'));
const iconsByFolder = Object.entries(groupByFolder(iconComponents));
