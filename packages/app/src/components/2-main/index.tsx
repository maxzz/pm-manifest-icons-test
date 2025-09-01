import { collectedIconComponents, groupByFolder } from './collected-data';

export function SectionMain() {
    return (
        <main className="w-full h-full bg-slate-50 flex items-center justify-center flex-wrap">
            {Object.entries(iconsByFolder).map(
                ([groupName, items]) => (
                    <section key={groupName} className="m-1">
                        {/* <h3 className="text-sm font-medium mb-2">{groupName}</h3> */}
                        <div className="1flex flex-wrap 1gap-4">
                            {items.map(
                                (Icon) => {
                                    const IconComponent = Icon.component;
                                    return (
                                        <div key={Icon.name}>
                                            <IconComponent className="size-6" title={Icon.name} />
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </section>
                )
            )}
        </main>
    );
}

const iconComponents = Object.values(collectedIconComponents).filter(c => c.name.startsWith('Symbol'));
const iconsByFolder = groupByFolder(iconComponents);
