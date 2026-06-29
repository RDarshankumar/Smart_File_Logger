/**
 * @file src/writer/index.ts
 * @description Barrel export for the writer module.
 */

export { FileWriter, WriteQueue, buildInitialState, needsWeekRotation, needsDaySeparator } from './file.writer.js';
export type { WriteParams } from './file.writer.js';
