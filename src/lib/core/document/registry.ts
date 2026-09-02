// Layer: core (framework-free). Shared document registry singleton.
// Exporting an instance here (rather than only a class) keeps the wiring of
// services / renderer / state simple without Svelte in the loop.

import { DocumentRegistry } from './DocumentRegistry';

export { RegistryEvents } from './DocumentRegistry';

/** The one and only registry for this app instance. */
export const documentRegistry = new DocumentRegistry();
