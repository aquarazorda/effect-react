import { renderToReadableStream } from "react-dom/server";
import * as Http from "@effect/platform/HttpServer";
import * as BunServer from "@effect/platform-bun/Http/Server";
import { Layer, Effect, Stream, pipe, Chunk, flow } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import StreamingComponent from "./component";

const ServerLive = BunServer.layer({
  port: 3000,
});

const mainRoute = Http.router.get(
  "/",
  Effect.gen(function* (_) {
    const componentReadable = yield* _(
      Effect.tryPromise(() => renderToReadableStream(<StreamingComponent />)),
    );
    const componentStream = Stream.fromReadableStream(
      () => componentReadable,
      () => "",
    );

    return Http.response.stream(
      pipe(
        Stream.make(
          "<html><head><title>Page</title></head><body><div id='root'>",
        ),
        Stream.concat(componentStream),
        Stream.concat(Stream.make("</div></body></html>")),
      ),
      {
        status: 200,
        contentType: "text/html",
      },
    );
  }),
);

const serve = Http.router.empty.pipe(
  mainRoute,
  Http.server.serve(),
  Layer.provide(ServerLive),
);

BunRuntime.runMain(Layer.launch(serve));
