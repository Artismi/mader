/* eslint-disable */
/* base minima al posto di Fabric: i filtri qui servono solo come shader */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const filters = { BaseFilter: class<T = any> { declare _t?: T; [k: string]: any; applyTo(..._a: any[]): any {} } }
export const classRegistry = { setClass: (..._a: unknown[]) => {} }
