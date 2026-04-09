import { useState, useEffect, useRef } from "react";
import { THEMES, DAYS, getDays, getFirst, fmtDate, fmtMonth } from "./MonthTheme";
import "./calendar.css";

function loadLS(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ─── Ring ──────────────────────────────────────────────────── */
function Ring() {
  return <div className="ring"><div className="ring-hole" /></div>;
}

/* ─── Hero Banner ───────────────────────────────────────────── */
function HeroBanner({ t, year, isDark, onPrev, onNext, disabled }) {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState(t.img);
  const prevImg = useRef(t.img);

  useEffect(() => {
    if (prevImg.current === t.img) return;
    setLoaded(false);
    const img = new Image();
    img.onload = () => { setSrc(t.img); setLoaded(true); prevImg.current = t.img; };
    img.src = t.img;
  }, [t.img]);

  useEffect(() => {
    setLoaded(false);
    const i = new Image();
    i.onload = () => setLoaded(true);
    i.src = t.img;
  }, []);

  return (
    <div className="hero">
      <img src={src} alt={t.m} className={`hero-img${loaded ? " loaded" : " loading"}`} onLoad={() => setLoaded(true)} />
      <div className="hero-gradient" style={{ background: isDark ? t.grad : t.lgrad }} />
      <div className="hero-accent-bar" style={{ background: `linear-gradient(to right,transparent,${t.a},transparent)` }} />
      <div className="hero-content">
        <div className="month-display">
          <div className="month-num">{t.n}</div>
          <div className="month-name">
            <span style={{ color: t.a }}>{t.m.slice(0, 3)}</span>{t.m.slice(3)}
          </div>
          <div className="month-year">{year}</div>
        </div>
        <div className="hero-nav">
          {/* ✅ FIX 3: nav-btn uses CSS variables that work in both modes */}
          <button className="nav-btn" onClick={onPrev} disabled={disabled}
            style={{ "--btn-accent": t.a, "--btn-glow": t.gw }}>‹</button>
          <button className="nav-btn" onClick={onNext} disabled={disabled}
            style={{ "--btn-accent": t.a, "--btn-glow": t.gw }}>›</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Date Cell ─────────────────────────────────────────────── */
function DateCell({ day, state, accent, glow, accentDim, hasNote, onClick, onEnter, onLeave }) {
  const ref = useRef();

  function handleClick(e) {
    if (!day) return;
    // ripple
    const el = ref.current;
    const rip = document.createElement("span");
    rip.className = "ripple-el";
    const rc = el.getBoundingClientRect();
    const sz = Math.max(rc.width, rc.height) * 2;
    rip.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - rc.left - sz / 2}px;top:${e.clientY - rc.top - sz / 2}px;background:${accent};opacity:0.28`;
    el.appendChild(rip);
    setTimeout(() => rip.remove(), 500);
    onClick(day);
  }

  if (!day) return <div className="dcell dcell-empty" />;

  const cls = ["dcell",
    state === "sel-start" ? "sel-start" : null,
    state === "sel-end"   ? "sel-end"   : null,
    state === "between"   ? "sel-between" : null,
    state === "today"     ? "today"     : null,
    state === "wknd"      ? "wknd"      : null,
  ].filter(Boolean).join(" ");

  const inlineStyle = {
    "--ca": accent,
    "--cg": glow,
    "--cad": accentDim,
  };

  return (
    <div ref={ref} className={cls} style={inlineStyle}
      onClick={handleClick}
      onMouseEnter={() => onEnter(day)}
      onMouseLeave={onLeave}>
      {day}
      {/* ✅ FIX 2: visible dot on cells with a saved note */}
      {hasNote && <span className="note-dot" style={{ background: accent }} />}
    </div>
  );
}

/* ─── Calendar Grid ─────────────────────────────────────────── */
function CalGrid({ year, month, t, rangeStart, rangeEnd, hoverDay, onDayClick, onDayEnter, onDayLeave, notes, animate, dir }) {
  const today = new Date();
  const first = getFirst(year, month);
  const total = getDays(year, month);

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getCellState(day) {
    if (!day) return "empty";
    const dt  = new Date(year, month, day);
    const ts  = dt.getTime();
    const dow = dt.getDay();

    // check today
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isWknd  = dow === 0 || dow === 6;

    if (rangeStart) {
      const rsTs = rangeStart.getTime();
      const isStart = rangeStart.getFullYear() === year && rangeStart.getMonth() === month && rangeStart.getDate() === day;
      if (isStart) return "sel-start";

      if (rangeEnd) {
        const isEnd = rangeEnd.getFullYear() === year && rangeEnd.getMonth() === month && rangeEnd.getDate() === day;
        if (isEnd) return "sel-end";
        // between start and end
        const lo = Math.min(rsTs, rangeEnd.getTime());
        const hi = Math.max(rsTs, rangeEnd.getTime());
        if (ts > lo && ts < hi) return "between";
      } else if (hoverDay) {
        // hover preview
        const hvTs = new Date(year, month, hoverDay).getTime();
        const lo = Math.min(rsTs, hvTs);
        const hi = Math.max(rsTs, hvTs);
        if (ts > lo && ts < hi) return "between";
      }
    }

    if (isToday) return "today";
    if (isWknd)  return "wknd";
    return "normal";
  }

  return (
    <div className="cal-col">
      {/* Day labels */}
      <div className="week-header">
        {DAYS.map((d, i) => (
          <div key={d} className={`wh-cell${i >= 5 ? " wknd" : ""}`}>{d}</div>
        ))}
      </div>

      {/* Grid – key forces remount on month change so animation replays */}
      <div className={`grid${animate ? ` grid-animate-${dir}` : ""}`} key={`${year}-${month}`}>
        {cells.map((day, idx) => {
          const noteKey = day ? fmtDate(new Date(year, month, day)) : null;
          return (
            <DateCell
              key={idx}
              day={day}
              state={getCellState(day)}
              accent={t.a}
              glow={t.gw}
              accentDim={t.ad}
              hasNote={noteKey ? !!notes[noteKey] : false}
              onClick={onDayClick}
              onEnter={onDayEnter}
              onLeave={onDayLeave}
            />
          );
        })}
      </div>

      {/* Range pill */}
      {rangeStart && (
        <div className="range-pill" style={{ "--ca": t.a, "--cad": t.ad, "--cab": t.ab }}>
          <span className="range-dot" style={{ background: t.a }} />
          {rangeEnd ? (
            <span>
              <strong style={{ color: t.a }}>
                {rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </strong>
              {" → "}
              <strong style={{ color: t.a }}>
                {rangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </strong>
              <em style={{ color: "var(--text2)" }}>
                {" · "}{Math.round((rangeEnd - rangeStart) / 86400000) + 1} days
              </em>
            </span>
          ) : (
            <span>
              <strong style={{ color: t.a }}>
                {rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </strong>
              <em style={{ color: "var(--text2)" }}> — pick end date</em>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Notes Panel ───────────────────────────────────────────── */
function NotesPanel({ t, year, month, rangeStart, rangeEnd, notes, monthlyNotes, isDark, onSaveNote, onSaveMonthly }) {
  const [tab, setTab]   = useState("monthly");
  const [val, setVal]   = useState("");
  const [saved, setSaved] = useState(false);

  // Auto-switch tab when range changes
  useEffect(() => {
    setTab(rangeStart ? "date" : "monthly");
  }, [rangeStart]);

  // Load correct content when tab / date / month change
  useEffect(() => {
    if (tab === "monthly") {
      setVal(monthlyNotes[fmtMonth(year, month)] || "");
    } else if (tab === "date" && rangeStart) {
      // ✅ FIX 1: always loads from rangeStart key
      setVal(notes[fmtDate(rangeStart)] || "");
    } else {
      setVal("");
    }
    setSaved(false);
  }, [tab, year, month, rangeStart, notes, monthlyNotes]);

  function doSave() {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (tab === "monthly") {
      onSaveMonthly(fmtMonth(year, month), trimmed);
    } else if (rangeStart) {
      // ✅ FIX 1: saves to rangeStart's date key (one entry per start date)
      onSaveNote(fmtDate(rangeStart), trimmed);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ✅ FIX 2: collect ALL saved notes for this month for display
  const mk = fmtMonth(year, month);
  const monthlyNote = monthlyNotes[mk] || "";
  const allDateNotes = Object.entries(notes)
    .filter(([k, v]) => k.startsWith(mk) && v && v.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  const hasAnySaved = !!monthlyNote || allDateNotes.length > 0;

  // Tab label
  const dateTabLabel = rangeStart
    ? rangeEnd
      ? `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}→${rangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Date";

  // Placeholder for textarea
  const placeholder = tab === "monthly"
    ? `Monthly notes for ${t.m}…`
    : rangeStart
      ? rangeEnd
        ? `Note for ${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${rangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}…`
        : `Note for ${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}…`
      : "Select a date first…";

  return (
    <div className="notes-col">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-icon-box" style={{ background: t.ad, border: `1px solid ${t.ab}`, color: t.a }}>✦</div>
        <div>
          <div className="notes-title">Notes</div>
          <div className="notes-sub">{t.m} {year}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        <button
          className={`tab-btn${tab === "monthly" ? " active" : ""}`}
          onClick={() => setTab("monthly")}
          style={tab === "monthly" ? { background: t.a, color: "#000", fontWeight: 600 } : {}}>
          Monthly
        </button>
        <button
          className={`tab-btn${tab === "date" ? " active" : ""}`}
          onClick={() => rangeStart && setTab("date")}
          disabled={!rangeStart}
          style={tab === "date" ? { background: t.a, color: "#000", fontWeight: 600 } : {}}>
          {dateTabLabel}
        </button>
      </div>

      {/* Textarea */}
      <div className="notes-wrap">
        <textarea
          className="notes-ta"
          value={val}
          onChange={e => setVal(e.target.value)}
          maxLength={300}
          placeholder={placeholder}
          style={{ "--ca": t.a, "--cg": t.gw }}
        />
        <div className="notes-cc">{val.length}/300</div>
      </div>

      {/* ✅ FIX 3: Save button — solid accent bg, black text, always visible in both modes */}
      <button
        className={`save-btn${saved ? " did-save" : ""}`}
        onClick={doSave}
        style={{
          background: saved ? "#22D46A" : t.a,
          color: "#000",
          border: isDark ? `1.5px solid transparent` : `1.5px solid ${t.a}`,
          fontWeight: 700,
        }}>
        {saved ? "✓  Saved!" : "Save Note"}
      </button>

      {/* ✅ FIX 2: Full saved notes visible below — with date labels and full content */}
      <div className="saved-section">
        {hasAnySaved && (
          <div className="saved-section-header" style={{ color: t.a }}>
            <span>●</span> Saved this month
          </div>
        )}

        {/* Monthly note */}
        {monthlyNote && (
          <div className="saved-note" style={{ borderLeftColor: t.a }}>
            <div className="saved-note-label">
              <span className="saved-dot" style={{ background: t.a }} />
              <span style={{ color: t.a }}>Monthly · {t.m}</span>
            </div>
            <div className="saved-note-text">{monthlyNote}</div>
          </div>
        )}

        {/* Date notes — ALL of them, with full date label */}
        {allDateNotes.map(([k, v]) => {
          const dateObj = new Date(k + "T00:00:00");
          const label = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <div key={k} className="saved-note" style={{ borderLeftColor: t.a + "99" }}>
              <div className="saved-note-label">
                <span className="saved-dot" style={{ background: t.a + "cc" }} />
                <span style={{ color: t.a }}>{label}</span>
              </div>
              <div className="saved-note-text">{v}</div>
            </div>
          );
        })}

        {!hasAnySaved && (
          <div className="empty-notes">No notes saved for {t.m} yet</div>
        )}
      </div>
    </div>
  );
}

/* ─── Root Component ────────────────────────────────────────── */
export default function WallCalendar() {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());

  // ✅ FIX 1: range state as plain refs to avoid stale closure issues
  const [rangeStart, setRangeStart] = useState(null);   // Date | null
  const [rangeEnd,   setRangeEnd]   = useState(null);   // Date | null
  const [hoverDay,   setHoverDay]   = useState(null);   // number | null

  const [notes,        setNotes]        = useState(() => loadLS("wc3_notes",   {}));
  const [monthlyNotes, setMonthlyNotes] = useState(() => loadLS("wc3_monthly", {}));
  const [isDark, setIsDark] = useState(true);
  const [anim,   setAnim]   = useState(false);
  const [animDir,setAnimDir]= useState("left");

  const t = THEMES[month];

  useEffect(() => { saveLS("wc3_notes",   notes);        }, [notes]);
  useEffect(() => { saveLS("wc3_monthly", monthlyNotes); }, [monthlyNotes]);

  /* Navigation */
  function navigate(dir) {
    if (anim) return;
    setAnimDir(dir > 0 ? "left" : "right");
    setAnim(true);
    setRangeStart(null); setRangeEnd(null); setHoverDay(null);
    setTimeout(() => {
      setMonth(m => {
        let nm = m + dir;
        if (nm < 0)  { setYear(y => y - 1); return 11; }
        if (nm > 11) { setYear(y => y + 1); return 0;  }
        return nm;
      });
      setAnim(false);
    }, 280);
  }

  /* ✅ FIX 1: Clean range selection — no stale closures, reads from component state directly */
  function handleDayClick(day) {
    const clicked = new Date(year, month, day);

    if (!rangeStart) {
      // 1st click → set start, clear end
      setRangeStart(clicked);
      setRangeEnd(null);
    } else if (!rangeEnd) {
      // 2nd click → either set end, swap, or clear
      if (clicked.getTime() === rangeStart.getTime()) {
        // same day → clear selection
        setRangeStart(null);
        setRangeEnd(null);
      } else if (clicked < rangeStart) {
        // clicked before start → swap so start is always earlier
        setRangeEnd(rangeStart);
        setRangeStart(clicked);
      } else {
        // normal: clicked after start → set end
        setRangeEnd(clicked);
      }
    } else {
      // 3rd click (range complete) → start a new range
      setRangeStart(clicked);
      setRangeEnd(null);
    }

    setHoverDay(null);
  }

  function handleDayEnter(day) {
    if (rangeStart && !rangeEnd) setHoverDay(day);
  }

  function handleDayLeave() {
    setHoverDay(null);
  }

  return (
    <div
      className={`scene${isDark ? " dark-mode" : " light-mode"}`}
      style={{ "--ACCENT": t.a, "--GLOW": t.gw, "--AD": t.ad }}
    >
      <div className="scene-ambient ambient-1" style={{ background: t.a }} />
      <div className="scene-ambient ambient-2" style={{ background: t.a }} />

      {/* Top bar */}
      <div className="top-bar">
        <div className="month-counter">{t.n} · {year}</div>
        {/* ✅ FIX 3: mode toggle always readable in both modes */}
        <button className="mode-toggle" onClick={() => setIsDark(d => !d)}>
          <span className="toggle-icon">{isDark ? "☽" : "☀"}</span>
          <span>{isDark ? "DARK" : "LIGHT"}</span>
        </button>
      </div>

      {/* Wall hanging */}
      <div className="nail" />
      <div className="wall-string" />

      {/* Calendar card */}
      <div className="calendar-outer">
        <div className="calendar-card">
          <div className="rings-bar">
            {Array.from({ length: 16 }).map((_, i) => <Ring key={i} />)}
          </div>

          <HeroBanner
            t={t} year={year} isDark={isDark}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
            disabled={anim}
          />

          <div className="body-section">
            <CalGrid
              year={year} month={month} t={t}
              rangeStart={rangeStart} rangeEnd={rangeEnd} hoverDay={hoverDay}
              onDayClick={handleDayClick}
              onDayEnter={handleDayEnter}
              onDayLeave={handleDayLeave}
              notes={notes} animate={anim} dir={animDir}
            />
            <div className="col-divider" />
            <NotesPanel
              t={t} year={year} month={month}
              rangeStart={rangeStart} rangeEnd={rangeEnd}
              notes={notes} monthlyNotes={monthlyNotes} isDark={isDark}
              onSaveNote={(k, v) => setNotes(p => ({ ...p, [k]: v }))}
              onSaveMonthly={(k, v) => setMonthlyNotes(p => ({ ...p, [k]: v }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
