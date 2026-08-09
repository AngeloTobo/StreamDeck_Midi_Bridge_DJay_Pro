import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.angelocreates.midibridge.sdPlugin";

/**
 * @julusian/midi is a native (.node) addon and cannot be bundled. It's marked
 * external and installed INTO the .sdPlugin folder (package.json postinstall) so
 * its prebuilt binary ships alongside bin/plugin.js and resolves at runtime.
 */
export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    format: "es",
    sourcemap: true,
    sourcemapPathTransform: (relativeSourcePath) => relativeSourcePath,
  },
  external: ["@julusian/midi"],
  plugins: [
    typescript({ tsconfig: "./tsconfig.json" }),
    nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
    commonjs(),
  ],
};
