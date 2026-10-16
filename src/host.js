/**
 * Host half of the Smooth bundle.
 *
 * It contributes exactly one thing: the launch animation's rows for the served
 * index. Cordis surfaces the web server's `webserver/index-inject` event without
 * an `inject` entry, and the listener is disposed with the plugin, so this half
 * still reads no service, holds no state and touches no file. Painting the
 * opening from the index is what makes it cover the interval before any bundle
 * runs — a browser-side layer can only appear after the shell already did.
 *
 * Cordis decides a plugin's shape in `registry.resolve()`:
 *   1. a function is used as the callback directly — `name`, `inject` and `Config`
 *      then have to be own properties of that function, and `Function.prototype.name`
 *      is read-only, so a mirror cannot be attached reliably; or
 *   2. an object with an `apply` method contributes its `apply` as the callback
 *      while `name`, `inject` and `Config` are read off the object.
 * Shape 2 is the one that keeps all three readable, so this module exports a single
 * plugin object as its default export. `unwrapExports` collapses the namespace to
 * that default, which is what makes the metadata visible.
 */
export function apply(ctx) {
  ctx.on('webserver/index-inject', (table) => {
    table.push(...bootInjections());
  });
}

/** No `Config`: cordis reads `Config["~standard"].validate`, which a plain object lacks. */
const plugin = { name: PLUGIN_ID, inject: [], apply };

export default plugin;
export { plugin };
