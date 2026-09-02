export const OFFICE_SECTIONS = [
  {
    key: "team",
    label: "Mi equipo",
    shortLabel: "Equipo",
    icon: "⌂",
    room: "Oficina del mánager",
    image: "/offices/team.webp",
    monitor: {
      left: "20.8%",
      top: "10.0%",
      width: "53.2%",
      height: "67.0%",
      rotate: "-0.10deg",
    },
  },
  {
    key: "market",
    label: "Mercado",
    shortLabel: "Mercado",
    icon: "◇",
    room: "Dirección de fichajes",
    image: "/offices/market.webp",
    monitor: {
      left: "19.3%",
      top: "9.0%",
      width: "55.3%",
      height: "68.5%",
      rotate: "-0.25deg",
    },
  },
  {
    key: "moves",
    label: "Movimientos",
    shortLabel: "Movimientos",
    icon: "⇄",
    room: "Administración deportiva",
    image: "/offices/moves.webp",
    monitor: {
      left: "21.0%",
      top: "9.5%",
      width: "53.8%",
      height: "68.0%",
      rotate: "-0.16deg",
    },
  },
  {
    key: "xi",
    label: "Mejor XI",
    shortLabel: "Mejor XI",
    icon: "▣",
    room: "Sala táctica",
    image: "/offices/xi.webp",
    monitor: {
      left: "20.4%",
      top: "9.5%",
      width: "54.4%",
      height: "68.7%",
      rotate: "-0.12deg",
    },
  },
  {
    key: "rivals",
    label: "Rivales",
    shortLabel: "Rivales",
    icon: "◌",
    room: "Centro de scouting",
    image: "/offices/rivals.webp",
    monitor: {
      left: "20.8%",
      top: "8.7%",
      width: "55.4%",
      height: "69.7%",
      rotate: "-0.10deg",
    },
  },
  {
    key: "protection",
    label: "Protección",
    shortLabel: "Protección",
    icon: "♢",
    room: "Centro tecnológico",
    image: "/offices/protection.webp",
    monitor: {
      left: "20.2%",
      top: "9.2%",
      width: "55.1%",
      height: "69.2%",
      rotate: "-0.12deg",
    },
  },
];

export function getOfficeSection(key) {
  return (
    OFFICE_SECTIONS.find(
      (item) =>
        item.key === key
    ) ||
    OFFICE_SECTIONS[0]
  );
}
