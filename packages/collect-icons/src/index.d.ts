import { Plugin } from 'vite';

export interface CollectIconsOptions {
  srcDir?: string;
  outFile?: string;
}

declare function collectIconsPlugin(opts?: CollectIconsOptions): Plugin;

export default collectIconsPlugin;
