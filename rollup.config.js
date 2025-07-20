import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { builtinModules } from "node:module";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * @param {string} filepath
 * @returns {import('rollup').Plugin}
 */
function clearOutput(filepath) {
  return {
    name: "clear-output",
    buildStart: {
      order: "pre",
      sequential: true,
      handler() {
        rmSync(filepath, { recursive: true, force: true });
      }
    }
  };
}

/**
 * @param {string} filepath
 * @returns {import("rollup").Plugin}
 */
function copyOutput(filepath) {
  return {
    name: "copy-output",
    writeBundle: (outputOptions, bundle) => {
      const outputFiles = Object.keys(bundle)
        .map((fileName) => {
          const file = bundle[fileName];
          return file.isAsset ? null : fileName;
        })
        .filter((value) => value !== null);
      outputFiles.forEach((fileName) => {
        const sourcePath = outputOptions.file ?? resolve(outputOptions.dir, fileName);
        const destPath = resolve(filepath);

        mkdirSync(dirname(destPath), { recursive: true });

        copyFileSync(sourcePath, destPath);
        console.log(`Copied ${sourcePath} to ${destPath}`);
      });
    }
  };
}

/**
 * @returns {import('rollup').Plugin}
 */
function prefixBuiltinModules() {
  return {
    name: "prefix-built-in-modules",
    resolveId(source) {
      if (builtinModules.includes(source)) {
        return { id: "node:" + source, external: true };
      }
    }
  };
}

export default [
  {
    input: "src/components/index.js",
    output: {
      file: "src/files/index.js",
      format: "esm"
    },
    plugins: [
      clearOutput("src/files/index.js"),
      copyOutput("dist/files/index.js"),
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      prefixBuiltinModules()
    ],
    external: ["ENV", "HANDLER"]
  },
  {
    input: "src/components/env.js",
    output: {
      file: "src/files/env.js",
      format: "esm"
    },
    plugins: [
      clearOutput("src/files/env.js"),
      copyOutput("dist/files/env.js"),
      nodeResolve(),
      commonjs(),
      json(),
      prefixBuiltinModules()
    ],
    external: ["HANDLER"]
  },
  {
    input: "src/components/handler.js",
    output: {
      file: "src/files/handler.js",
      format: "esm",
      inlineDynamicImports: true
    },
    plugins: [
      clearOutput("src/files/handler.js"),
      copyOutput("dist/files/handler.js"),
      nodeResolve(),
      commonjs(),
      json(),
      prefixBuiltinModules()
    ],
    external: ["ENV", "MANIFEST", "SERVER", "SHIMS"]
  },
  {
    input: "src/components/shims.js",
    output: {
      file: "src/files/shims.js",
      format: "esm"
    },
    plugins: [
      clearOutput("src/files/shims.js"),
      copyOutput("dist/files/shims.js"),
      nodeResolve(),
      commonjs(),
      prefixBuiltinModules()
    ]
  }
];
