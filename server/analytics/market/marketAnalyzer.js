import { round2 } from "../utils/number.js";
import { estimarCompetidores } from "../rivals/rivalThreat.js";
import { calcularPujaMaxima } from "./bidCalculator.js";
import {
  etiquetaCompetencia,
  etiquetaPrecio,
} from "./priceAnalyzer.js";

export function enriquecerMercado(
  marketPlayers,
  rivals,
  finances
) {
  return (marketPlayers || []).map((player) => {
    const price = Number(player.price || 0);
    const salePrice = Number(player.salePrice || price);

    const listingRatio =
      price > 0 ? salePrice / price : 1;

    const priceTag =
      etiquetaPrecio(listingRatio);

    const pointsPerMillion =
      price > 0
        ? Number(player.points || 0) /
          (price / 1_000_000)
        : 0;

    const competitors =
      estimarCompetidores(
        player,
        rivals,
        salePrice
      );

    const competitionScore =
      competitors.length
        ? Math.round(
            competitors
              .slice(0, 3)
              .reduce(
                (total, competitor) =>
                  total + competitor.threatScore,
                0
              ) /
              Math.min(3, competitors.length)
          )
        : 15;

    const recommendedMaxBid =
      calcularPujaMaxima(player, {
        salePrice,
        competitionScore,
        maximumBid:
          Number(finances?.maximumBid || 0),
      });

    return {
      ...player,
      marketIntelligence: {
        listedPrice: salePrice,
        marketValue: price,
        priceDifference: salePrice - price,
        priceDifferencePercent: round2(
          (listingRatio - 1) * 100
        ),
        priceTag,
        pointsPerMillion: round2(pointsPerMillion),
        recommendedMaxBid,
        shouldBid:
          recommendedMaxBid >= salePrice &&
          player.status !== "discarded",
        competitionScore,
        competitionLabel:
          etiquetaCompetencia(competitionScore),
        competitors: competitors.slice(0, 3),
      },
    };
  });
}
