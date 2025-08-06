import { Hono } from "hono";
import { handler } from "HANDLER";

export const app = new Hono().use(...handler);
