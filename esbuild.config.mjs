import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { cpSync } from "fs";
import { execSync } from "child_process";

const OBSIDIAN_BIN = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";

const prod = process.argv[2] === "production";
const outDir = "plugin-testing-vault/.obsidian/plugins/obsidian-attachments-plugin";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: `${outDir}/main.js`,
  plugins: [
    {
      name: "post-build",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) return;
          cpSync("manifest.json", `${outDir}/manifest.json`);
          if (!prod) {
            try {
              execSync(`"${OBSIDIAN_BIN}" plugin:reload id=obsidian-attachments-plugin`);
            } catch {
              // Obsidian not running or CLI not enabled
            }
          }
        });
      },
    },
  ],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
