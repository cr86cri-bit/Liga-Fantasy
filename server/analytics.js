/*
 * Puente de compatibilidad.
 *
 * Los imports antiguos:
 *   import { analizarJugador } from "./analytics.js";
 *
 * siguen funcionando aunque la lógica real
 * esté separada dentro de server/analytics/.
 */
export * from "./analytics/index.js";
