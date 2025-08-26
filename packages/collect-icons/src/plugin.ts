import { type Plugin } from 'vite';
import { CollectIconsOptions } from './types';
import { collectIcons } from './collect';

export default function collectIconsPlugin(opts: CollectIconsOptions = {}): Plugin {
    return {
        name: 'vite-plugin-collect-icons',
        apply: 'build',
        async buildStart() {
            await collectIcons(opts);
        }
    };
}
