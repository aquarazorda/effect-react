import { renderToReadableStream } from "react-dom/server";
import * as Http from "@effect/platform/HttpServer";
import * as BunServer from "@effect/platform-bun/Http/Server";
import { Layer, Effect, Stream, pipe, Chunk, flow, Logger } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import { lazy } from "react";

const ServerLive = BunServer.layer({
  port: 3000,
});

class ReactError {
  readonly _tag = "ReactError";
  message: string = "";
  constructor(message?: string) {
    if (message) {
      this.message = message;
    }
  }
}

const renderFromUrl = (response: Http.request.ServerRequest) =>
  Effect.gen(function* (_) {
    const path = response.url.split("/");
    const filePath = `${import.meta.dir}/routes/${path
      .filter((s) => s)
      .join("/")}/page.tsx`;

    if (!Bun.file(filePath).size) {
      return Http.response.text("404", { status: 404 });
    }

    const Component = lazy(() => import(filePath));

    const componentReadable = yield* _(
      pipe(
        Effect.tryPromise(() => renderToReadableStream(<Component />)),
        Effect.map((c) =>
          Stream.fromReadableStream(
            () => c,
            () => undefined,
          ),
        ),
        Effect.flatMap(Effect.fromNullable),
        Effect.mapError(
          () => new ReactError("Route is not exporting default function."),
        ),
      ),
    );

    return Http.response.stream(
      pipe(
        Stream.make(
          "<html><head><title>Page</title></head><body><div id='root'>",
        ),
        Stream.concat(componentReadable),
        Stream.concat(Stream.make("</div></body></html>")),
      ),
      {
        status: 200,
        contentType: "text/html",
      },
    );
  });

const serve = Http.router.empty.pipe(
  Http.router.route("*")(
    "*",
    pipe(
      Http.request.ServerRequest,
      Effect.tap(Effect.logInfo),
      Effect.flatMap(renderFromUrl),
    ),
  ),
  Http.server.serve(),
  Layer.provide(ServerLive),
);

BunRuntime.runMain(Layer.launch(serve));
