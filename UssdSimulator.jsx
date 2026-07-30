import { useState, useRef, useEffect } from "react";
import { Phone, PhoneOff, Delete, BatteryMedium } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  CONTENT — everything below is data, not code. Edit freely.        */
/*  This is what keeps the "chatbot" scoped: every line a user can    */
/*  see is either in MENU_TREE or FAQS, both written by a human.      */
/* ------------------------------------------------------------------ */

const USSD_CODE = "*456#";

const MENU_TREE = {
  root: {
    header: "Haki Line",
    body: ["1. Know Your Rights", "2. Report a Violation", "3. Find Legal Aid", "4. Ask a Question", "5. Check Report Status"],
    options: { "1": "rights", "2": "report_category", "3": "legal_region", "4": "faq_prompt", "5": "status_prompt" },
  },

  rights: {
    header: "Know Your Rights",
    body: ["1. Freedom of Expression", "2. Right to Assembly", "3. Privacy & Data", "4. Arrest & Detention"],
    options: { "1": "rights_expression", "2": "rights_assembly", "3": "rights_privacy", "4": "rights_arrest", "0": "root" },
  },
  rights_expression: {
    header: "Expression",
    body: [
      "You may speak, publish and post online without prior state approval.",
      "Limits exist only for incitement, defamation or true security threats — vague 'offensive content' rules are often challenged in court.",
      "0. Back  00. Main Menu",
    ],
    options: { "0": "rights", "00": "root" },
  },
  rights_assembly: {
    header: "Assembly",
    body: [
      "Peaceful gatherings do not legally require police permission — only advance NOTICE in most jurisdictions.",
      "Police must show a specific public-safety reason to disperse a peaceful protest.",
      "0. Back  00. Main Menu",
    ],
    options: { "0": "rights", "00": "root" },
  },
  rights_privacy: {
    header: "Privacy & Data",
    body: [
      "Your calls, messages and location data are protected — access by any party usually requires a court order.",
      "You can ask any org holding your data what they hold and request deletion.",
      "0. Back  00. Main Menu",
    ],
    options: { "0": "rights", "00": "root" },
  },
  rights_arrest: {
    header: "Arrest & Detention",
    body: [
      "Ask the officer's name, badge no. and the reason for arrest — you're entitled to know both.",
      "You must be brought before a court within the legal time limit, and you may call a lawyer or family member.",
      "0. Back  00. Main Menu",
    ],
    options: { "0": "rights", "00": "root" },
  },

  report_category: {
    header: "Report a Violation",
    body: ["Select category:", "1. Unlawful Arrest", "2. Assembly / Protest", "3. Online Censorship", "4. Other"],
    options: { "1": "report_details", "2": "report_details", "3": "report_details", "4": "report_details", "0": "root" },
    onEnter: (ctx, key) => ({ ...ctx, category: { "1": "Unlawful Arrest", "2": "Assembly / Protest", "3": "Online Censorship", "4": "Other" }[key] }),
  },
  report_details: {
    header: "Describe briefly",
    body: (ctx) => [`Category: ${ctx.category}`, "Type a short description below, then press Send.", "(location, date, what happened)"],
    input: "text",
    onSubmit: (ctx, text) => {
      const ref = "HL-" + Math.floor(1000 + Math.random() * 9000);
      return { next: "report_done", ctx: { ...ctx, lastRef: ref, reports: [...(ctx.reports || []), { ref, category: ctx.category, text }] } };
    },
  },
  report_done: {
    header: "Report Received",
    body: (ctx) => [`Reference code: ${ctx.lastRef}`, "Save this code to check status later.", "This is a local demo — nothing was actually submitted.", "00. Main Menu"],
    options: { "00": "root" },
  },

  legal_region: {
    header: "Find Legal Aid",
    body: ["Choose your region:", "1. Central", "2. Northern", "3. Eastern", "4. Western"],
    options: { "1": "legal_list", "2": "legal_list", "3": "legal_list", "4": "legal_list", "0": "root" },
    onEnter: (ctx, key) => ({ ...ctx, region: { "1": "Central", "2": "Northern", "3": "Eastern", "4": "Western" }[key] }),
  },
  legal_list: {
    header: (ctx) => `Legal Aid — ${ctx.region}`,
    body: (ctx) => {
      const dirs = {
        Central: ["Rights Clinic Kampala — 0800 100 200", "Bar Assoc. Legal Aid — 0800 100 210"],
        Northern: ["Gulu Legal Desk — 0800 100 220"],
        Eastern: ["Mbale Justice Centre — 0800 100 230"],
        Western: ["Mbarara Aid Bureau — 0800 100 240"],
      };
      return [...dirs[ctx.region], "All calls to 0800 numbers are free.", "0. Back  00. Main Menu"];
    },
    options: { "0": "legal_region", "00": "root" },
  },

  faq_prompt: {
    header: "Ask a Question",
    body: ["Type your question in a few words, then press Send.", 'e.g. "arrested no warrant"'],
    input: "text",
    onSubmit: (ctx, text) => ({ next: "faq_answer", ctx: { ...ctx, lastQuery: text, lastAnswer: answerFaq(text) } }),
  },
  faq_answer: {
    header: "Answer",
    body: (ctx) => [ctx.lastAnswer.text, "", ctx.lastAnswer.matched ? "1. Ask another  0. Main Menu" : "1. Ask another  2. Legal Aid  0. Main Menu"],
    options: { "1": "faq_prompt", "2": "legal_region", "0": "root" },
  },

  status_prompt: {
    header: "Check Report Status",
    body: ["Enter your reference code (e.g. HL-1234), then press Send."],
    input: "text",
    onSubmit: (ctx, text) => {
      const found = (ctx.reports || []).find((r) => r.ref.toLowerCase() === text.trim().toLowerCase());
      return { next: "status_result", ctx: { ...ctx, statusResult: found } };
    },
  },
  status_result: {
    header: "Status",
    body: (ctx) =>
      ctx.statusResult
        ? [`${ctx.statusResult.ref} — ${ctx.statusResult.category}`, "Status: Under Review", "00. Main Menu"]
        : ["No report found for that code.", "Reports only persist for this session.", "00. Main Menu"],
    options: { "00": "root" },
  },
};

/* Curated, keyword-scored FAQ — deliberately NOT an LLM call.
   Every possible answer is written and reviewable ahead of time. */
const FAQS = [
  { keywords: ["arrest", "warrant", "police", "detain"], text: "Police can arrest without a warrant only if they witness a crime or have strong reasonable suspicion. Ask for the reason and their badge number." },
  { keywords: ["protest", "assembly", "permit", "march", "gathering"], text: "Peaceful protests need only advance notice, not permission, in most jurisdictions. See Know Your Rights > Assembly for detail." },
  { keywords: ["post", "social", "media", "online", "facebook", "twitter", "x", "delete", "removed"], text: "Posting online is protected speech. If a platform or authority removed your content without clear legal grounds, log it under Report a Violation > Online Censorship." },
  { keywords: ["phone", "tapped", "surveillance", "data", "privacy", "track"], text: "Access to your phone or location data by any party normally requires a court order. You can request any organisation disclose what data of yours they hold." },
  { keywords: ["lawyer", "afford", "legal", "aid", "free", "representation"], text: "Free legal aid is available regionally — go to Find Legal Aid from the main menu to see contacts near you." },
  { keywords: ["bail", "court", "days", "held"], text: "You must be brought before a court within the legal time limit after arrest — this varies by jurisdiction, ask your legal aid contact for the exact figure." },
];

function answerFaq(query) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const faq of FAQS) {
    const score = faq.keywords.reduce((acc, k) => acc + (words.includes(k) || query.toLowerCase().includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }
  if (best && bestScore > 0) return { matched: true, text: best.text };
  return { matched: false, text: "No matching answer on file. Try different words, or use option 2 below to reach Legal Aid directly." };
}

/* ------------------------------------------------------------------ */
/*  ENGINE — generic tree walker, works for any MENU_TREE shape       */
/* ------------------------------------------------------------------ */

const KEYS = [
  { d: "1", l: "" },
  { d: "2", l: "ABC" },
  { d: "3", l: "DEF" },
  { d: "4", l: "GHI" },
  { d: "5", l: "JKL" },
  { d: "6", l: "MNO" },
  { d: "7", l: "PQRS" },
  { d: "8", l: "TUV" },
  { d: "9", l: "WXYZ" },
  { d: "*", l: "" },
  { d: "0", l: "+" },
  { d: "#", l: "" },
];

function Key({ d, l, onPress }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={() => onPress(d)}
      className="relative flex flex-col items-center justify-center select-none transition-transform"
      style={{
        height: 42,
        borderRadius: 10,
        background: pressed ? "#2c2c28" : "linear-gradient(180deg,#434339,#34342f)",
        border: "1px solid #1b1b18",
        boxShadow: pressed ? "inset 0 2px 4px rgba(0,0,0,0.5)" : "0 1px 0 #4d4d44, 0 2px 2px rgba(0,0,0,0.4)",
        transform: pressed ? "translateY(1px)" : "none",
      }}
    >
      <span style={{ color: "#f0eee4", fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{d}</span>
      {l && (
        <span style={{ color: "#a9a89c", fontSize: 6, letterSpacing: 1.5, marginTop: 2 }}>{l}</span>
      )}
    </button>
  );
}

export default function UssdSimulator() {
  const [dialed, setDialed] = useState(USSD_CODE);
  const [sessionOn, setSessionOn] = useState(false);
  const [nodeId, setNodeId] = useState("root");
  const [stack, setStack] = useState([]);
  const [ctx, setCtx] = useState({ reports: [] });
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState("");
  const [entered, setEntered] = useState(true);
  const [now, setNow] = useState(new Date());
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sessionOn) inputRef.current?.focus();
  }, [sessionOn, nodeId]);

  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 20);
    return () => clearTimeout(t);
  }, [nodeId]);

  const node = MENU_TREE[nodeId];
  const headerText = typeof node?.header === "function" ? node.header(ctx) : node?.header;
  const bodyLines = typeof node?.body === "function" ? node.body(ctx) : node?.body || [];
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1200);
  }

  function startSession() {
    if (dialed.trim() !== USSD_CODE) {
      showFlash("Invalid USSD code");
      return;
    }
    setSessionOn(true);
    setNodeId("root");
    setStack([]);
    setCtx((c) => ({ reports: c.reports || [] }));
    setInput("");
  }

  function endSession() {
    setSessionOn(false);
    setDialed(USSD_CODE);
    setInput("");
    setStack([]);
    setNodeId("root");
  }

  function goBack() {
    if (!sessionOn) {
      setDialed("");
      return;
    }
    if (stack.length > 0) {
      const prev = stack[stack.length - 1];
      setStack((s) => s.slice(0, -1));
      setNodeId(prev);
      setInput("");
    } else {
      endSession();
    }
  }

  function send() {
    if (!sessionOn) {
      startSession();
      return;
    }
    const val = input.trim();
    if (!val) return;

    if (node.input === "text") {
      const result = node.onSubmit(ctx, val);
      setStack((s) => [...s, nodeId]);
      setCtx(result.ctx);
      setNodeId(result.next);
      setInput("");
      return;
    }

    const next = node.options && node.options[val];
    if (!next) {
      showFlash("Invalid option");
      setInput("");
      return;
    }
    let newCtx = ctx;
    if (node.onEnter) newCtx = node.onEnter(ctx, val);
    setCtx(newCtx);
    setStack((s) => (next === "root" ? [] : [...s, nodeId]));
    setNodeId(next);
    setInput("");
  }

  function keyPress(k) {
    if (!sessionOn) setDialed((d) => d + k);
    else setInput((v) => v + k);
  }
  function backspace() {
    if (!sessionOn) setDialed((d) => d.slice(0, -1));
    else setInput((v) => v.slice(0, -1));
  }

  const leftLabel = !sessionOn ? "Call" : node.input === "text" ? "Send" : "Select";
  const rightLabel = !sessionOn ? "Clear" : "Back";

  return (
    <div className="w-full flex items-center justify-center py-10" style={{ background: "radial-gradient(circle at 50% 20%, #23262b, #16181b)" }}>
      <div
        style={{ "--lcd-bg": "#9fb083", "--lcd-fg": "#1b2412", "--lcd-dim": "#71824f", width: 292 }}
        className="relative"
      >
        {/* Phone chassis */}
        <div
          className="relative rounded-[2.6rem] pt-5 pb-6 px-4"
          style={{
            background: "linear-gradient(155deg,#4a4a43 0%,#2e2e29 45%,#232320 100%)",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px #17171533",
          }}
        >
          {/* side buttons */}
          <div style={{ position: "absolute", right: -3, top: 92, width: 3, height: 34, background: "#1a1a17", borderRadius: 2 }} />
          <div style={{ position: "absolute", right: -3, top: 134, width: 3, height: 34, background: "#1a1a17", borderRadius: 2 }} />
          <div style={{ position: "absolute", left: -3, top: 110, width: 3, height: 46, background: "#1a1a17", borderRadius: 2 }} />

          {/* earpiece + camera */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div style={{ width: 4, height: 4, borderRadius: 99, background: "#111" }} />
            <div style={{ width: 46, height: 6, borderRadius: 99, background: "#141412", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)" }} />
          </div>

          {/* Screen */}
          <div
            className="relative overflow-hidden rounded-[6px] mb-4"
            style={{
              background: "var(--lcd-bg)",
              boxShadow: "inset 0 0 0 3px #3d4830, inset 0 3px 14px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* glass sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%)" }}
            />

            {/* status bar */}
            <div
              className="relative flex items-center justify-between px-2 py-1"
              style={{ borderBottom: "1px solid var(--lcd-dim)", color: "var(--lcd-fg)", fontFamily: "ui-monospace,'Courier New',monospace" }}
            >
              <div className="flex items-end gap-[2px]">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} style={{ width: 3, height: h, background: "var(--lcd-fg)", opacity: sessionOn ? 1 : 0.5 }} />
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>HAKI</span>
              <div className="flex items-center gap-1">
                <span style={{ fontSize: 10 }}>{time}</span>
                <BatteryMedium size={12} strokeWidth={2.5} />
              </div>
            </div>

            {/* screen content */}
            <div
              className="relative px-3 py-2.5 flex flex-col"
              style={{ minHeight: 188, color: "var(--lcd-fg)", fontFamily: "ui-monospace,'Courier New',monospace", fontSize: 12.5, lineHeight: 1.55 }}
            >
              <div
                style={{
                  opacity: entered ? 1 : 0,
                  transform: entered ? "translateY(0px)" : "translateY(3px)",
                  transition: "opacity 140ms ease, transform 140ms ease",
                  flex: 1,
                }}
              >
                {!sessionOn ? (
                  <div className="opacity-70 mt-1">Enter USSD code and press Call</div>
                ) : (
                  <>
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: "#2f6e28" }} />
                      {headerText}
                    </div>
                    <div className="space-y-0.5">
                      {bodyLines.map((line, i) => (
                        <div key={i}>{line || "\u00A0"}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {flash && (
                <div className="mb-1 font-bold" style={{ color: "#7a2e22" }}>
                  {flash}
                </div>
              )}

              {/* input line */}
              <div className="mt-1 pt-1.5 flex items-center gap-1" style={{ borderTop: "1px solid var(--lcd-dim)" }}>
                <span>{sessionOn ? "›" : ""}</span>
                <input
                  ref={inputRef}
                  value={sessionOn ? input : dialed}
                  onChange={(e) => (sessionOn ? setInput(e.target.value) : setDialed(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                    if (e.key === "Backspace" && !e.target.value) backspace();
                  }}
                  className="bg-transparent outline-none flex-1 min-w-0"
                  style={{ color: "var(--lcd-fg)", fontFamily: "inherit", fontSize: 12.5, caretColor: "var(--lcd-fg)" }}
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* soft keys */}
          <div className="flex justify-between px-2 mb-2" style={{ fontFamily: "ui-monospace,monospace" }}>
            <button onClick={send} className="text-[11px] font-semibold tracking-wide" style={{ color: "#cfd2c4" }}>
              {leftLabel}
            </button>
            <button onClick={goBack} className="text-[11px] font-semibold tracking-wide" style={{ color: "#cfd2c4" }}>
              {rightLabel}
            </button>
          </div>

          {/* navigation cluster: call / OK / end */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              onClick={send}
              className="flex items-center justify-center rounded-full active:scale-95 transition"
              style={{ width: 40, height: 40, background: "linear-gradient(180deg,#4f9a48,#3a7a34)", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
              aria-label="Call"
            >
              <Phone size={16} color="#eafbe6" fill="#eafbe6" strokeWidth={0} />
            </button>
            <button
              onClick={send}
              className="flex items-center justify-center rounded-full text-[11px] font-bold active:scale-95 transition"
              style={{ width: 40, height: 40, background: "linear-gradient(180deg,#55564d,#3d3e37)", color: "#eceae0", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
              aria-label="OK"
            >
              OK
            </button>
            <button
              onClick={endSession}
              className="flex items-center justify-center rounded-full active:scale-95 transition"
              style={{ width: 40, height: 40, background: "linear-gradient(180deg,#c24e3d,#9c3a2c)", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
              aria-label="End"
            >
              <PhoneOff size={16} color="#fdece8" strokeWidth={2.5} />
            </button>
          </div>

          {/* numeric keypad */}
          <div className="grid grid-cols-3 gap-[7px] mb-2">
            {KEYS.map((k) => (
              <Key key={k.d} d={k.d} l={k.l} onPress={keyPress} />
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={backspace}
              className="flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-semibold active:scale-95 transition"
              style={{ color: "#cfd2c4", background: "#33332e", border: "1px solid #1b1b18" }}
            >
              <Delete size={11} /> Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
