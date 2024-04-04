import { pipe } from "effect";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const routesDirectory = "./src/routes";
const filesToCheck = ["page.tsx", "layout.tsx"];

const traverseDirectory = (directory: string) =>
  pipe(readdirSync(directory), (dirs) =>
    dirs.reduce((acc, file): string[] => {
      const filePath = join(directory, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        return traverseDirectory(filePath);
      } else if (filesToCheck.some((name) => file.endsWith(name))) {
        acc.push(filePath);
      }

      return acc;
    }, [] as string[]),
  );

const program = pipe(traverseDirectory(routesDirectory));
