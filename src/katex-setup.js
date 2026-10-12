/**
 * Register KaTeX extensions on the same module instance rehype-katex uses.
 * Side-effect-only imports can be tree-shaken unless this module is imported from main.
 */
import katex from "katex";
import "katex/contrib/mhchem";

export default katex;
