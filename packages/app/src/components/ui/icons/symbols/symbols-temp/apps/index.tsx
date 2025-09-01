import { SvgSymbolManualMode } from "./01-manual-mode";
import { SvgSymbolStitches } from "./02-stitches";
import { SvgSymbolReactSpring } from "./03-react-spring";

export * from "./01-manual-mode";
export * from "./02-stitches";
export * from "./03-react-spring";

export function DefAppsTypes() {
    return (<>
        {SvgSymbolManualMode()}
        {SvgSymbolStitches()}
        {SvgSymbolReactSpring()}
    </>);
}
