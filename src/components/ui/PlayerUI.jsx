import { useEffect, useMemo, useState } from "react";
import { formatCountdown, formatDate, statusConfig } from "../../utils/app.js";

function Position({ position }) {
  return (
    <span
      className={`position position-${String(position).toLowerCase()}`}
    >
      {position}
    </span>
  );
}

function Recommendation({ value }) {
  if (!value) return null;

  return (
    <span
      className={`recommendation recommendation-${String(value).toLowerCase()}`}
    >
      {value}
    </span>
  );
}

function PlayerPhoto({ player, size = "normal" }) {
  const [failed, setFailed] = useState(false);

  if (failed || !player?.photoUrl) {
    return (
      <div
        className={`player-photo player-photo-${size} player-photo-fallback`}
      >
        {player?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      className={`player-photo player-photo-${size}`}
      src={player.photoUrl}
      alt={player.name || "Jugador"}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function teamInitials(
  name
) {
  const parts =
    String(
      name ||
      "?"
    )
      .trim()
      .split(
        /\s+/
      )
      .filter(Boolean);

  if (
    !parts.length
  ) {
    return "?";
  }

  return parts
    .slice(
      0,
      2
    )
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}

function TeamCrest({
  player,
  size = "small",
}) {
  const candidates =
    useMemo(
      () =>
        [
          player?.teamIconUrl,

          player?.teamId
            ? `https://cdn.biwenger.com/i/t/${player.teamId}.png`
            : "",
        ].filter(
          (
            value,
            index,
            array
          ) =>
            value &&
            array.indexOf(
              value
            ) ===
              index
        ),
      [
        player?.teamIconUrl,
        player?.teamId,
      ]
    );

  const [
    candidateIndex,
    setCandidateIndex,
  ] =
    useState(
      0
    );

  useEffect(
    () => {
      setCandidateIndex(
        0
      );
    },
    [
      player?.teamId,
      player?.teamIconUrl,
    ]
  );

  const src =
    candidates[
      candidateIndex
    ];

  if (!src) {
    return (
      <span
        className={`team-crest team-crest-${size} team-crest-fallback`}
        aria-label={
          player?.teamName ||
          "Club"
        }
      >
        {teamInitials(
          player?.teamName
        )}
      </span>
    );
  }

  return (
    <img
      className={`team-crest team-crest-${size}`}
      src={
        src
      }
      alt={
        player?.teamName
          ? `Escudo de ${player.teamName}`
          : "Escudo del club"
      }
      loading="lazy"
      onError={() =>
        setCandidateIndex(
          (
            current
          ) =>
            current +
            1
        )
      }
    />
  );
}

function ClubIdentity({
  player,
  compact = false,
}) {
  return (
    <span
      className={`club-identity ${
        compact
          ? "club-identity-compact"
          : ""
      }`}
    >
      <TeamCrest
        player={
          player
        }
        size={
          compact
            ? "tiny"
            : "small"
        }
      />

      <span>
        {player?.teamName ||
          "Sin club"}
      </span>
    </span>
  );
}

function Status({ status, compact = false }) {
  const [dot, label, className] = statusConfig(status);

  return (
    <span
      className={`status ${className} ${compact ? "status-compact" : ""}`}
    >
      <span>{dot}</span>
      {!compact && label}
    </span>
  );
}

function Fitness({ values = [] }) {
  return (
    <div className="fitness">
      {[values[0], values[1], values[2]].map((value, index) => (
        <FitnessItem value={value} key={index} />
      ))}
    </div>
  );
}

function FitnessItem({ value }) {
  if (typeof value === "number") {
    const type =
      value >= 10
        ? "great"
        : value >= 6
          ? "good"
          : value < 0
            ? "bad"
            : "normal";

    return <span className={`fitness-item ${type}`}>{value}</span>;
  }

  const config =
    {
      injured: ["LES", "bad"],
      doubt: ["DUD", "warning"],
      sanctioned: ["SAN", "bad"],
      discarded: ["DES", "bad"],
    }[value] || ["-", "empty"];

  return (
    <span className={`fitness-item ${config[1]}`}>{config[0]}</span>
  );
}

function AnalysisScore({ analysis, compact = false }) {
  const score = Number(analysis?.score || 0);

  const level =
    score >= 70
      ? "great"
      : score >= 55
        ? "good"
        : score >= 35
          ? "medium"
          : "bad";

  if (compact) {
    return (
      <div className={`score-pill score-pill-${level}`}>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    );
  }

  return (
    <div className="analysis-score">
      <div className="score-header">
        <span>Nota Fantasy</span>
        <strong>
          {score}<small>/100</small>
        </strong>
      </div>

      <div className="score-track">
        <div
          className={`score-bar ${level}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function Countdown({ target, now, label = "Finaliza en" }) {
  const countdown = formatCountdown(target, now);

  return (
    <div className={`countdown countdown-${countdown.urgency}`}>
      <span>{countdown.expired ? "Estado" : label}</span>
      <strong>{countdown.text}</strong>
    </div>
  );
}

function Fixture({ match }) {
  if (!match) {
    return (
      <div className="fixture fixture-empty">
        Sin próximo partido disponible
      </div>
    );
  }

  return (
    <div className="fixture">
      <div className="fixture-main">
        <span className="eyebrow">{match.roundName}</span>
        <strong>
          {match.venue === "LOCAL" ? "vs" : "@"} {match.opponent?.name}
        </strong>
        <small>
          {match.venue} · {formatDate(match.date)}
        </small>
      </div>

      <div className="fixture-difficulty">
        <span>{"★".repeat(match.difficulty?.stars || 3)}</span>
        <strong>{match.difficulty?.label}</strong>
      </div>
    </div>
  );
}

function Metric({ label, value, description }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function DetailButton({ onClick, label = "Ver detalles" }) {
  return (
    <button className="detail-button" onClick={onClick}>
      {label}<span>›</span>
    </button>
  );
}

let modalScrollLockCount = 0;
let modalOriginalBodyOverflow = "";
let modalOriginalHtmlOverflow = "";
let modalOriginalBodyPaddingRight = "";

function lockPageScroll() {
  if (typeof document === "undefined") return;

  if (modalScrollLockCount === 0) {
    modalOriginalBodyOverflow = document.body.style.overflow;
    modalOriginalHtmlOverflow = document.documentElement.style.overflow;
    modalOriginalBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      const currentPadding =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight
        ) || 0;

      document.body.style.paddingRight =
        `${currentPadding + scrollbarWidth}px`;
    }
  }

  modalScrollLockCount += 1;
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

function unlockPageScroll() {
  if (typeof document === "undefined") return;

  modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);

  if (modalScrollLockCount !== 0) return;

  document.body.style.overflow = modalOriginalBodyOverflow;
  document.documentElement.style.overflow = modalOriginalHtmlOverflow;
  document.body.style.paddingRight = modalOriginalBodyPaddingRight;
}

function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;

    lockPageScroll();

    return () => {
      unlockPageScroll();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-panel ${wide ? "modal-panel-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <div>
            <span className="section-label">DETALLE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function DetailMetric({ label, value, className = "" }) {
  return (
    <div className="detail-metric">
      <span>{label}</span>
      <strong className={className}>{value}</strong>
    </div>
  );
}

function Breakdown({ label, value }) {
  const safeValue = Number(value || 0);

  return (
    <div className="breakdown-item">
      <div>
        <span>{label}</span>
        <strong>{safeValue}</strong>
      </div>

      <div className="mini-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function SellerBadge({ player }) {
  const isMarket = player?.sellerType === "market";

  return (
    <div className={`seller-badge ${isMarket ? "seller-market" : "seller-user"}`}>
      <span>{isMarket ? "🏪" : "👤"}</span>
      <div>
        <small>Ofrece</small>
        <strong>{player?.ownerName || "Mercado Biwenger"}</strong>
      </div>
    </div>
  );
}


export {
  Position, Recommendation, PlayerPhoto, TeamCrest, ClubIdentity, Status, Fitness, FitnessItem, AnalysisScore, Countdown, Fixture, Metric, DetailButton, Modal, DetailMetric, Breakdown, SellerBadge,
};
