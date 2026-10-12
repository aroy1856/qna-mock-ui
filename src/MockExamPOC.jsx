import { useState, useEffect, useRef, useId } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });

const API_QUESTIONS_URL = "/api/questions/";

function normalizeApiQuestion(q) {
  const keys = ["A", "B", "C", "D"];
  const optionsObj = q.options || {};
  const options = keys.map((k) => `${k}. ${optionsObj[k] ?? ""}`);
  const correct = Math.max(0, keys.indexOf(String(q.correct_option || "").toUpperCase()));
  return {
    id: `api-${q.id}`,
    subject: "API",
    topic: "Backend",
    difficulty: 2,
    question_text: q.question_text || "",
    options,
    correct,
    explanation: `Correct option: **${q.correct_option}**. ${optionsObj[q.correct_option] || ""}`,
    source: "api",
  };
}

// ── question bank (local) ────────────────────────────────────────────────────
const LOCAL_QUESTIONS = [
  {
    id: 1,
    subject: "Physics",
    topic: "Kinematics",
    difficulty: 2,
    question_text:
      "A body starts from rest and accelerates uniformly. Using $v = u + at$, find the velocity after $t = 5\\text{ s}$ when acceleration $a = 9.8\\text{ m/s}^2$.",
    options: ["A. $49\\text{ m/s}$", "B. $9.8\\text{ m/s}$", "C. $25\\text{ m/s}$", "D. $98\\text{ m/s}$"],
    correct: 0,
    explanation:
      "Since $u = 0$ (starts from rest), $v = 0 + (9.8)(5) = **49\\text{ m/s}**$. The kinematic equation $v = u + at$ applies for uniform acceleration.",
  },
  {
    id: 2,
    subject: "Physics",
    topic: "Energy",
    difficulty: 3,
    question_text:
      "Which equation correctly relates energy and frequency of a photon?\n\n$$E = h\\nu$$\n\nHere $h = 6.626 \\times 10^{-34}\\text{ J·s}$ is Planck's constant and $\\nu$ is the frequency.",
    options: [
      "A. $E = mc^2$",
      "B. $E = h\\nu$",
      "C. $E = \\frac{1}{2}mv^2$",
      "D. $E = qV$",
    ],
    correct: 1,
    explanation:
      "The photoelectric effect, explained by Einstein using Planck's quantization, gives $E = h\\nu$ for photon energy. $E = mc^2$ relates mass-energy equivalence, not photon frequency.",
  },
  {
    id: 3,
    subject: "Chemistry",
    topic: "Organic Reactions",
    difficulty: 3,
    question_text:
      "Identify the type of reaction shown below:\n\n$$\\ce{CH3CH2Br + NaOH ->  CH3CH2OH + NaBr}$$",
    options: [
      "A. Elimination",
      "B. Addition",
      "C. Nucleophilic substitution",
      "D. Electrophilic substitution",
    ],
    correct: 2,
    explanation:
      "$\\ce{OH-}$ is a nucleophile attacking the electrophilic carbon bearing the $\\ce{Br}$ leaving group. This is an **SN2** nucleophilic substitution. No double bond forms, ruling out elimination.",
  },
  {
    id: 4,
    subject: "Chemistry",
    topic: "Equilibrium",
    difficulty: 4,
    question_text:
      "For the Haber process, the equilibrium reaction is:\n\n$$\\ce{N2(g) + 3H2(g) <=> 2NH3(g)} \\quad \\Delta H = -92\\text{ kJ/mol}$$\n\nWhat happens to the yield of $\\ce{NH3}$ if temperature is **increased**?",
    options: [
      "A. Increases — forward reaction is favoured",
      "B. Decreases — equilibrium shifts left",
      "C. Stays the same — temperature has no effect",
      "D. Increases — more kinetic energy available",
    ],
    correct: 1,
    explanation:
      "By Le Chatelier's principle, increasing temperature shifts equilibrium in the **endothermic** direction. Since the forward reaction is exothermic ($\\Delta H < 0$), the reverse reaction is favoured, **decreasing** $\\ce{NH3}$ yield.",
  },
  {
    id: 5,
    subject: "Chemistry",
    topic: "Structural Diagrams",
    difficulty: 2,
    question_text:
      "The image below shows the structural formula of benzene. What is its molecular formula?\n\n![Benzene structural formula](https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Benzene_Structural_diagram.svg/330px-Benzene_Structural_diagram.svg.png)\n\nSelect the correct molecular formula:",
    options: [
      "A. $\\ce{C6H12}$",
      "B. $\\ce{C6H6}$",
      "C. $\\ce{C6H8}$",
      "D. $\\ce{C5H5}$",
    ],
    correct: 1,
    explanation:
      "Benzene $\\ce{C6H6}$ has 6 carbon atoms arranged in a ring with alternating double bonds (or delocalised $\\pi$ electrons). Each carbon bonds to one hydrogen. Its degree of unsaturation is 4.",
  },
  {
    id: 6,
    subject: "Mathematics",
    topic: "Calculus",
    difficulty: 3,
    question_text:
      "Evaluate the definite integral:\n\n$$\\int_0^{\\pi} \\sin(x)\\, dx$$",
    options: ["A. $0$", "B. $1$", "C. $2$", "D. $\\pi$"],
    correct: 2,
    explanation:
      "$$\\int_0^{\\pi} \\sin(x)\\, dx = \\Big[-\\cos(x)\\Big]_0^{\\pi} = (-\\cos\\pi) - (-\\cos 0) = (1) - (-1) = 2$$",
  },
  {
    id: 7,
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 2,
    question_text:
      "Find the roots of the quadratic equation using:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nGiven $x^2 - 5x + 6 = 0$, what are the roots?",
    options: [
      "A. $x = 2,\\ x = 3$",
      "B. $x = -2,\\ x = -3$",
      "C. $x = 1,\\ x = 6$",
      "D. $x = 5,\\ x = 1$",
    ],
    correct: 0,
    explanation:
      "Here $a=1,\\ b=-5,\\ c=6$. Discriminant: $b^2 - 4ac = 25 - 24 = 1$. So $x = \\frac{5 \\pm 1}{2}$, giving $x = 3$ and $x = 2$.",
  },
  {
    id: 8,
    subject: "Biology",
    topic: "Cell Processes",
    difficulty: 3,
    question_text:
      "The flowchart below shows the steps of **cellular respiration**. Which molecule is produced at step marked 2?\n\n```mermaid\nflowchart TD\n  A[\"Glucose C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>\"] -->|Glycolysis| B[\"Pyruvate x 2\"]\n  B -->|\"2. Pyruvate oxidation\"| C[\"Acetyl-CoA\"]\n  C -->|Krebs cycle| D[\"CO<sub>2</sub> + NADH + FADH<sub>2</sub>\"]\n  D -->|Electron transport| E[\"ATP + H<sub>2</sub>O\"]\n  style B fill:#fef9c3,stroke:#ca8a04\n  style C fill:#dcfce7,stroke:#16a34a\n```",
    options: [
      "A. Glucose",
      "B. ATP",
      "C. Acetyl-CoA",
      "D. FADH₂",
    ],
    correct: 2,
    explanation:
      "Pyruvate oxidation (step ②) converts pyruvate into **Acetyl-CoA** in the mitochondrial matrix, releasing $\\ce{CO2}$ and producing $\\ce{NADH}$. Acetyl-CoA then enters the Krebs cycle.",
  },
  {
    id: 9,
    subject: "Physics",
    topic: "Thermodynamics",
    difficulty: 4,
    question_text:
      "The second law of thermodynamics states that entropy of an isolated system never decreases:\n\n$$\\Delta S_{\\text{universe}} \\geq 0$$\n\nFor a reversible Carnot engine, the efficiency $\\eta$ is:\n\n$$\\eta = 1 - \\frac{T_C}{T_H}$$\n\nIf $T_H = 600\\text{ K}$ and $T_C = 300\\text{ K}$, what is the efficiency?",
    options: ["A. $25\\%$", "B. $33\\%$", "C. $50\\%$", "D. $75\\%$"],
    correct: 2,
    explanation:
      "$$\\eta = 1 - \\frac{300}{600} = 1 - 0.5 = 0.5 = 50\\%$$\n\nNo real engine can exceed Carnot efficiency, which depends only on the absolute temperatures of the reservoirs.",
  },
  {
    id: 10,
    subject: "Chemistry",
    topic: "Ionic Equations",
    difficulty: 3,
    question_text:
      "Which net ionic equation correctly represents the reaction between sulfuric acid and sodium hydroxide?\n\n$$\\ce{H2SO4(aq) + 2NaOH(aq) -> Na2SO4(aq) + 2H2O(l)}$$",
    options: [
      "A. $\\ce{H2SO4 + 2OH- -> SO4^2- + 2H2O}$",
      "B. $\\ce{H+ + OH- -> H2O}$",
      "C. $\\ce{2H+ + 2OH- -> 2H2O}$",
      "D. $\\ce{Na+ + OH- -> NaOH}$",
    ],
    correct: 1,
    explanation:
      "The net ionic equation cancels spectator ions ($\\ce{Na+}$, $\\ce{SO4^2-}$). Each $\\ce{H+}$ from the **strong acid** reacts with $\\ce{OH-}$ from the **strong base**: $\\ce{H+ + OH- -> H2O}$. This is neutralisation.",
  },
  {
    id: 11,
    subject: "Computer Science",
    topic: "Python",
    difficulty: 2,
    question_text:
      "What does the following Python expression evaluate to?\n\n`[x ** 2 for x in range(4)]`",
    options: [
      "A. `[1, 4, 9, 16]`",
      "B. `[0, 1, 4, 9]`",
      "C. `[0, 1, 2, 3]`",
      "D. `[4, 9, 16, 25]`",
    ],
    correct: 1,
    explanation:
      "`range(4)` generates `0, 1, 2, 3` (starts at **0**, not 1). Squaring each value produces `[0, 1, 4, 9]`. List comprehensions evaluate the expression `x ** 2` for every element yielded by the iterable.",
  },
  {
    id: 12,
    subject: "Computer Science",
    topic: "JavaScript",
    difficulty: 3,
    question_text:
      "What is printed to the console when this code runs?\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet(\"World\"));\n```",
    options: [
      "A. `Hello, name!`",
      "B. `Hello, World!`",
      "C. `Hello, ${name}!`",
      "D. `undefined`",
    ],
    correct: 1,
    explanation:
      "Template literals (backtick strings) interpolate expressions inside `${}`. When `greet(\"World\")` is called, `name` is `\"World\"`, so the template evaluates to `\"Hello, World!\"`. Option C would be the output only if a regular string `'Hello, ${name}!'` were used instead.",
  },
];

// ── Mermaid renderer ─────────────────────────────────────────────────────────
function MermaidChart({ chart }) {
  const ref = useRef();
  const uid = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    async function renderMermaid() {
      try {
        const normalized = String(chart || "")
          .replace(/\\n/g, "\n")
          .trim();
        if (!normalized) return;

        const renderId = `mermaid-${uid}-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, normalized);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError("");
        }
      } catch (err) {
        if (cancelled) return;
        if (ref.current) ref.current.innerHTML = "";
        setError(err?.message || "Failed to render diagram.");
      }
    }

    renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [chart, uid]);

  return (
    <div className="mermaid-wrap">
      <div ref={ref} />
      {error ? <p className="mermaid-error">{error}</p> : null}
    </div>
  );
}

// ── custom markdown components ────────────────────────────────────────────────
function buildComponents(darkMode) {
  return {
    img({ src, alt }) {
      return (
        <div className="img-wrap">
          <img src={src} alt={alt} className="md-img" />
          {alt && <p className="img-caption">{alt}</p>}
        </div>
      );
    },
    // eslint-disable-next-line no-unused-vars
    code({ children, className, node, ...rest }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1] || "";
      const raw = String(children).replace(/\n$/, "");
      if (lang === "mermaid") return <MermaidChart chart={raw.replace(/\\n/g, "\n").trim()} />;
      if (lang) return (
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          language={lang}
          style={darkMode ? oneDark : oneLight}
          customStyle={{ borderRadius: "8px", margin: "1rem 0", whiteSpace: "pre" }}
          codeTagProps={{ style: { whiteSpace: "pre", display: "block" } }}
        >
          {raw}
        </SyntaxHighlighter>
      );
      return <code {...rest} className={className}>{children}</code>;
    },
    p({ children }) {
      return <p className="md-p">{children}</p>;
    },
  };
}

// ── difficulty badge ──────────────────────────────────────────────────────────
const DIFF = ["", "Easy", "Medium", "Hard", "Expert", "Master"];
const DIFF_COLOR = ["", "easy", "medium", "hard", "expert", "master"];

// ── subject color ─────────────────────────────────────────────────────────────
const SUBJ_COLOR = {
  Physics: "#3b82f6",
  Chemistry: "#10b981",
  Mathematics: "#8b5cf6",
  Biology: "#f59e0b",
  "Computer Science": "#6366f1",
  API: "#0ea5e9",
};

// ── main component ────────────────────────────────────────────────────────────
export default function MockExam() {
  const [questions, setQuestions] = useState(
    () => LOCAL_QUESTIONS.map((q) => ({ ...q, source: "local" }))
  );
  const [apiStatus, setApiStatus] = useState("loading"); // loading | ok | error
  const [apiError, setApiError] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState({});
  const [revealed, setRevealed] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadApiQuestions() {
      setApiStatus("loading");
      setApiError("");
      try {
        const res = await fetch(API_QUESTIONS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.questions || [];
        const apiQs = raw.map(normalizeApiQuestion);
        if (cancelled) return;
        setQuestions([
          ...LOCAL_QUESTIONS.map((q) => ({ ...q, source: "local" })),
          ...apiQs,
        ]);
        setApiStatus("ok");
      } catch (err) {
        if (cancelled) return;
        setApiStatus("error");
        setApiError(err?.message || "Failed to load API questions");
        setQuestions(LOCAL_QUESTIONS.map((q) => ({ ...q, source: "local" })));
      }
    }

    loadApiQuestions();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = questions[current];
  const isAnswered = q && selected[q.id] !== undefined;
  const isRevealed = q && revealed[q.id];
  const score = submitted
    ? questions.filter((qq) => selected[qq.id] === qq.correct).length
    : null;

  function choose(idx) {
    if (!q || isRevealed) return;
    setSelected((s) => ({ ...s, [q.id]: idx }));
  }

  function reveal() {
    if (!q || !isAnswered) return;
    setRevealed((r) => ({ ...r, [q.id]: true }));
  }

  function submitExam() {
    const allAnswered = questions.every((qq) => selected[qq.id] !== undefined);
    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitted(true);
  }

  function restart() {
    setSelected({});
    setRevealed({});
    setSubmitted(false);
    setCurrent(0);
  }

  const mdProps = {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeRaw],
    components: buildComponents(darkMode),
  };

  return (
    <div className={`root${darkMode ? " dark" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          --bg: #f8f7f2;
          --surface: #ffffff;
          --surface2: #f1efe8;
          --border: #e5e2d9;
          --text: #1a1916;
          --text2: #6b6860;
          --text3: #9a9890;
          --accent: #d4542a;
          --accent2: #f0e8e0;
          --correct: #16a34a;
          --wrong: #dc2626;
          --correct-bg: #f0fdf4;
          --wrong-bg: #fef2f2;
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          padding: 2rem 1rem;
        }
        .root.dark {
          --bg: #111110;
          --surface: #1c1b19;
          --surface2: #252421;
          --border: #2e2c29;
          --text: #f0ede6;
          --text2: #9a9890;
          --text3: #6b6860;
          --accent: #e8724a;
          --accent2: #2a1f18;
          --correct-bg: #052e16;
          --wrong-bg: #2d0a0a;
        }

        .container { max-width: 780px; margin: 0 auto; }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 2rem;
        }
        .logo {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem; color: var(--accent);
          letter-spacing: -0.02em;
        }
        .logo span { color: var(--text); }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .dark-btn {
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text2); border-radius: 8px; padding: 6px 12px;
          font-size: 13px; cursor: pointer; font-family: inherit;
          transition: all 0.15s;
        }
        .dark-btn:hover { color: var(--text); border-color: var(--text3); }
        .score-pill {
          background: var(--accent); color: white;
          border-radius: 999px; padding: 6px 16px;
          font-size: 13px; font-weight: 600;
        }

        /* Progress */
        .progress-row {
          display: flex; gap: 4px; margin-bottom: 1.5rem; flex-wrap: wrap;
        }
        .prog-dot {
          width: 28px; height: 6px; border-radius: 3px;
          background: var(--border); cursor: pointer;
          transition: background 0.2s;
        }
        .prog-dot.active { background: var(--accent); }
        .prog-dot.done { background: var(--correct); }
        .prog-dot.wrong { background: var(--wrong); }
        .prog-dot.current { background: var(--accent); outline: 2px solid var(--accent); outline-offset: 2px; }

        /* Card */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
          background: var(--surface2);
        }
        .subj-pill {
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 999px; letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .topic { font-size: 13px; color: var(--text2); }
        .diff-badge {
          margin-left: auto; font-size: 11px; font-weight: 600;
          padding: 3px 10px; border-radius: 999px;
        }
        .diff-badge.easy { background: #dcfce7; color: #15803d; }
        .diff-badge.medium { background: #fef9c3; color: #a16207; }
        .diff-badge.hard { background: #ffedd5; color: #c2410c; }
        .diff-badge.expert { background: #fce7f3; color: #be185d; }
        .diff-badge.master { background: #ede9fe; color: #6d28d9; }
        .root.dark .diff-badge.easy { background: #14532d; color: #86efac; }
        .root.dark .diff-badge.medium { background: #422006; color: #fde68a; }
        .root.dark .diff-badge.hard { background: #431407; color: #fdba74; }

        .qnum {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: var(--text3);
        }

        .card-body { padding: 1.5rem; }

        /* Question text */
        .md-p { line-height: 1.75; color: var(--text); margin-bottom: 0.5rem; font-size: 15px; }
        .katex { font-size: 1.05em; }
        .katex-display { margin: 1rem 0 !important; overflow-x: auto; }

        /* Image embed */
        .img-wrap { margin: 1rem 0; }
        .md-img {
          max-width: 100%; border-radius: 10px;
          border: 1px solid var(--border);
          display: block;
        }
        .img-caption {
          font-size: 12px; color: var(--text3); margin-top: 6px;
          font-style: italic;
        }

        /* Mermaid */
        .mermaid-wrap {
          margin: 1rem 0; overflow-x: auto;
          background: var(--surface2); border-radius: 10px;
          padding: 1rem; border: 1px solid var(--border);
        }
        .mermaid-wrap svg { max-width: 100%; height: auto; }
        .mermaid-error {
          margin-top: 0.75rem;
          color: var(--wrong);
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          white-space: pre-wrap;
        }

        /* Options */
        .options { display: flex; flex-direction: column; gap: 10px; margin-top: 1.5rem; }
        .option {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 16px; border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--surface); cursor: pointer;
          transition: all 0.15s; font-size: 14px;
          line-height: 1.5; color: var(--text);
        }
        .option:hover:not(.disabled) {
          border-color: var(--accent); background: var(--accent2);
        }
        .option.selected { border-color: var(--accent); background: var(--accent2); }
        .option.correct { border-color: var(--correct); background: var(--correct-bg); }
        .option.wrong { border-color: var(--wrong); background: var(--wrong-bg); }
        .option.disabled { cursor: default; }
        .opt-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; font-weight: 600;
          min-width: 22px; height: 22px;
          border-radius: 6px; background: var(--surface2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: var(--text2);
          border: 1px solid var(--border);
          margin-top: 1px;
        }
        .option.selected .opt-key { background: var(--accent); color: white; border-color: var(--accent); }
        .option.correct .opt-key { background: var(--correct); color: white; border-color: var(--correct); }
        .option.wrong .opt-key { background: var(--wrong); color: white; border-color: var(--wrong); }

        /* Explanation */
        .explanation {
          margin-top: 1.5rem; padding: 1rem 1.25rem;
          border-radius: 10px; border-left: 3px solid var(--correct);
          background: var(--correct-bg);
          font-size: 14px; line-height: 1.7;
        }
        .explanation .md-p { font-size: 14px; color: var(--text); margin-bottom: 0; }
        .explanation strong { color: var(--correct); }
        .expl-title {
          font-size: 11px; font-weight: 600; color: var(--correct);
          text-transform: uppercase; letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        /* Footer */
        .card-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; background: var(--surface2);
        }
        .btn {
          padding: 8px 20px; border-radius: 8px; font-size: 14px;
          font-weight: 500; cursor: pointer; font-family: inherit;
          border: 1.5px solid var(--border); transition: all 0.15s;
          background: var(--surface); color: var(--text);
        }
        .btn:hover { border-color: var(--text3); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary {
          background: var(--accent); color: white; border-color: var(--accent);
        }
        .btn-primary:hover { opacity: 0.9; }
        .btn-ghost {
          background: transparent; border-color: transparent;
          color: var(--text2);
        }
        .btn-ghost:hover { color: var(--text); background: var(--surface2); }

        /* Result screen */
        .result-screen {
          text-align: center; padding: 3rem 2rem;
        }
        .result-score {
          font-family: 'DM Serif Display', serif;
          font-size: 5rem; color: var(--accent);
          line-height: 1;
        }
        .result-label { font-size: 14px; color: var(--text2); margin-top: 8px; margin-bottom: 2rem; }
        .result-grid {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 8px; margin-bottom: 2rem;
        }
        .result-item {
          padding: 10px 6px; border-radius: 10px;
          border: 1.5px solid var(--border); font-size: 12px;
          text-align: center; cursor: pointer; transition: all 0.15s;
        }
        .result-item:hover { border-color: var(--text2); }
        .result-item.c { border-color: var(--correct); background: var(--correct-bg); }
        .result-item.w { border-color: var(--wrong); background: var(--wrong-bg); }
        .result-item-num { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 13px; }
        .result-item-subj { color: var(--text3); margin-top: 3px; font-size: 11px; }

        code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; }

        .api-status {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 1rem; font-size: 12px; color: var(--text2);
          padding: 8px 12px; border-radius: 8px;
          background: var(--surface); border: 1px solid var(--border);
        }
        .api-status.ok { border-color: #86efac; color: #15803d; }
        .api-status.error { border-color: #fca5a5; color: #b91c1c; }
        .api-status.loading { border-color: #93c5fd; color: #1d4ed8; }
        .root.dark .api-status.ok { border-color: #166534; color: #86efac; }
        .root.dark .api-status.error { border-color: #7f1d1d; color: #fca5a5; }
        .root.dark .api-status.loading { border-color: #1e3a8a; color: #93c5fd; }

        .source-tag {
          font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 999px; letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .source-tag.api {
          background: #e0f2fe; color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .source-tag.local {
          background: var(--surface); color: var(--text3);
          border: 1px solid var(--border);
        }
        .root.dark .source-tag.api {
          background: #0c4a6e; color: #7dd3fc; border-color: #0369a1;
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="logo">Exam<span>Lab</span></div>
          <div className="header-right">
            {submitted && score !== null && (
              <div className="score-pill">{score}/{questions.length}</div>
            )}
            <button className="dark-btn" onClick={() => setDarkMode((d) => !d)}>
              {darkMode ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </div>

        <div className={`api-status ${apiStatus}`}>
          {apiStatus === "loading" && "Loading questions from /api/questions/…"}
          {apiStatus === "ok" &&
            `API connected — ${questions.filter((qq) => qq.source === "api").length} tagged API questions loaded (plus ${LOCAL_QUESTIONS.length} local)`}
          {apiStatus === "error" && `API unavailable (${apiError}) — showing local questions only`}
        </div>

        {/* Progress dots */}
        <div className="progress-row">
          {questions.map((qq, i) => {
            let cls = "prog-dot";
            if (i === current) cls += " current";
            else if (submitted) {
              cls += selected[qq.id] === qq.correct ? " done" : " wrong";
            } else if (selected[qq.id] !== undefined) {
              cls += " done";
            }
            return (
              <div
                key={qq.id}
                className={cls}
                onClick={() => setCurrent(i)}
                title={`Q${i + 1}${qq.source === "api" ? " (API)" : ""}`}
              />
            );
          })}
        </div>

        {/* Result screen */}
        {submitted ? (
          <div className="card">
            <div className="result-screen">
              <div className="result-score">{score}</div>
              <div className="result-label">out of {questions.length} correct</div>
              <div className="result-grid">
                {questions.map((qq, i) => (
                  <div
                    key={qq.id}
                    className={`result-item ${selected[qq.id] === qq.correct ? "c" : "w"}`}
                    onClick={() => { setSubmitted(false); setCurrent(i); }}
                  >
                    <div className="result-item-num">Q{i + 1}</div>
                    <div className="result-item-subj">
                      {qq.source === "api" ? "API" : qq.subject}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={restart}>
                Restart
              </button>
            </div>
          </div>
        ) : !q ? (
          <div className="card">
            <div className="result-screen">
              <div className="result-label">No questions available.</div>
            </div>
          </div>
        ) : (
          <div className="card">
            {/* Card header */}
            <div className="card-header">
              <span
                className="subj-pill"
                style={{
                  background: (SUBJ_COLOR[q.subject] || "#64748b") + "22",
                  color: SUBJ_COLOR[q.subject] || "#64748b",
                }}
              >
                {q.subject}
              </span>
              <span className="topic">{q.topic}</span>
              <span className={`source-tag ${q.source === "api" ? "api" : "local"}`}>
                {q.source === "api" ? "API" : "Local"}
              </span>
              <span className={`diff-badge ${DIFF_COLOR[q.difficulty]}`}>
                {DIFF[q.difficulty]}
              </span>
              <span className="qnum" style={{ marginLeft: 8 }}>
                {current + 1}/{questions.length}
              </span>
            </div>

            {/* Question body */}
            <div className="card-body">
              <ReactMarkdown {...mdProps}>{q.question_text}</ReactMarkdown>

              {/* Options */}
              <div className="options">
                {q.options.map((opt, i) => {
                  let cls = "option";
                  if (isRevealed) {
                    cls += " disabled";
                    if (i === q.correct) cls += " correct";
                    else if (i === selected[q.id] && i !== q.correct) cls += " wrong";
                  } else if (selected[q.id] === i) {
                    cls += " selected";
                  }
                  return (
                    <div key={i} className={cls} onClick={() => choose(i)}>
                      <span className="opt-key">{["A","B","C","D"][i]}</span>
                      <span>
                        <ReactMarkdown {...mdProps}
                          components={{
                            ...buildComponents(darkMode),
                            p: ({ children }) => <span>{children}</span>,
                          }}
                        >
                          {opt.replace(/^[A-D]\.\s/, "")}
                        </ReactMarkdown>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {isRevealed && (
                <div className="explanation">
                  <div className="expl-title">Explanation</div>
                  <ReactMarkdown {...mdProps}>{q.explanation}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="card-footer">
              <button
                className="btn btn-ghost"
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
              >
                ← Prev
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                {!isRevealed && (
                  <button
                    className="btn"
                    disabled={!isAnswered}
                    onClick={reveal}
                  >
                    Check answer
                  </button>
                )}
                {current < questions.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrent((c) => c + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={submitExam}>
                    Submit exam
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
