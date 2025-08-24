import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import "../ambient.d.ts";
import type { Adapter } from "@sveltejs/kit";

const files = fileURLToPath(new URL("./files", import.meta.url).href);

type AdapterOptions = {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
	emulateBase?: string;
};

export default function (opts: AdapterOptions = {}): Adapter {
	const { out = "build", precompress = true, envPrefix = "", emulateBase = "http://localhost:5173" } = opts;

	return {
		name: "svelte-adapter-h3",

		async adapt(builder) {
			const tmp = builder.getBuildDirectory("svelte-adapter-h3");

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.log.minor("Copying assets");
			builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
			builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

			if (precompress) {
				builder.log.minor("Compressing assets");
				await Promise.all([
					builder.compress(`${out}/client`),
					builder.compress(`${out}/prerendered`)
				]);
			}

			builder.log.minor("Building server");

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				[
					`export const manifest = ${builder.generateManifest({ relativePath: "./" })};`,
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
					`export const base = ${JSON.stringify(builder.config.kit.paths.base)};`
				].join("\n\n")
			);

			const pkg = JSON.parse(readFileSync("package.json", "utf8"));

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input: {
					index: `${tmp}/index.js`,
					manifest: `${tmp}/manifest.js`
				},
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ["node"]
					}),
					commonjs({ strictRequires: true }),
					json()
				]
			});

			await bundle.write({
				dir: `${out}/server`,
				format: "esm",
				sourcemap: true,
				chunkFileNames: "chunks/[name]-[hash].js"
			});

			builder.copy(files, out, {
				replace: {
					ENV: "./env.js",
					HANDLER: "./handler.js",
					MANIFEST: "./server/manifest.js",
					SERVER: "./server/index.js",
					SHIMS: "./shims.js",
					ENV_PREFIX: JSON.stringify(envPrefix)
				}
			});
		},

		async emulate() {
			return {
				platform() {
					return {
						req: null,
						request: (request: string | URL | Request, init?: RequestInit): Promise<Response> => {
							if (typeof request === "string" && request.startsWith("/")) request = new URL(request, emulateBase);
							return fetch(request, init)
						}
					}
				}
			};
		},

		supports: {
			read: () => true
		}
	};
}
