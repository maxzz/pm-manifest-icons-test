import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolHardDrive() {
    return (<>
        <symbol id="icon-hard-drive" viewBox="0 0 20 20">
            <path d="M14.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM2.24 10.84A2.94 2.94 0 0 0 2 12v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2c0-.38-.06-.77-.19-1.14a54.84 54.84 0 0 0-2.45-5.77A1.96 1.96 0 0 0 13.59 4H6.5a2 2 0 0 0-1.84 1.21l-2.41 5.63ZM6.49 5h7.1c.38 0 .71.2.87.53.47.95 1.27 2.65 1.99 4.52A2.01 2.01 0 0 0 16 10H4c-.11 0-.22 0-.32.03L5.57 5.6A1 1 0 0 1 6.49 5ZM17 14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2Z" />
        </symbol>
    </>);
}

export function SymbolHardDrive({ title, className, ...rest }: HTMLAttributes<SVGSVGElement> & SVGAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-current", className)} {...rest}>
            {title && <title>{title}</title>}
            <use xlinkHref="#icon-hard-drive" />
        </svg>
    );
}
