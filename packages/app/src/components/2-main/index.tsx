import { collectedIconComponents } from './collected-test';

export function SectionMain() {
    return (
        <main className="w-full h-full bg-slate-50 flex items-center justify-center flex-wrap">
            {Object.entries(groups).map(
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

const filtered = Object.values(collectedIconComponents).filter(c => c.name.startsWith('Symbol'));
const groups = groupByFolder(filtered);

// group by folder (use 'root' when folder is missing); include sub-folder if present
function groupByFolder(items: Array<any>) {
    return items.reduce<Record<string, typeof items[number][]>>((acc, item) => {
        const folder = item.folder || 'root';
        const sub = item.sub ? `/${item.sub}` : '';
        const key = `${folder}${sub}`;
        (acc[key] ||= []).push(item);
        return acc;
    }, {});
}
