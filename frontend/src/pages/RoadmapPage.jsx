import { useState, useEffect } from 'react';
import { ROADMAP, ROADMAP_PHASES } from '../roadmapData';
import { DATA } from '../data'; // Need this for PWP calculation

const userId = 'default_user';
const API_BASE = 'http://localhost:5000/api/progress';

function RoadmapPage() {
  const [done, setDone] = useState({});
  const [filter, setFilter] = useState("all");
  const [hideDone, setHideDone] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [openDays, setOpenDays] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/${userId}`)
      .then(res => res.json())
      .then(data => {
        setDone(data.done || {});
        setLoading(false);
        const keysOf = (d) => [
          ...(d.v || []).map((_, i) => "roadmap_v" + d.d + "-" + i),
          ...(d.p || []).map((_, i) => "roadmap_p" + d.d + "-" + i),
          ...(d.n || []).map((_, i) => "roadmap_n" + d.d + "-" + i)
        ];
        const dayDone = (d) => { const k = keysOf(d); return k.length > 0 && k.every(x => data[x]); };
        const cd = ROADMAP.find(x => !dayDone(x));
        const cdn = cd ? cd.d : 1;
        setOpenDays(new Set([String(cdn)]));
        // Removed automatic scroll on mount to prevent jumping during tab navigation
      })
      .catch(err => {
        console.error("Failed to fetch progress:", err);
        setLoading(false);
      });
  }, []);

  const saveToMongo = async (newDone) => {
    try {
      await fetch(`${API_BASE}/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newDone })
      });
    } catch (e) {
      console.error("Failed to save:", e);
    }
  };

  const toggleDone = (k, checked) => {
    const newDone = { ...done };
    if (checked) {
      newDone[k] = 1;
    } else {
      delete newDone[k];
    }
    setDone(newDone);
    saveToMongo(newDone);
  };

  const keysOf = d => [
    ...(d.v || []).map((_, i) => "roadmap_v" + d.d + "-" + i),
    ...(d.p || []).map((_, i) => "roadmap_p" + d.d + "-" + i),
    ...(d.n || []).map((_, i) => "roadmap_n" + d.d + "-" + i)
  ];

  const dayDone = d => { const k = keysOf(d); return k.length > 0 && k.every(x => done[x]); };
  const dayCount = d => keysOf(d).filter(x => done[x]).length;

  let shown = 0;
  const daysDoneCount = ROADMAP.filter(dayDone).length;

  // Weights setup
  // DSA+pwp = 25% (PWP keys: v{n}-{i}, p{n}-{i}. Roadmap DSA keys have k="dsa")
  // CS = 10%
  // project = 20%
  // system degine = 10%
  // english = 10%
  // gen ai = 15%
  // cloud basic = 10%

  const getPwpTotal = () => DATA.reduce((a, d) => a + d.v.length + d.p.length, 0);
  const getPwpDone = () => DATA.reduce((a, d) => a + d.v.filter((_, i) => done["v" + d.n + "-" + i]).length + d.p.filter((_, i) => done["p" + d.n + "-" + i]).length, 0);

  const getRoadmapCatTotal = (cat) => ROADMAP.reduce((a, d) => {
    return a + (d.v?.filter(x => x.k === cat).length || 0) +
      (d.p?.filter(x => x.k === cat).length || 0) +
      (d.n?.filter(x => x.k === cat).length || 0);
  }, 0);

  const getRoadmapCatDone = (cat) => ROADMAP.reduce((a, d) => {
    let c = 0;
    (d.v || []).forEach((x, i) => { if (x.k === cat && done["roadmap_v" + d.d + "-" + i]) c++; });
    (d.p || []).forEach((x, i) => { if (x.k === cat && done["roadmap_p" + d.d + "-" + i]) c++; });
    (d.n || []).forEach((x, i) => { if (x.k === cat && done["roadmap_n" + d.d + "-" + i]) c++; });
    return a + c;
  }, 0);

  const dsaTotal = getPwpTotal() + getRoadmapCatTotal("dsa");
  const dsaDone = getPwpDone() + getRoadmapCatDone("dsa");
  const dsaPct = dsaTotal ? (dsaDone / dsaTotal) * 25 : 0;

  const engTotal = getRoadmapCatTotal("english");
  const engDone = getRoadmapCatDone("english");
  const engPct = engTotal ? (engDone / engTotal) * 10 : 0;

  // Other categories are not in current mock data but we add placeholders
  const csPct = 0; // 10%
  const projPct = 0; // 20%
  const sysPct = 0; // 10%
  const aiPct = 0; // 15%
  const cloudPct = 0; // 10%

  const overallPct = Math.round(dsaPct + engPct + csPct + projPct + sysPct + aiPct + cloudPct);

  const toggleDay = (d) => {
    const newOpen = new Set(openDays);
    if (newOpen.has(String(d))) newOpen.delete(String(d));
    else newOpen.add(String(d));
    setOpenDays(newOpen);
  };

  const handleReset = async (e) => {
    // keeping reset isolated for Roadmap or globally?
    if (e.target.dataset.armed !== "1") {
      e.target.dataset.armed = "1";
      e.target.textContent = "Pakka? Dobara dabao";
      setTimeout(() => {
        if (e.target) {
          e.target.dataset.armed = "";
          e.target.textContent = "Reset all progress";
        }
      }, 4000);
      return;
    }
    setDone({});
    try {
      await fetch(`${API_BASE}/${userId}`, { method: 'DELETE' });
    } catch (err) { }
    e.target.dataset.armed = "";
    e.target.textContent = "Reset all progress";
  };

  if (loading) return null;

  return (
    <>
      <header className="top" style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <div className="top-in">
          <div className="brandrow">
            <div>
              <div className="brand">Progress Tracker</div>
              <h1>Complete Roadmap</h1>
            </div>
          </div>
          <p className="sub">DSA, CS, System Design, AI, English & Cloud — track all your goals.</p>
          <div className="meter">
            <div className="bar"><i id="barfill" style={{ width: overallPct + '%' }}></i></div>
            <div className="pct" id="barpct">{overallPct}%</div>
          </div>
          <div className="tiles">
            <div className="tile"><b>{daysDoneCount}<span style={{ fontSize: '12px', color: 'var(--muted)' }}>/{ROADMAP.length}</span></b><span>Days done</span></div>
            <div className="tile"><b>{Math.round(dsaPct)}%</b><span style={{ fontSize: '12px' }}>DSA (25%)</span></div>
            <div className="tile"><b>{Math.round(engPct)}%</b><span style={{ fontSize: '12px' }}>English (10%)</span></div>
          </div>
        </div>
      </header>

      <main className="wrap" id="list">
        {ROADMAP.map((d, index) => {
          if (filter !== "all" && String(d.ph) !== filter) return null;
          const dd = dayDone(d);
          if (hideDone && dd) return null;
          shown++;

          const inPh = ROADMAP.filter(x => x.ph === d.ph);
          const showPhase = index === 0 || ROADMAP[index - 1].ph !== d.ph;

          const tot = keysOf(d).length;
          const got = dayCount(d);
          const pct = tot ? Math.round(got / tot * 100) : 0;
          const isOpen = openDays.has(String(d.d));

          return (
            <div key={d.d}>
              {showPhase && (
                <div className="phase">
                  <h2>{ROADMAP_PHASES[d.ph] || "Phase " + d.ph}</h2>
                  <div className="rule"></div>
                  <span className="cnt"> Day {inPh[0].d}&ndash;{inPh[inPh.length - 1].d} &middot; {inPh.filter(dayDone).length}/{inPh.length} done</span>
                </div>
              )}

              <details className="day" data-d={d.d} data-done={dd ? 1 : 0} open={isOpen}>
                <summary onClick={(e) => {
                  e.preventDefault();
                  toggleDay(d.d);
                }}>
                  <span className="dnum">{String(d.d).padStart(2, "0")}</span>
                  <span className="dtop">
                    <span className="t">{d.top}</span>
                    <span className="m">{(d.v?.length || 0)} videos &middot; {(d.p?.length || 0)} problems &middot; {got}/{tot}</span>
                  </span>
                  <span className="mini"><i style={{ width: pct + '%' }}></i></span>
                  <span className="caret">&#9654;</span>
                </summary>

                <div className="body">
                  {d.v && d.v.length > 0 && (
                    <>
                      <div className="secttl">Videos</div>
                      <ul>
                        {d.v.map((v, i) => {
                          const k = "roadmap_v" + d.d + "-" + i;
                          const on = !!done[k];
                          return (
                            <li key={k} className={on ? "on" : ""}>
                              <input type="checkbox" id={k} checked={on} onChange={(e) => toggleDone(k, e.target.checked)} />
                              <span>{v.t}</span>
                              {v.k && <span className={`tag ${v.k.toUpperCase()}`}>{v.k}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {d.p && d.p.length > 0 && (
                    <>
                      <div className="secttl">Practice</div>
                      <ul>
                        {d.p.map((p, i) => {
                          const k = "roadmap_p" + d.d + "-" + i;
                          const on = !!done[k];
                          return (
                            <li key={k} className={on ? "on" : ""}>
                              <input type="checkbox" id={k} checked={on} onChange={(e) => toggleDone(k, e.target.checked)} />
                              <span>{p.t}</span>
                              {p.k && <span className={`tag ${p.k.toUpperCase()}`}>{p.k}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {d.n && d.n.length > 0 && (
                    <>
                      <div className="secttl">Notes / Action Items</div>
                      <ul>
                        {d.n.map((n, i) => {
                          const k = "roadmap_n" + d.d + "-" + i;
                          const on = !!done[k];
                          return (
                            <li key={k} className={on ? "on" : ""}>
                              <input type="checkbox" id={k} checked={on} onChange={(e) => toggleDone(k, e.target.checked)} />
                              <span>{n.t}</span>
                              {n.k && <span className={`tag ${n.k.toUpperCase()}`}>{n.k}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {d.note && <div className="note"><b>Note:</b> {d.note}</div>}
                </div>
              </details>
            </div>
          );
        })}
        {shown === 0 && <p className="empty">All done for this filter!</p>}
      </main>

      <div className="wrap" style={{ paddingBlock: 0 }}>
        <footer>
          <div className="io">
            <button className="btn" type="button" onClick={handleReset}>Reset all progress</button>
          </div>
        </footer>
      </div>
    </>
  );
}

export default RoadmapPage;
