import { useState, useEffect, useRef } from 'react'
import { DATA, PHASES, VT, PT } from '../data'

const userId = 'default_user';
const API_BASE = 'http://localhost:5000/api/progress';

function App() {
  const [done, setDone] = useState({});
  const [filter, setFilter] = useState("all");
  const [hideDone, setHideDone] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [openDays, setOpenDays] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch initial data from MongoDB
  useEffect(() => {
    fetch(`${API_BASE}/${userId}`)
      .then(res => res.json())
      .then(data => {
        setDone(data.done || {});
        setLoading(false);
        // open current day by default
        const keysOf = (d) => [
          ...d.v.map((v, i) => "v" + d.n + "-" + i),
          ...d.p.map((p, i) => "p" + d.n + "-" + i)
        ];
        const dayDone = (d) => { const k = keysOf(d); return k.length > 0 && k.every(x => data[x]); };
        const cd = DATA.find(x => !dayDone(x));
        const cdn = cd ? cd.n : 60;
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

  const esc = s => String(s); // React handles escaping

  const keysOf = d => [
    ...d.v.map((v, i) => "v" + d.n + "-" + i),
    ...d.p.map((p, i) => "p" + d.n + "-" + i)
  ];
  const dayDone = d => { const k = keysOf(d); return k.length > 0 && k.every(x => done[x]); };
  const dayCount = d => keysOf(d).filter(x => done[x]).length;

  let lastPh = -1;
  let shown = 0;

  const daysDoneCount = DATA.filter(dayDone).length;
  const vidsDoneCount = DATA.reduce((a, d) => a + d.v.filter((_, i) => done["v" + d.n + "-" + i]).length, 0);
  const probsDoneCount = DATA.reduce((a, d) => a + d.p.filter((_, i) => done["p" + d.n + "-" + i]).length, 0);
  const overallPct = Math.round((vidsDoneCount + probsDoneCount) / (VT + PT) * 100) || 0;
  const estHours = Math.round(vidsDoneCount * 0.6 + probsDoneCount * 0.33);

  const toggleDay = (n) => {
    const newOpen = new Set(openDays);
    if (newOpen.has(String(n))) newOpen.delete(String(n));
    else newOpen.add(String(n));
    setOpenDays(newOpen);
  };

  const handleCopyBackup = async (e) => {
    const code = btoa(JSON.stringify(done || {}));
    setBackupCode(code);
    try {
      await navigator.clipboard.writeText(code);
      e.target.textContent = "Copied!";
    } catch (_) {
      e.target.textContent = "Copy from box below";
    }
    setTimeout(() => { e.target.textContent = "Copy backup code"; }, 2200);
  };

  const handleRestore = async (e) => {
    if (!backupCode.trim()) {
      e.target.textContent = "Paste a code first";
      setTimeout(() => { e.target.textContent = "Restore from code"; }, 2000);
      return;
    }
    try {
      const obj = JSON.parse(atob(backupCode.trim()));
      if (typeof obj !== "object" || obj === null) throw new Error("Invalid");
      setDone(obj);
      await saveToMongo(obj);
      e.target.textContent = "Restored";
    } catch (_) {
      e.target.textContent = "Code not valid";
    }
    setTimeout(() => { e.target.textContent = "Restore from code"; }, 2200);
  };

  const handleReset = async (e) => {
    if (e.target.dataset.armed !== "1") {
      e.target.dataset.armed = "1";
      e.target.textContent = "Pakka? Dobara dabao";
      setTimeout(() => {
        if(e.target) {
          e.target.dataset.armed = "";
          e.target.textContent = "Reset all progress";
        }
      }, 4000);
      return;
    }
    setDone({});
    try {
      await fetch(`${API_BASE}/${userId}`, { method: 'DELETE' });
    } catch(err) {}
    e.target.dataset.armed = "";
    e.target.textContent = "Reset all progress";
  };

  const goToCurrentDay = () => {
    const cd = DATA.find(x => !dayDone(x));
    const n = cd ? cd.n : 60;
    if (hideDone === false && filter !== "all") {
      setFilter("all");
    }
    const newOpen = new Set(openDays);
    newOpen.add(String(n));
    setOpenDays(newOpen);
    setTimeout(() => {
      const el = document.querySelector(`.day[data-n="${n}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  if (loading) return null; // or a simple spinner

  return (
    <>
      <header className="top" style={{marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
        <div className="top-in">
          <div className="brandrow">
            <div>
              <div className="brand">Padho with Pratyush</div>
              <h1>60-Day Placement Sprint</h1>
            </div>
            <button className="btn" id="today" type="button" onClick={goToCurrentDay}>Go to current day</button>
          </div>
          <p className="sub">Zero se placement-ready. 2 hrs videos + 1 hr practice, har din. Tick karte jao — progress apne aap save hoti hai.</p>
          <div className="meter">
            <div className="bar"><i id="barfill" style={{ width: overallPct + '%' }}></i></div>
            <div className="pct" id="barpct">{overallPct}%</div>
          </div>
          <div className="tiles">
            <div className="tile"><b id="t-days">{daysDoneCount}<span style={{ fontSize: '12px', color: 'var(--muted)' }}>/60</span></b><span>Days done</span></div>
            <div className="tile"><b id="t-vids">{vidsDoneCount}<span style={{ fontSize: '12px', color: 'var(--muted)' }}>/161</span></b><span>Videos</span></div>
            <div className="tile"><b id="t-probs">{probsDoneCount}<span style={{ fontSize: '12px', color: 'var(--muted)' }}>/186</span></b><span>Problems</span></div>
            <div className="tile"><b id="t-hours">{estHours}<span style={{ fontSize: '12px', color: 'var(--muted)' }}>h</span></b><span>Est. hours</span></div>
          </div>
          <div className="controls">
            <button className="chip" type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"}>All</button>
            <button className="chip" type="button" onClick={() => setFilter("0")} aria-pressed={filter === "0"}>Foundation</button>
            <button className="chip" type="button" onClick={() => setFilter("1")} aria-pressed={filter === "1"}>Core Patterns</button>
            <button className="chip" type="button" onClick={() => setFilter("2")} aria-pressed={filter === "2"}>DSA + AI</button>
            <button className="chip" type="button" onClick={() => setFilter("3")} aria-pressed={filter === "3"}>Revision</button>
            <span className="spacer"></span>
            <button className="chip" type="button" id="hide" onClick={() => setHideDone(!hideDone)} aria-pressed={hideDone}>Hide done</button>
          </div>
        </div>
      </header>

      <main className="wrap" id="list">
        {DATA.map((d, index) => {
          if (filter !== "all" && String(d.ph) !== filter) return null;
          const dd = dayDone(d);
          if (hideDone && dd) return null;
          shown++;

          const inPh = DATA.filter(x => x.ph === d.ph);
          const showPhase = index === 0 || DATA[index - 1].ph !== d.ph;
          
          const tot = keysOf(d).length;
          const got = dayCount(d);
          const pct = tot ? Math.round(got / tot * 100) : 0;
          const isOpen = openDays.has(String(d.n));

          return (
            <div key={d.n}>
              {showPhase && (
                <div className="phase">
                  <h2>{PHASES[d.ph]}</h2>
                  <div className="rule"></div>
                  <span className="cnt">Day {inPh[0].n}&ndash;{inPh[inPh.length - 1].n} &middot; {inPh.filter(dayDone).length}/{inPh.length} done</span>
                </div>
              )}
              
              <details className="day" data-n={d.n} data-done={dd ? 1 : 0} open={isOpen}>
                <summary onClick={(e) => {
                  e.preventDefault();
                  toggleDay(d.n);
                }}>
                  <span className="dnum">{String(d.n).padStart(2, "0")}</span>
                  <span className="dtop">
                    <span className="t">{d.top}</span>
                    <span className="m">{d.v.length} video{d.v.length > 1 ? "s" : ""} &middot; {d.p.length} problems &middot; {got}/{tot}</span>
                  </span>
                  <span className="mini"><i style={{ width: pct + '%' }}></i></span>
                  <span className="caret">&#9654;</span>
                </summary>
                
                <div className="body">
                  <div className="secttl">Watch &middot; ~2 hrs</div>
                  <ul>
                    {d.v.map((v, i) => {
                      const k = "v" + d.n + "-" + i;
                      const on = !!done[k];
                      return (
                        <li key={k} className={on ? "on" : ""}>
                          <input type="checkbox" id={k} checked={on} onChange={(e) => toggleDone(k, e.target.checked)} aria-label="Mark video watched" />
                          <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{v.t}</a>
                          {v.k === "ai" && <span className="tag AI">AI</span>}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="secttl">Practice &middot; ~1 hr</div>
                  <ul>
                    {d.p.map((p, i) => {
                      const k = "p" + d.n + "-" + i;
                      const on = !!done[k];
                      return (
                        <li key={k} className={on ? "on" : ""}>
                          <input type="checkbox" id={k} checked={on} onChange={(e) => toggleDone(k, e.target.checked)} aria-label="Mark problem solved" />
                          <a href={`https://leetcode.com/problems/${p.s}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{p.t}</a>
                          <span className={`tag ${p.d}`}>{p.d}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {d.g && <p className="theory">Theory padhni ho to &rarr; <a href={d.g} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>GeeksforGeeks notes</a></p>}
                  <div className="note"><b>Aaj ka focus</b>{d.note}</div>
                </div>
              </details>
            </div>
          );
        })}
        {shown === 0 && <p className="empty">Is filter mein kuch nahi bacha. Sab done hai &mdash; shabash!</p>}
      </main>

      <div className="wrap" style={{ paddingBlock: 0 }}>
        <footer>
          <p><b>Rozana rhythm —</b> 2 ghante videos dekho (notes banao, sirf play mat karo), phir 1 ghanta us din ke problems pe. Problem 30 min mein na bane to solution dekho, samjho, aur agle din bina dekhe dobara likho.</p>
          <p>Progress ab MongoDB mein save hoti hai. Phone aur laptop ka progress sync ho jayega.</p>
          <div className="io">
            <button className="btn" type="button" id="backup" onClick={handleCopyBackup}>Copy backup code</button>
            <button className="btn" type="button" id="restore" onClick={handleRestore}>Restore from code</button>
            <button className="btn" type="button" id="reset" onClick={handleReset}>Reset all progress</button>
          </div>
          <textarea id="code" spellCheck="false" placeholder="Backup code yahan aayega / paste karo phir Restore dabao" value={backupCode} onChange={(e) => setBackupCode(e.target.value)}></textarea>
          <p style={{ marginTop: '14px' }}>162 videos · 175 LeetCode problems · GFG theory links · 60 days</p>
        </footer>
      </div>
    </>
  )
}

export default App
