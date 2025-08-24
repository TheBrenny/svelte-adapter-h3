declare global {
    namespace App {
        export interface Platform {
            /**
             * The original Node request object (https://nodejs.org/api/http.html#class-httpincomingmessage)
             */
            req: http.IncomingMessage;
            /**
             * The original Node fetch function (https://developer.mozilla.org/en-US/docs/Web/API/fetch) or a H3 `request` function
             */
            request: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | ((request: ServerRequest | URL | string, options?: RequestInit, context?: H3EventContext) => Response | Promise<Response>);
        }
    }
}