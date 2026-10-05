import type { BuildResult } from 'esbuild'

/** The page script, bundled for the browser, as text. */
export declare const pasteScript: () => string

/** The stand-in for the server on a page to try on the website, bundled for the browser, as text. */
export declare const demoScript: () => string

/** The page's `@font-face` rules, with the fonts inlined, as CSS. */
export declare const fontFaces: () => string

/** Defines that inline the page script and fonts into a bundle. */
export declare const clientDefines: () => Record<string, string>

/** Builds the plugin bundle into `dist/`. */
export declare const build: () => Promise<BuildResult>
