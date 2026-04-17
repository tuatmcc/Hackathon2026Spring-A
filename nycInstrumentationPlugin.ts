import type { Plugin } from "vite";

const SHOULD_INSTRUMENT_WITH_NYC = process.env.NYC_INSTRUMENT === "true";

export function createNycInstrumentationPlugin(): Plugin {
  let instrumenterPromise: Promise<{
    instrumentSync: (code: string, filename: string, sourceMap?: object) => string;
    lastSourceMap: () => object | undefined;
  }> | null = null;

  const loadInstrumenter = () => {
    instrumenterPromise ??= import(String("istanbul-lib-instrument")).then((module: unknown) => {
      const { createInstrumenter } = module as {
        createInstrumenter: (options: {
          esModules: boolean;
          produceSourceMap: boolean;
          compact: boolean;
          parserPlugins: string[];
        }) => {
          instrumentSync: (code: string, filename: string, sourceMap?: object) => string;
          lastSourceMap: () => object | undefined;
        };
      };

      return createInstrumenter({
        esModules: true,
        produceSourceMap: true,
        compact: false,
        parserPlugins: ["typescript", "jsx"],
      });
    });

    return instrumenterPromise;
  };

  return {
    name: "nyc-instrumentation",
    enforce: "post",
    async transform(code, id, _options) {
      void _options;

      if (!SHOULD_INSTRUMENT_WITH_NYC) {
        return null;
      }

      const [filename] = id.split("?");
      if (
        filename == null ||
        !filename.includes("/src/") ||
        !/\.(ts|tsx)$/.test(filename) ||
        /\.test\./.test(filename)
      ) {
        return null;
      }

      const instrumenter = await loadInstrumenter();
      const sourceMap = this.getCombinedSourcemap();
      const instrumentedCode = instrumenter.instrumentSync(
        code,
        filename,
        sourceMap && Object.keys(sourceMap).length > 0 ? sourceMap : undefined,
      );

      const instrumentedResult = {
        code: instrumentedCode,
        map: instrumenter.lastSourceMap(),
      } as unknown as never;

      return instrumentedResult;
    },
  };
}
