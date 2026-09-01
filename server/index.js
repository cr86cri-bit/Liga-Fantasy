import "dotenv/config";

import cors from "cors";
import express from "express";

import {
  BiwengerClient,
} from "./biwenger.js";

import {
  SofaScoreClient,
} from "./sofascore/SofaScoreClient.js";

const app = express();

const PORT =
  Number(process.env.PORT || 3001);

const sofaScoreClient =
  new SofaScoreClient();

app.use(cors());
app.use(express.json());

let client = null;

function getClient() {
  if (!client) {
    client = new BiwengerClient({
      token:
        process.env.BIWENGER_TOKEN,
      version:
        process.env.BIWENGER_VERSION ||
        "",
      leagueName:
        process.env.BIWENGER_LEAGUE_NAME ||
        "",
      score:
        process.env.BIWENGER_SCORE ||
        "1",
    });
  }

  return client;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Liga Fantasy",
    time: new Date().toISOString(),
  });
});

app.get("/api/connection", async (_req, res) => {
  try {
    const biwenger = getClient();
    await biwenger.inicializar();

    res.json({
      ok: true,
      data: {
        leagueId: biwenger.leagueId,
        userId: biwenger.userId,
        leagueName: biwenger.league?.name,
        score: biwenger.score,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message:
        error?.message ||
        "No se pudo conectar con Biwenger.",
    });
  }
});

app.get(
  "/api/sofascore/player",
  async (req, res) => {
    try {
      const name =
        String(
          req.query?.name || ""
        ).trim();

      const team =
        String(
          req.query?.team || ""
        ).trim();

      if (!name) {
        return res
          .status(400)
          .json({
            ok: false,
            message:
              "Debes enviar el nombre del jugador.",
          });
      }

      const data =
        await sofaScoreClient
          .buscarJugador({
            name,
            team,
          });

      return res.json({
        ok: true,
        data,
      });
    } catch (error) {
      console.error(
        "[SofaScore]",
        error
      );

      return res
        .status(502)
        .json({
          ok: false,
          message:
            error?.message ||
            "No se pudo resolver el perfil de SofaScore.",
        });
    }
  }
);


app.post(
  "/api/actions/bid",
  async (req, res) => {
    try {
      if (
        req.body?.confirm !==
        true
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            message:
              "La puja requiere confirmación explícita.",
          });
      }

      const data =
        await getClient()
          .pujarJugador({
            playerId:
              Number(
                req.body
                  ?.playerId
              ),

            amount:
              Number(
                req.body
                  ?.amount
              ),
          });

      return res.json({
        ok: true,

        message:
          "Puja enviada a Biwenger.",

        data,
      });
    } catch (error) {
      console.error(
        "[Biwenger bid]",
        error
      );

      return res
        .status(400)
        .json({
          ok: false,

          message:
            error?.message ||
            "No se pudo realizar la puja.",
        });
    }
  }
);

app.post(
  "/api/actions/sell",
  async (req, res) => {
    try {
      if (
        req.body?.confirm !==
        true
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            message:
              "La venta requiere confirmación explícita.",
          });
      }

      const data =
        await getClient()
          .ponerJugadorVenta({
            playerId:
              Number(
                req.body
                  ?.playerId
              ),

            price:
              Number(
                req.body
                  ?.price
              ),

            rejectOffers:
              Boolean(
                req.body
                  ?.rejectOffers
              ),
          });

      return res.json({
        ok: true,

        message:
          "Jugador enviado al mercado de Biwenger.",

        data,
      });
    } catch (error) {
      console.error(
        "[Biwenger sell]",
        error
      );

      return res
        .status(400)
        .json({
          ok: false,

          message:
            error?.message ||
            "No se pudo poner el jugador a la venta.",
        });
    }
  }
);

app.get("/api/dashboard", async (_req, res) => {
  try {
    const data =
      await getClient().obtenerDashboard();

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
        "No se pudo cargar el dashboard.",
    });
  }
});

app.post("/api/reconnect", async (_req, res) => {
  try {
    client = null;

    const data =
      await getClient().obtenerDashboard();

    res.json({
      ok: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message:
        error?.message ||
        "No se pudo reconectar.",
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("⚽ Liga Fantasy");
  console.log(
    `API: http://localhost:${PORT}`
  );
  console.log("");
});
