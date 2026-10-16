/**
 * Host half of the Smooth bundle.
 *
 * It deliberately touches no service and no `ctx` member at all. Cordis throws on
 * `ctx.<name>` for any name missing from `inject`, and this half has nothing to ask
 * the host for: the Client module owns both the rendering and the persisted state.
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
export function apply() {}

/** No `Config`: cordis reads `Config["~standard"].validate`, which a plain object lacks. */
const plugin = { name: PLUGIN_ID, inject: [], apply };

export default plugin;
export { plugin };
