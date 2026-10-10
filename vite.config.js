// vite.config.js - GIVEN, finished. Vite is the tool behind  npm run dev  and  npm run build.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

// After a build, the folder dist also holds a small file version.json: the version from src/version.js and whether
// the search is switched on in src/features.js. The published site carries it, so anyone can ask which release is live.
function releaseFile()
{
  return {
    name: "release-file",
    generateBundle()
    {
      const version = /VERSION\s*=\s*"([^"]*)"/.exec(fs.readFileSync("src/version.js", "utf8"));
      const search = /SEARCH\s*=\s*true\b/.test(fs.readFileSync("src/features.js", "utf8").replace(/\/\/.*$/gm, ""));
      const release = { version: version ? version[1] : "", search: search };
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(release) + "\n" });
    }
  };
}

export default defineConfig({
  // "./" makes the built page ask for its files beside itself, so it works at any address
  base: "./",
  plugins: [react(), releaseFile()],
  // a Codespace shows the page through an address of its own, which must be let in
  server: { allowedHosts: [".app.github.dev"] },
  preview: { allowedHosts: [".app.github.dev"] }
});
