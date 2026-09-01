import "dotenv/config";

import express from "express";

import cors from "cors";

import {
  BiwengerClient,
} from "./biwenger.js";

const app = express();

const PORT = Number(
  process.env.PORT || 3001
);

app.use(cors());

app.use(express.json());

let client = null;

/*
|--------------------------------------------------------------------------
| CLIENTE
|--------------------------------------------------------------------------
*/

function obtenerCliente() {
  if (!client) {
    client =
      new BiwengerClient({
        token:
          process.env
            .BIWENGER_TOKEN,

        version:
          process.env
            .BIWENGER_VERSION ||
          "",

        leagueName:
          process.env
            .BIWENGER_LEAGUE_NAME ||
          "",

        score:
          process.env
            .BIWENGER_SCORE ||
          "5",
      });
  }

  return client;
}

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",

  (_req, res) => {
    res.json({
      ok: true,

      service:
        "Liga Fantasy API",

      time:
        new Date().toISOString(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| CONEXIÓN
|--------------------------------------------------------------------------
*/

app.get(
  "/api/connection",

  async (_req, res) => {
    try {
      const biwenger =
        obtenerCliente();

      await biwenger.inicializar();

      res.json({
        ok: true,

        data: {
          authenticated: true,

          leagueId:
            biwenger.leagueId,

          userId:
            biwenger.userId,

          league:
            biwenger.league
              ?.name,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        ok: false,

        message:
          error?.message ||
          "No se pudo conectar.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

app.get(
  "/api/dashboard",

  async (_req, res) => {
    try {
      const data =
        await obtenerCliente()
          .obtenerDashboard();

      res.json({
        ok: true,

        data,
      });
    } catch (error) {
      console.error(
        "BIWENGER ERROR:"
      );

      console.error(error);

      res.status(500).json({
        ok: false,

        message:
          error?.message ||
          "Error conectando con Biwenger.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| RECONECTAR
|--------------------------------------------------------------------------
*/

app.post(
  "/api/reconnect",

  async (_req, res) => {
    try {
      /*
       * Eliminamos el cliente
       * para volver a detectar cuenta.
       */

      client = null;

      const data =
        await obtenerCliente()
          .obtenerDashboard();

      res.json({
        ok: true,

        data,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        ok: false,

        message:
          error?.message ||
          "No se pudo reconectar.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,

  () => {
    console.log("");

    console.log(
      "⚽ Liga Fantasy"
    );

    console.log(
      `API: http://localhost:${PORT}`
    );

    console.log(
      "Autenticación: Token Biwenger"
    );

    console.log("");
  }
);