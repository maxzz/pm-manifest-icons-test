import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolReactSpring() {
    return (<>
        {/* react-spring */}
        <symbol id="icon-react-spring" viewBox="0 0 24 24">
            <circle cx="11.27" cy="12.25" r="6.05" fill="currentColor" opacity={.2} />
            <path d="M5.91 20.03C.2 21.9.76 16.87 3.32 13.32c-4.45.36-1.28-5.24.14-7.1-.11-.24-.47-.43-.25-.72 1.62.27 5.76-6.42 6.36-3.95-.98 2.73-3.93 3.75-5.6 5.77-1.19 1.62-3.63 6.09.2 4.69.5-.38.84-1.06 1.34-1.5l-.18 1.05a27.77 27.77 0 0 0 10.82-8.74l-.09-.16c-2.34 1.08-3.93 3.58-6.67 3.6 1.9-2.8 11.76-8.68 6.41-.96-2.96 3.58-6.94 5.56-10.77 7.79-1.47 1.73-4.54 7.42.02 5.91 1.11-.14 1.83-.75 2.31-1.83 3.02 1.44 11.9-6.71 13.76-9.52-1.65.3-2.97 1.3-4.36 2.19l-.59-1.16c1.35-1 6.5-4.21 5.96-.47-3.21 5.13-8.79 8.56-14.05 10.98-3.65 3.85 3.39 3.2 4.53.79 11.78-14.4 15.43-6.53.75 1.66l.39.45a.96.96 0 0 1-1.32.24c-2.29.23-7.33 2.34-6.52-2.3Zm15.38-6.4a35.15 35.15 0 0 0-6.7 5.91 21.86 21.86 0 0 0 6.7-5.91Z" />
        </symbol>
    </>);
}

export function SymbolReactSpring({ title, className, ...rest }: HTMLAttributes<SVGSVGElement> & SVGAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            <use xlinkHref="#icon-react-spring" />
        </svg>
    );
}
