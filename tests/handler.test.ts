import request from "supertest";
import { H3, serve } from "h3";
import { beforeAll, describe, expect, test } from "vitest";

import { svelteApp } from "./app/build/handler.js";

describe("H3 handler's tests", () => {
	const app = new H3();

	app.get("/api/test", () => "this is get request");
	app.post("/api/test", () => "this is post request");

	app.all("/**/*", ({ req }) => {
		return svelteApp.fetch(req);
	});

	const server = serve(app);
	if (server.node === undefined) throw new Error("This runtime is not node");
	if (server.node.server === undefined) throw new Error("Server is not running");
	const client = request(server.node.server);

	beforeAll(() => {
		server.close();
	});

	test("static file check", async () => {
		const res = await client.get("/favicon.svg");
		expect(res.status).toBe(200);
	});

	test("page check (/images)", async () => {
		const res = await client.get("/images");
		expect(res.status).toBe(200);
	});

	test("page check (/[slug])", async () => {
		const res = await client.get("/example");
		expect(res.status).toBe(200);
	});

	test("404 page check", async () => {
		const res = await client.get("/this/is/not-found");
		expect(res.status).toBe(404);
	});

	test("api check (get)", async () => {
		const res = await client.get("/api/test");
		expect(res.status).toBe(200);
		expect(res.text).toBe("this is get request");
	});

	test("api check (post)", async () => {
		const res = await client.post("/api/test");
		expect(res.status).toBe(200);
		expect(res.text).toBe("this is post request");
	});
});
