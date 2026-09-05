"use client";

import { useState } from "react";
import Image from "next/image";
import type { LineupPlayer, Match, MatchEvent, Team, TeamLineup } from "@/lib/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { cx } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/image-hosts";

type Side = "home" | "away";
type Row = { row: number; players: LineupPlayer[] };

/** المصدر الأول: إحداثيات `grid` الحقيقية من API-Football (صف:عمود). */
function groupByGrid(players: LineupPlayer[]): Row[] {
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    if (!p.grid) continue;
    const row = Number(p.grid.split(":")[0]);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(p);
  }
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, list]) => ({
      row,
      players: [...list].sort((a, b) => Number(a.grid!.split(":")[1]) - Number(b.grid!.split(":")[1])),
    }));
}

/** بديل ذكي عند غياب `grid`: تجميع حسب مركز اللاعب المعروف فعلياً (حارس/دفاع/
 * وسط/هجوم) بدل وضع الجميع في المنتصف — لا يزال توزيعاً حقيقياً مبنياً على
 * بيانات اللاعب، وليس ترتيباً عشوائياً. */
function groupByPosition(players: LineupPlayer[]): Row[] {
  const rowForCode: Record<string, number> = { G: 1, D: 2, M: 3, F: 4 };
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const code = p.position?.trim().charAt(0).toUpperCase() ?? "";
    const row = rowForCode[code];
    if (!row) continue; // مركز غير معروف — لا نخمّن مكانه
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(p);
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([row, list]) => ({ row, players: list }));
}

function resolveRows(players: LineupPlayer[]): Row[] {
  const byGrid = groupByGrid(players);
  return byGrid.length > 0 ? byGrid : groupByPosition(players);
}

/** توزيع أفقي متساوٍ عبر كامل عرض الملعب — لا تكديس في المنتصف. */
function xPercent(index: number, count: number): number {
  if (count <= 1) return 50;
  const margin = 9;
  return margin + (index / (count - 1)) * (100 - 2 * margin);
}

function positionLabel(pos: string, t: ReturnType<typeof useLocale>["t"]): string {
  const code = pos.charAt(0).toUpperCase();
  if (code === "G") return t.match.posGoalkeeper;
  if (code === "D") return t.match.posDefender;
  if (code === "M") return t.match.posMidfielder;
  if (code === "F") return t.match.posForward;
  return pos || t.common.notAvailable;
}

function playerEvents(events: MatchEvent[], teamId: string, name: string) {
  const goals = events.filter((e) => e.type === "GOAL" && e.teamId === teamId && e.playerName === name).length;
  const assists = events.filter((e) => e.teamId === teamId && e.assistName === name).length;
  const yellow = events.filter((e) => e.type === "YELLOW_CARD" && e.teamId === teamId && e.playerName === name).length;
  const red = events.filter((e) => e.type === "RED_CARD" && e.teamId === teamId && e.playerName === name).length;
  const subbedOff = events.some((e) => e.type === "SUBSTITUTION" && e.teamId === teamId && e.playerName === name);
  return { goals, assists, yellow, red, subbedOff };
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length <= 1 ? name : parts[parts.length - 1];
}

function PlayerToken({
  player,
  teamId,
  side,
  events,
  onSelect,
}: {
  player: LineupPlayer;
  teamId: string;
  side: Side;
  events: MatchEvent[];
  onSelect: (p: LineupPlayer) => void;
}) {
  const stats = playerEvents(events, teamId, player.name);

  return (
    <button
      onClick={() => onSelect(player)}
      className="group flex flex-col items-center gap-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-full"
    >
      <span
        className={cx(
          "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-extrabold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.4)] tabular overflow-hidden transition-colors",
          side === "home"
            ? "bg-surface border-2 border-white/80 group-hover:border-white"
            : "bg-surface border-2 border-primary group-hover:border-primary-ink"
        )}
      >
        {player.photoUrl && isAllowedImageHost(player.photoUrl) ? (
          <Image src={player.photoUrl} alt="" fill sizes="36px" className="object-cover" />
        ) : (
          player.number
        )}
        {stats.goals > 0 && (
          <span className="absolute -top-1 -end-1 text-[9px] leading-none" aria-hidden>
            ⚽
          </span>
        )}
        {(stats.yellow > 0 || stats.red > 0) && (
          <span
            className={cx(
              "absolute -bottom-0.5 -end-0.5 h-1.5 w-1 rounded-[1px]",
              stats.red > 0 ? "bg-error" : "bg-warning"
            )}
            aria-hidden
          />
        )}
        {stats.subbedOff && (
          <span className="absolute -top-1 -start-1 text-[9px] leading-none" aria-hidden>
            🔄
          </span>
        )}
      </span>
      <span
        className="max-w-[54px] sm:max-w-[68px] truncate text-[9px] sm:text-[10px] font-bold text-white/90 text-center leading-tight"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
      >
        {shortName(player.name)}
      </span>
    </button>
  );
}

export function FormationPitch({ match }: { match: Match }) {
  const [selected, setSelected] = useState<{ player: LineupPlayer; side: Side } | null>(null);

  if (!match.lineups) return null;
  const { home, away } = match.lineups;

  const homeRows = resolveRows(home.startXI);
  const awayRows = resolveRows(away.startXI);
  const hasRowData = homeRows.length > 0 && awayRows.length > 0;

  if (!hasRowData) {
    return <FallbackLineupList match={match} />;
  }

  const homeMaxRow = Math.max(...homeRows.map((r) => r.row));
  const awayMaxRow = Math.max(...awayRows.map((r) => r.row));

  function rowY(row: number, maxRow: number, side: Side): number {
    // نصف الملعب لكل فريق: حارس المرمى قرب حافة نصفه، والهجوم قرب خط المنتصف.
    const t0 = maxRow <= 1 ? 0 : (row - 1) / (maxRow - 1);
    return side === "home" ? 91 - t0 * 40 : 9 + t0 * 40;
  }

  function selectPlayer(player: LineupPlayer, side: Side) {
    setSelected({ player, side });
  }

  return (
    <div className="space-y-3">
      {/* شعار الفريق البعيد (الظاهر في النصف العلوي) مباشرة أعلى نصفه */}
      <FormationMeta team={match.awayTeam} lineup={away} side="away" />

      <div
        className="relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-border"
        style={{
          aspectRatio: "5 / 7",
          background: "repeating-linear-gradient(0deg, #163a24 0px, #163a24 32px, #123420 32px, #123420 64px)",
        }}
      >
        {/* شريط هوية علوي (الفريق الضيف) وسفلي (الفريق المضيف) */}
        <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/50" />

        {/* خط المنتصف والدائرة المركزية */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
        {/* مناطق الجزاء وأقواس الأركان */}
        <div className="absolute left-1/2 top-0 h-[13%] w-[50%] -translate-x-1/2 border-x border-b border-white/20" />
        <div className="absolute left-1/2 top-0 h-[6%] w-[26%] -translate-x-1/2 border-x border-b border-white/20" />
        <div className="absolute left-1/2 bottom-0 h-[13%] w-[50%] -translate-x-1/2 border-x border-t border-white/20" />
        <div className="absolute left-1/2 bottom-0 h-[6%] w-[26%] -translate-x-1/2 border-x border-t border-white/20" />

        {awayRows.map(({ row, players }) => (
          <div key={`away-${row}`} className="absolute inset-x-0" style={{ top: `${rowY(row, awayMaxRow, "away")}%` }}>
            {players.map((p, i) => (
              <div
                key={p.number}
                className="absolute"
                style={{ left: `${xPercent(i, players.length)}%`, transform: "translate(-50%, -50%)" }}
              >
                <PlayerToken player={p} teamId={match.awayTeam.id} side="away" events={match.events} onSelect={(pl) => selectPlayer(pl, "away")} />
              </div>
            ))}
          </div>
        ))}

        {homeRows.map(({ row, players }) => (
          <div key={`home-${row}`} className="absolute inset-x-0" style={{ top: `${rowY(row, homeMaxRow, "home")}%` }}>
            {players.map((p, i) => (
              <div
                key={p.number}
                className="absolute"
                style={{ left: `${xPercent(i, players.length)}%`, transform: "translate(-50%, -50%)" }}
              >
                <PlayerToken player={p} teamId={match.homeTeam.id} side="home" events={match.events} onSelect={(pl) => selectPlayer(pl, "home")} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* شعار الفريق المضيف (الظاهر في النصف السفلي) مباشرة أسفل نصفه */}
      <FormationMeta team={match.homeTeam} lineup={home} side="home" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <BenchList title={match.homeTeam.shortName} lineup={home} teamId={match.homeTeam.id} events={match.events} onSelect={(p) => selectPlayer(p, "home")} />
        <BenchList title={match.awayTeam.shortName} lineup={away} teamId={match.awayTeam.id} events={match.events} onSelect={(p) => selectPlayer(p, "away")} />
      </div>

      {selected && (
        <PlayerCard
          player={selected.player}
          team={selected.side === "home" ? match.homeTeam : match.awayTeam}
          events={match.events}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function FormationMeta({ team, lineup, side }: { team: Team; lineup: TeamLineup; side: Side }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2 min-w-0 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2">
      <span
        className={cx("h-2 w-2 rounded-full shrink-0", side === "home" ? "bg-white/80" : "bg-primary")}
        aria-hidden
      />
      <TeamLogo team={team} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold truncate">{team.name}</p>
      </div>
      <p className="text-muted-dim tabular font-bold shrink-0" dir="ltr">
        {lineup.formation ?? t.common.notAvailable}
      </p>
    </div>
  );
}

function BenchList({
  title,
  lineup,
  teamId,
  events,
  onSelect,
}: {
  title: string;
  lineup: TeamLineup;
  teamId: string;
  events: MatchEvent[];
  onSelect: (p: LineupPlayer) => void;
}) {
  const { t } = useLocale();
  if (lineup.substitutes.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
      <h5 className="text-xs font-extrabold text-muted-dim mb-3">
        {title} · {t.match.substitutes}
      </h5>
      <ul className="space-y-2">
        {lineup.substitutes.map((p) => {
          const stats = playerEvents(events, teamId, p.name);
          return (
            <li key={p.number}>
              <button
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-2.5 text-sm rounded-[var(--radius-sm)] hover:bg-surface-2 px-1.5 py-1 -mx-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold tabular shrink-0">
                  {p.number}
                </span>
                <span className="min-w-0 flex-1 text-start">
                  <span className="font-bold truncate block">{p.name}</span>
                  <span className="text-xs text-muted-dim">{positionLabel(p.position, t)}</span>
                </span>
                {stats.goals > 0 && <span aria-hidden>⚽</span>}
                {stats.yellow > 0 && <span aria-hidden>🟨</span>}
                {stats.red > 0 && <span aria-hidden>🟥</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {lineup.coach && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2.5">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-xs shrink-0" aria-hidden>
            🧑‍💼
          </span>
          <p className="text-xs text-muted-dim">
            {t.match.coach}: <span className="font-bold text-ink">{lineup.coach}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  team,
  events,
  onClose,
}: {
  player: LineupPlayer;
  team: Team;
  events: MatchEvent[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  const stats = playerEvents(events, team.id, player.name);
  const hasStats = stats.goals || stats.assists || stats.yellow || stats.red;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xs rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] bg-surface border border-border p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 border border-border text-sm font-extrabold tabular shrink-0">
            {player.number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold truncate">{player.name}</p>
            <p className="text-xs text-muted-dim">{positionLabel(player.position, t)}</p>
          </div>
          <TeamLogo team={team} size="sm" />
        </div>

        {hasStats ? (
          <div className="space-y-1.5 text-sm">
            <p className="text-xs font-extrabold text-muted-dim mb-1.5">{t.match.playerCardStats}</p>
            {stats.goals > 0 && <StatRow label={t.match.playerGoals} value={stats.goals} />}
            {stats.assists > 0 && <StatRow label={t.match.playerAssists} value={stats.assists} />}
            {stats.yellow > 0 && <StatRow label={t.match.playerYellow} value={stats.yellow} />}
            {stats.red > 0 && <StatRow label={t.match.playerRed} value={stats.red} />}
            {stats.subbedOff && <p className="text-xs text-muted-dim">{t.match.substitutedOff}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-dim">{t.match.noPlayerStats}</p>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full h-10 rounded-[var(--radius-sm)] border border-border text-muted font-bold hover:text-ink hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-extrabold tabular">{value}</span>
    </div>
  );
}

function FallbackLineupList({ match }: { match: Match }) {
  const { t } = useLocale();
  if (!match.lineups) return null;
  const { home, away } = match.lineups;

  return (
    <div className="grid grid-cols-2 gap-6">
      {[
        { team: match.homeTeam, lineup: home },
        { team: match.awayTeam, lineup: away },
      ].map(({ team, lineup }) => (
        <div key={team.id}>
          <h4 className="text-sm font-extrabold mb-3">{team.name}</h4>
          <ul className="space-y-2">
            {lineup.startXI.map((p) => (
              <li key={p.number} className="flex items-center gap-2.5 text-sm">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold tabular shrink-0">
                  {p.number}
                </span>
                <div className="min-w-0">
                  <p className="font-bold truncate">{p.name}</p>
                  <p className="text-xs text-muted-dim">{positionLabel(p.position, t)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
