// REMOVED — superseded by ./inkOutline.ts.
//
// This file used to define a second, unrelated "Outline" effect (ink-trace
// edge detection) that collided with object/outline.ts: same label AND same
// auto-derived id ("outline" comes from the file name), so one silently
// shadowed the other everywhere (menus, commands, saved settings, layer
// effects). The effect now lives in inkOutline.ts under the distinct
// id/label "Ink Outline". The registry skips files without a default export,
// so this stub is inert and can be deleted outright.
export {};
