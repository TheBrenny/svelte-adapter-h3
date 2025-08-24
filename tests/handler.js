import {H3, serve} from "h3";
import {svelteApp, setRequest} from "./app/build/handler.js";

const app = new H3();

app.get("/api/test", () => ["this is get request"]);
app.post("/api/test", () => ["this is post request"]);

app.all("/**/*", ({req}) => svelteApp.fetch(req));
setRequest(app.request);

serve(app);