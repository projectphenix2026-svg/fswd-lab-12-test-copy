// .check/render.js - GIVEN. Loads one file of the project the way the build does, and draws a component as text.
// The checks and  npm run badge / npm run footer  use it, so what they look at is what your code really makes.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));

// What a file exports, with everything it imports. "swap" names files whose text is replaced for this one load:
// that is how a check tries a component with another version number than the one typed into the project.
export async function load(file, swap)
{
  const esbuild = require("esbuild");
  const other = swap || {};
  const plugin = {
    name: "swap",
    setup(build)
    {
      build.onLoad({ filter: /\.(js|jsx)$/ }, (args) =>
      {
        const name = path.relative(ROOT, args.path).replace(/\\/g, "/");
        return name in other ? { contents: other[name], loader: "jsx" } : null;
      });
    }
  };
  let built;
  try
  {
    built = await esbuild.build({
      entryPoints: [path.join(ROOT, file)], bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime"], loader: { ".css": "empty" }, plugins: [plugin], logLevel: "silent"
    });
  }
  catch (e)
  {
    const first = e && e.errors && e.errors[0];
    const where = first && first.location ? path.relative(ROOT, first.location.file).replace(/\\/g, "/") + ", line " + first.location.line + ": " : "";
    throw new Error(where + (first ? first.text : String(e && e.message || e).split("\n")[0]));
  }
  const module = { exports: {} };
  new Function("require", "module", "exports", built.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

// a component drawn once, as the HTML a browser would be given
export function draw(Component)
{
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  return renderToStaticMarkup(React.createElement(Component));
}

// the words a reader sees in that HTML
export function words(html)
{
  return String(html).replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ").trim();
}
