import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolStitches() {
    return (<>
        {/* stitches */}
        <symbol id="icon-stitches" viewBox="0 0 35 35">
            <circle cx="17.5" cy="17.5" r="14.5" strokeWidth="2" />
            <path d="m12.82 31.32 19.05-11" />
            <path d="m3.32 14.87 19.05-11" />
            <path d="m8.65 29.1 17.32-10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m9.22 16.08 17.32-10" strokeLinecap="round" />
            <path d="m13.23 14.23 9.28 6.88" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m16.7 12.23 9.27 6.88" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m9.22 16.08 9.83 7.03" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
    </>);
}

export function SymbolStitches({ title, className, ...rest }: HTMLAttributes<SVGSVGElement> & SVGAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            <use xlinkHref="#icon-stitches" />
        </svg>
    );
}
