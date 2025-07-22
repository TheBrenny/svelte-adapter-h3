# SvelteKit hono adapter

[Adapter](https://svelte.dev/docs/kit/adapters) for SvelteKit apps that generates a hono server.

## Installation

```console
npm install adapter-hono
```

## Usage

### SvelteKit Config

```js
import adapter from "adapter-hono";

export default {
  kit: {
    adapter: adapter()
  }
};
```

To start up the default server, execute the following command.

```console
$ npm build
$ node build/index.js
```

### Custom server

```js
import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { handler } from "./build/handler.js";

const app = new Hono();

app.use(...handler);

serve(app);
```

### Enviroment variables

adapter-hono employs the same environment variables as [adapter-node](https://svelte.dev/docs/kit/adapter-node#Environment-variables).

## Respect

[@sveltejs/adapter-node](https://www.npmjs.com/package/@sveltejs/adapter-node)
