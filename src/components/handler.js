import "SHIMS";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as polka_url_parser } from "@polka/url";
import { getRequest, createReadableStream } from "@sveltejs/kit/node";
import { Server } from "SERVER";
import { manifest, prerendered, base } from "MANIFEST";
import { env } from "ENV";
import { serveStaticWithAbsolutePath } from "hono-absolute-serve-static";

/**
 * @typedef {import('hono').MiddlewareHandler<{ Bindings: import('@hono/node-server').HttpBindings }>} HonoMiddleware
 * @typedef {Array<HonoMiddleware>} HonoMiddlewares
 */

/**
 * Parses the given value into number of bytes.
 *
 * @param {string} value - Size in bytes. Can also be specified with a unit suffix kilobytes (K), megabytes (M), or gigabytes (G).
 * @returns {number}
 */
export function parse_as_bytes(value) {
  const multiplier =
    {
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024
    }[value[value.length - 1]?.toUpperCase()] ?? 1;
  return Number(multiplier != 1 ? value.substring(0, value.length - 1) : value) * multiplier;
}

/* global ENV_PREFIX */

const server = new Server(manifest);

const origin = env("ORIGIN", undefined);
const xff_depth = parseInt(env("XFF_DEPTH", "1"));
const address_header = env("ADDRESS_HEADER", "").toLowerCase();
const protocol_header = env("PROTOCOL_HEADER", "").toLowerCase();
const host_header = env("HOST_HEADER", "host").toLowerCase();
const port_header = env("PORT_HEADER", "").toLowerCase();

const body_size_limit = parse_as_bytes(env("BODY_SIZE_LIMIT", "512K"));

if (isNaN(body_size_limit)) {
  throw new Error(
    `Invalid BODY_SIZE_LIMIT: '${env("BODY_SIZE_LIMIT")}'. Please provide a numeric value.`
  );
}

const dir = path.dirname(fileURLToPath(import.meta.url));

const asset_dir = `${dir}/client${base}`;

await server.init({
  env: process.env,
  read: (file) => createReadableStream(`${asset_dir}/${file}`)
});

/**
 *
 * @param {Request} request
 * @param {import('http').IncomingMessage} req
 */
async function create_server_responsed(request, req) {
  return await server.respond(request, {
    platform: { req },
    getClientAddress: () => {
      if (address_header) {
        if (!(address_header in req.headers)) {
          throw new Error(
            `Address header was specified with ${
              ENV_PREFIX + "ADDRESS_HEADER"
            }=${address_header} but is absent from request`
          );
        }

        const value = /** @type {string} */ (req.headers[address_header]) || "";

        if (address_header === "x-forwarded-for") {
          const addresses = value.split(",");

          if (xff_depth < 1) {
            throw new Error(`${ENV_PREFIX + "XFF_DEPTH"} must be a positive integer`);
          }

          if (xff_depth > addresses.length) {
            throw new Error(
              `${ENV_PREFIX + "XFF_DEPTH"} is ${xff_depth}, but only found ${
                addresses.length
              } addresses`
            );
          }
          return addresses[addresses.length - xff_depth].trim();
        }

        return value;
      }

      return (
        req.connection?.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.info?.remoteAddress
      );
    }
  });
}

/**
 * @param {string} path
 * @param {boolean} client
 */
function serve(path, client = false) {
  return (
    fs.existsSync(path) &&
    serveStaticWithAbsolutePath({
      root: path,
      onFound: client
        ? (path, c) => {
            if (path.startsWith(`/${manifest.appPath}/immutable/`)) {
              c.res.headers.append("cache-control", "public,max-age=31536000,immutable");
            }
          }
        : undefined
    })
  );
}

/** @returns {HonoMiddleware} */
function serve_prerendered() {
  return async (c, next) => {
    const req = c.env.incoming;
    let { pathname, search, query } = polka_url_parser(req);

    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      // ignore invalid URI
    }

    if (prerendered.has(pathname)) {
      return await serveStaticWithAbsolutePath({
        root: path.join(dir, "prerendered")
      })(c, next);
    }

    let location = pathname.at(-1) === "/" ? pathname.slice(0, -1) : pathname + "/";
    if (prerendered.has(location)) {
      if (query) location += search;
      return c.redirect(location, 308);
    } else {
      return await next();
    }
  };
}

/** @type {HonoMiddleware} */
const ssr = async (c) => {
  let request = c.req.raw;
  const req = c.env.incoming;

  try {
    request = await getRequest({
      base: origin || get_origin(req.headers),
      request: req,
      bodySizeLimit: body_size_limit
    });
  } catch {
    return c.text("Bad Request", 400);
  }

  return await create_server_responsed(request, req);
};

/**
 * @param {import('http').IncomingHttpHeaders} headers
 * @returns
 */
function get_origin(headers) {
  const protocol = (protocol_header && headers[protocol_header]) || "https";
  const host = headers[host_header];
  const port = port_header && headers[port_header];
  if (port) {
    return `${protocol}://${host}:${port}`;
  } else {
    return `${protocol}://${host}`;
  }
}

/** @type {HonoMiddlewares} */
export const handler = [
  serve(path.join(dir, "client"), true),
  serve(path.join(dir, "static")),
  serve_prerendered(),
  ssr
].filter(Boolean);
