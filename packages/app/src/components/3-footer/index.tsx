import { IconSunnyvale } from "../ui/icons";

export function SectionFooter() {
    return (
        <footer className="px-4 w-full h-8 text-xs text-sky-700 bg-background-light border-t border-sky-200 opacity-50">
            <div className="m-auto w-full scale-75 origin-bottom flex items-center justify-center gap-2">
                <p className="text-right">
                    Created by Max Zakharzhevskiy.
                </p>

                <IconSunnyvale className="pt-0.5 size-5 scale-150 origin-center" />

                <p>
                    Open sourced on <a className="underline" href="https://github.com/maxzz/maxzz.github.io" target="_blank" rel="noopener">Github</a>.
                </p>
            </div>
        </footer>
    );
}
