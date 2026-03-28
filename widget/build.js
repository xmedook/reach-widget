const { build } = require("esbuild");
const fs = require("fs");
const path = require("path");

const outfile = path.join(__dirname, "dist", "rw.min.js");

build({
  entryPoints: [path.join(__dirname, "src", "widget.js")],
  outfile,
  bundle: true,
  minify: true,
  target: ["es2015"],
  format: "iife",
}).then(() => {
  const stat = fs.statSync(outfile);
  const kb = (stat.size / 1024).toFixed(2);
  console.log(`Built: ${outfile} (${kb} KB)`);
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
