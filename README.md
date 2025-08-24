# SvelteKit H3 adapter

[Adapter](https://svelte.dev/docs/kit/adapters) for SvelteKit apps that generates a H3 server.

## Installation

```console
npm install svelte-adapter-h3
```

## Usage

### SvelteKit Config

```js
import adapter from "svelte-adapter-h3";

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
import { H3, serve } from "h3";

import { handler } from "./build/handler.js";

const app = new H3();

app.get("/api", () => "your api routes");
app.all("/", ({ req }) => handler.fetch(req)); // can't `use` or `mount` because of middleware hoisting

serve(app);
```

### Enviroment variables

svelte-adapter-h3 employs the same environment variables as [adapter-node](https://svelte.dev/docs/kit/adapter-node#Environment-variables).

### Options

svelte-adapter-h3 employs the same options as [adapter-node](https://svelte.dev/docs/kit/adapter-node#Options).

## Respect

[adapter-hono](https://www.npmjs.com/package/adapter-hono)
[@sveltejs/adapter-node](https://www.npmjs.com/package/@sveltejs/adapter-node)
