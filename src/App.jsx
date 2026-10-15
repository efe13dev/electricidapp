import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CircuitCard, Device, DeviceMini, displayName } from "./Device.jsx";
import { Explain } from "./Explain.jsx";
import { Guide } from "./Guide.jsx";
import {
  CATALOG,
  CIRCUITS,
  chainOf,
  circuitByKey,
  denoise,
  faultyPins,
  issues,
  MAX_PTS,
  NAME_MAX,
  PER_ROW_OPTIONS,
  packComponents,
  pinOwner,
  pinPole,
  RATINGS,
  ROW_OPTIONS,
  STORAGE_KEY,
  SUPPLY,
  sectionFor,
  sectionOf,
  simplify,
  smoothPath,
  topology,
  typicalProject,
  validateProject,
} from "./model.js";

const CATEGORIES = ["Todos", "Protección general", "Circuitos"];
const ISSUE_LEVELS = [
  {
    level: "danger",
    icon: "⚠",
    chip: "Peligro",
    plural: ["peligro", "peligros"],
  },
  {
    level: "warn",
    icon: "!",
    chip: "Revisar",
    plural: ["a revisar", "a revisar"],
  },
  {
    level: "info",
    icon: "i",
    chip: "Pendiente",
    plural: ["pendiente", "pendientes"],
  },
];
const DEFAULT_NAME = "Mi cuadro";
const DISCLAIMER =
  "Diseño orientativo: no valida el cumplimiento del REBT ni sustituye el proyecto o la verificación de un profesional.";
const WIRE_DISCLAIMER =
  "Esquema didáctico simplificado. Secciones orientativas (cobre, PVC, en tubo empotrado; ITC-BT-19/25): comprueba longitud, caída de tensión y método de instalación. No valida el REBT.";
const DEFAULT_RATINGS = {
  iga: { currentA: 40 },
  id: { currentA: 40, sensitivitymA: 30 },
  pia: { currentA: 16 },
  spd: { dischargeKA: 20 },
};

const STEPS = [
  {
    title: "El interruptor general (IGA)",
    text: "Es lo primero que se coloca: por él entra toda la electricidad de la casa. Añádelo desde el catálogo. Luego arrastra un cable desde cada borne de «Llega del contador» hasta la entrada del IGA.",
    done: (p) => p.components.some((c) => c.type === "iga"),
    target: { type: "iga" },
  },
  {
    title: "Protector de sobretensiones (opcional)",
    text: "Protege tus aparatos de picos de tensión como los de los rayos. Puedes añadirlo o saltar este paso.",
    optional: true,
    done: (p) => p.components.some((c) => c.type === "spd"),
    target: { type: "spd" },
  },
  {
    title: "El diferencial (ID)",
    text: "Te protege a ti: corta si la corriente se escapa, por ejemplo, a través de una persona. Colócalo después del IGA y aliméntalo desde la salida del IGA.",
    done: (p) => p.components.some((c) => c.type === "id"),
    target: { type: "id" },
  },
  ...CIRCUITS.slice(0, 5).map((k) => ({
    title: `${k.key}: ${k.name}`,
    text: `${k.desc} Se protege con un magnetotérmico de ${k.currentA} A y cable de ${sectionFor(k.currentA)} mm². Dibuja sus cables desde la salida del diferencial o puentéalo desde otro magnetotérmico.`,
    done: (p) => {
      const byId = new Map(p.components.map((c) => [c.id, c]));
      const topo = topology(p.components, p.wires);
      return p.components.some(
        (c) =>
          c.type === "pia" &&
          c.circuit === k.key &&
          byId.get(topo.get(c.id))?.type === "id",
      );
    },
    target: { type: "pia", circuit: k.key },
  })),
  {
    title: "¡Cuadro montado!",
    text: "Ya tienes los circuitos básicos de una vivienda. Toca cada aparato para repasar qué hace.",
    done: () => false,
    final: true,
  },
];
function newProject() {
  return {
    version: 5,
    name: DEFAULT_NAME,
    rows: 1,
    perRow: 18,
    components: [],
    wires: [],
  };
}

// el trazo a mano alzada se recoloca con una semejanza para que acabe en sus bornes
function wireD(w, A, B) {
  if (w.pts.length < 2)
    return smoothPath([
      [A.x, A.y],
      [B.x, B.y],
    ]);
  const [[x0, y0]] = w.pts;
  const [xn, yn] = w.pts.at(-1);
  const dx = xn - x0;
  const dy = yn - y0;
  const n2 = dx * dx + dy * dy;
  const sx = B.x - A.x;
  const sy = B.y - A.y;
  const [sr, si] =
    n2 < 1 ? [1, 0] : [(sx * dx + sy * dy) / n2, (sy * dx - sx * dy) / n2];
  return smoothPath(
    w.pts.map(([x, y]) => {
      const u = x - x0;
      const v = y - y0;
      return [A.x + u * sr - v * si, A.y + u * si + v * sr];
    }),
  );
}

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { project: typicalProject(), warning: null };
    const obj = JSON.parse(raw);
    const parsed = validateProject(obj);
    if (parsed) return { project: parsed, warning: null };
    return {
      project: newProject(),
      warning:
        "No se pudo recuperar el proyecto guardado (datos incompatibles o corruptos). Se conserva el dato original hasta que hagas un cambio.",
    };
  } catch {
    return {
      project: newProject(),
      warning:
        "No se pudo leer el proyecto guardado. Los datos no recuperados se sustituirán al editar.",
    };
  }
}

export default function App() {
  const [restored] = useState(loadProject);
  const [project, setProject] = useState(restored.project);
  const [edited, setEdited] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("builder");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [notice, setNotice] = useState(null);
  const [alert, setAlert] = useState(null);
  const [saveState, setSaveState] = useState("pending");
  const [ratingsSel, setRatingsSel] = useState(DEFAULT_RATINGS);
  const [circuitSel, setCircuitSel] = useState("C1");
  const [guideStep, setGuideStep] = useState(null);
  const [paths, setPaths] = useState({});
  const [drawing, setDrawing] = useState(false);
  const [trace, setTrace] = useState(null);
  const innerRef = useRef(null);
  const stroke = useRef(null);

  const mustEditBeforeSave = Boolean(restored.warning);

  useEffect(() => {
    if (mustEditBeforeSave && !edited) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      setSaveState("ok");
    } catch {
      setSaveState("fail");
    }
  }, [project, edited, mustEditBeforeSave]);

  const layout = useMemo(
    () => packComponents(project.components, project.rows, project.perRow),
    [project],
  );
  const rowsOf = useMemo(() => layout ?? [], [layout]);
  const ordinals = useMemo(() => {
    const m = new Map();
    const n = {};
    for (const c of project.components) {
      n[c.type] = (n[c.type] ?? 0) + 1;
      m.set(c.id, n[c.type]);
    }
    return m;
  }, [project.components]);
  const occupied = project.components.reduce((s, c) => s + c.modules, 0);
  const total = project.rows * project.perRow;
  const selectedIndex = project.components.findIndex(
    (c) => c.id === selectedId,
  );
  const selected =
    selectedIndex >= 0 ? project.components[selectedIndex] : null;
  const byId = useMemo(
    () => new Map(project.components.map((c) => [c.id, c])),
    [project.components],
  );
  const topo = useMemo(
    () => topology(project.components, project.wires),
    [project.components, project.wires],
  );
  const warnings = useMemo(() => issues(project), [project]);
  const faulty = useMemo(() => faultyPins(project.wires), [project.wires]);

  const pathSet = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected.id, ...chainOf(selected.id, topo)]);
    for (const c of project.components) {
      if (chainOf(c.id, topo).includes(selected.id)) s.add(c.id);
    }
    return s;
  }, [selected, topo, project.components]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || view !== "builder") return;
    const measure = () => {
      const r = inner.getBoundingClientRect();
      const rect = (el) => {
        const b = el.getBoundingClientRect();
        return {
          x: b.left - r.left + b.width / 2,
          y: b.top - r.top + b.height / 2,
          left: b.left - r.left,
          right: b.right - r.left,
          top: b.top - r.top,
          bottom: b.bottom - r.top,
        };
      };
      const pos = {};
      for (const el of inner.querySelectorAll("[data-pin]")) {
        pos[el.dataset.pin] = rect(el);
      }
      const strips = [...inner.querySelectorAll(".earth-strip")].map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.left - r.left + 8, y: b.top - r.top + b.height / 2 };
      });

      // coloca la pastilla "Llega del contador" justo encima del primer IGA
      const iga = project.components.find((c) => c.type === "iga");
      const igaIn = iga && pos[`${iga.id}-inL`];
      const igaInN = iga && pos[`${iga.id}-inN`];
      const supEl = inner.querySelector(".supply");
      if (supEl) {
        const mid =
          igaIn && igaInN
            ? (igaIn.x + igaInN.x) / 2
            : (igaIn?.x ?? supEl.getBoundingClientRect().width / 2 + 6);
        const w = supEl.getBoundingClientRect().width;
        inner.style.setProperty("--supply-x", `${Math.max(6, mid - w / 2)}px`);
      }
      for (const k of ["L", "N"]) {
        const el = inner.querySelector(`[data-pin="supply-${k}"]`);
        if (el) pos[`supply-${k}`] = rect(el);
      }
      const earth = pos["earth-PE"];
      const PE_X = 2;
      const edges = [];

      for (const c of project.components.filter((x) => x.type === "pia")) {
        for (const k of ["L", "N"]) {
          const out = pos[`${c.id}-out${k}`];
          const card = pos[`${c.id}-card${k}`];
          if (out && card) {
            edges.push({
              d: `M ${out.x} ${out.y} V ${card.y - 4}`,
              kind: k,
              touch: [c.id],
            });
          }
        }
      }

      // una línea de tierra por cada regleta de cada fila hasta la barra PE
      if (earth) {
        for (const s of strips) {
          edges.push({
            d: `M ${s.x} ${s.y} H ${PE_X} V ${earth.y} H ${earth.x}`,
            kind: "PE",
            touch: [SUPPLY],
          });
        }
      }

      setPaths({
        edges,
        pos,
        w: inner.scrollWidth,
        h: inner.scrollHeight,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [project, view]);

  // guía paso a paso: avanza solo al cumplirse el paso
  useEffect(() => {
    if (guideStep === null) return;
    const step = STEPS[guideStep];
    if (!step || step.final) return;
    if (step.done(project)) {
      setGuideStep((s) => (s !== null && s < STEPS.length - 1 ? s + 1 : s));
    }
  }, [project, guideStep]);

  useEffect(() => {
    if (guideStep === null) return;
    const step = STEPS[guideStep];
    if (!step?.target) return;
    if (step.target.circuit) setCircuitSel(step.target.circuit);
    document
      .querySelector(`.card[data-type="${step.target.type}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [guideStep]);

  function apply(next) {
    setEdited(true);
    setProject(next);
  }

  function commit(next) {
    if (!packComponents(next.components, next.rows, next.perRow)) {
      setNotice("No cabe: el cambio dejaría componentes fuera del cuadro.");
      return false;
    }
    setNotice(null);
    apply(next);
    return true;
  }

  function addComponent(cat) {
    const sel = ratingsSel[cat.type];
    const circ = cat.type === "pia" ? circuitByKey(circuitSel) : null;
    const c = {
      id: crypto.randomUUID(),
      type: cat.type,
      label: circ ? circ.name : "",
      modules: cat.modules,
      currentA: circ?.currentA ?? sel.currentA ?? null,
      sensitivitymA: sel.sensitivitymA ?? null,
      dischargeKA: sel.dischargeKA ?? null,
      circuit: circ?.key ?? null,
    };
    const next = { ...project, components: [...project.components, c] };
    if (commit(next)) setSelectedId(c.id);
  }

  function patchSelected(patch) {
    if (!selected) return;
    commit({
      ...project,
      components: project.components.map((c) =>
        c.id === selected.id ? { ...c, ...patch } : c,
      ),
    });
  }

  function moveSelected(dir) {
    const j = selectedIndex + dir;
    if (selectedIndex < 0 || j < 0 || j >= project.components.length) return;
    const comps = [...project.components];
    [comps[selectedIndex], comps[j]] = [comps[j], comps[selectedIndex]];
    if (!commit({ ...project, components: comps })) {
      setNotice("No se puede reordenar: la distribución dejaría de caber.");
    }
  }

  function removeSelected() {
    if (!selected) return;
    const own = (pin) => pinOwner(pin) === selected.id;
    commit({
      ...project,
      components: project.components.filter((c) => c.id !== selected.id),
      wires: project.wires.filter((w) => !own(w.a) && !own(w.b)),
    });
    setSelectedId(null);
  }

  const boardPoint = (e) => {
    const r = innerRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const pinAt = ([x, y]) => {
    let best = null;
    let bestD = 14;
    for (const [pin, q] of Object.entries(paths.pos ?? {})) {
      const d = Math.hypot(q.x - x, q.y - y);
      if (!pin.includes("-card") && d <= bestD) {
        best = pin;
        bestD = d;
      }
    }
    return best;
  };

  function boardDown(e) {
    const p = boardPoint(e);
    const a = pinAt(p);
    if (a) {
      e.currentTarget.setPointerCapture(e.pointerId);
      stroke.current = { a, pts: [p] };
      setTrace(stroke.current);
    } else if (!drawing) {
      if (!e.target.closest(".device, .circuit-card")) setSelectedId(null);
    } else {
      const hit = e.target.closest("[data-wire]");
      if (hit) {
        setAlert(null);
        apply({
          ...project,
          wires: project.wires.filter((w) => w.id !== hit.dataset.wire),
        });
      }
    }
  }

  function boardMove(e) {
    const s = stroke.current;
    if (!s) return;
    const p = boardPoint(e);
    const last = s.pts.at(-1);
    if (
      s.pts.length < MAX_PTS &&
      Math.hypot(p[0] - last[0], p[1] - last[1]) >= 3
    ) {
      s.pts.push(p);
      setTrace({ ...s });
    }
  }

  function boardCancel() {
    stroke.current = null;
    setTrace(null);
  }

  function boardUp(e) {
    const s = stroke.current;
    boardCancel();
    if (!s) return;
    const b = pinAt(boardPoint(e));
    if (b && b !== s.a) {
      const next = {
        ...project,
        wires: [
          ...project.wires,
          {
            id: crypto.randomUUID(),
            a: s.a,
            b,
            pts: simplify(denoise(s.pts), 3),
          },
        ],
      };
      const before = new Set(warnings.map((i) => i.text));
      const added = issues(next).filter(
        (i) => !before.has(i.text) && i.level !== "info",
      );
      if (added.length) {
        setAlert({
          level: added.some((i) => i.level === "danger") ? "danger" : "warn",
          items: added.map((i) => i.text),
        });
      } else if (faultyPins(next.wires).has(s.a)) {
        setAlert({
          level: "danger",
          items: ["Este cable crea un fallo en la instalación."],
        });
      } else {
        setAlert(null);
      }
      setNotice(null);
      apply(next);
    } else if (s.pts.length > 1) {
      setNotice(
        "Suelta el cable encima de un borne (los círculos de colores) para conectarlo.",
      );
    }
  }

  function setLayoutOption(key, value) {
    const next = { ...project, [key]: value };
    if (!commit(next)) {
      setNotice("No se puede aplicar: los componentes actuales no cabrían.");
    }
  }

  function loadTypical() {
    if (
      project.components.length > 0 &&
      !window.confirm(
        "Se sustituirá el cuadro actual por el cuadro típico. ¿Continuar?",
      )
    ) {
      return;
    }
    setGuideStep(null);
    setSelectedId(null);
    setAlert(null);
    apply(typicalProject());
  }

  function startGuide() {
    if (
      project.components.length > 0 &&
      !window.confirm(
        "Se vaciará el cuadro actual para montarlo desde cero. ¿Continuar?",
      )
    ) {
      return;
    }
    setSelectedId(null);
    setAlert(null);
    apply({ ...newProject(), name: "Mi cuadro paso a paso" });
    setGuideStep(0);
  }

  const filtered = CATALOG.filter(
    (c) =>
      (category === "Todos" || c.category === category) &&
      `${c.name} ${c.abbr}`.toLowerCase().includes(search.toLowerCase()),
  );

  const chainFor = (c) => {
    const chain = chainOf(c.id, topo)
      .map((p) =>
        p === SUPPLY ? "Contador" : displayName(byId.get(p), ordinals),
      )
      .reverse();
    if (chain.length === 0) return null;
    return `${chain.join(" → ")} → aquí`;
  };

  const saveText =
    saveState === "fail"
      ? "No se pudo guardar"
      : saveState === "ok"
        ? "Guardado local"
        : mustEditBeforeSave
          ? "Guardado en pausa"
          : "…";

  const step = guideStep !== null ? STEPS[guideStep] : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" fill="#157a63" />
            <rect x="7" y="6" width="10" height="2" rx="1" fill="#f7f3ec" />
            <rect x="7" y="10" width="10" height="2" rx="1" fill="#f7f3ec" />
            <rect x="7" y="14" width="10" height="2" rx="1" fill="#f7f3ec" />
          </svg>
          <div>
            <h1>Cuadro</h1>
            <input
              className="project-name"
              value={project.name}
              maxLength={NAME_MAX}
              aria-label="Nombre del proyecto"
              onChange={(e) => apply({ ...project, name: e.target.value })}
            />
          </div>
        </div>
        <nav className="views" aria-label="Vistas">
          <button
            type="button"
            className={view === "builder" ? "active" : ""}
            aria-pressed={view === "builder"}
            onClick={() => setView("builder")}
          >
            Constructor
          </button>
          <button type="button" onClick={loadTypical}>
            Cuadro típico
          </button>
          <button
            type="button"
            className={guideStep !== null ? "active" : ""}
            onClick={startGuide}
          >
            Montar paso a paso
          </button>
          <button
            type="button"
            className={view === "guia" ? "active" : ""}
            aria-pressed={view === "guia"}
            onClick={() => setView("guia")}
          >
            Guía rápida
          </button>
          <button type="button" onClick={() => window.print()}>
            Imprimir
          </button>
        </nav>
        <span
          className={`save ${saveState}`}
          role={saveState === "fail" ? "alert" : "status"}
        >
          {saveText}
        </span>
      </header>

      {restored.warning && !edited && (
        <p className="notice" role="alert">
          {restored.warning}
        </p>
      )}

      {view === "guia" ? (
        <Guide />
      ) : (
        <main className="workbench">
          <aside className="catalog">
            <h2>Catálogo</h2>
            <input
              type="search"
              placeholder="Buscar (nombre o siglas)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar componentes"
            />
            <fieldset className="pills" aria-label="Filtrar por categoría">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={category === cat ? "active" : ""}
                  aria-pressed={category === cat}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </fieldset>
            <p className="hint">
              Valores iniciales de ejemplo; no calculados para tu instalación.
            </p>
            {filtered.map((c) => (
              <div
                key={c.type}
                className={`card${step?.target?.type === c.type ? " target" : ""}`}
                data-type={c.type}
              >
                <div className="card-head">
                  <DeviceMini modules={c.modules} type={c.type} />
                  <span>
                    <strong>
                      {c.name} ({c.abbr})
                    </strong>
                  </span>
                </div>
                <div className="card-ratings">
                  {c.type === "pia" && (
                    <label>
                      Circuito
                      <select
                        value={circuitSel}
                        onChange={(e) => setCircuitSel(e.target.value)}
                      >
                        {CIRCUITS.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.key === "otro" ? k.name : `${k.key} · ${k.name}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {Object.entries(RATINGS[c.type]).map(([field, opts]) => (
                    <label key={field}>
                      {field === "currentA"
                        ? "In (A)"
                        : field === "sensitivitymA"
                          ? "IΔn (mA)"
                          : "Imax (8/20 µs, kA)"}
                      <select
                        value={ratingsSel[c.type][field]}
                        onChange={(e) =>
                          setRatingsSel({
                            ...ratingsSel,
                            [c.type]: {
                              ...ratingsSel[c.type],
                              [field]: Number(e.target.value),
                            },
                          })
                        }
                      >
                        {opts.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="card-actions">
                  <span className="mods">{c.modules} mód. (editable)</span>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => addComponent(c)}
                  >
                    Añadir
                  </button>
                </div>
                <details>
                  <summary>Más información</summary>
                  <p>{c.desc}</p>
                </details>
              </div>
            ))}
            {filtered.length === 0 && <p className="hint">Sin resultados.</p>}
          </aside>

          <section className="panel-zone">
            <div className="panel-controls">
              <label>
                Filas
                <select
                  value={project.rows}
                  onChange={(e) =>
                    setLayoutOption("rows", Number(e.target.value))
                  }
                >
                  {ROW_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Módulos por fila
                <select
                  value={project.perRow}
                  onChange={(e) =>
                    setLayoutOption("perRow", Number(e.target.value))
                  }
                >
                  {PER_ROW_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-pressed={drawing}
                onClick={() => setDrawing(!drawing)}
              >
                Editar cables
              </button>
              <span className="count" aria-live="polite">
                Ocupados {occupied} · Libres {total - occupied} (ajuste físico)
              </span>
            </div>
            {drawing ? (
              <p className="hint">
                Arrastra desde un borne hasta otro para tender un cable. Toca un
                cable para borrarlo.
              </p>
            ) : (
              <p className="hint">
                Arrastra desde un borne (círculo de color) hasta otro para
                tender un cable. Activa «Editar cables» para borrar cables.
              </p>
            )}
            {step && (
              <div className="guide-banner" role="status">
                <div>
                  <strong>
                    Paso {guideStep + 1} de {STEPS.length}: {step.title}
                  </strong>
                  <p>{step.text}</p>
                </div>
                <div className="guide-banner-actions">
                  {step.final ? (
                    <button type="button" onClick={() => setGuideStep(null)}>
                      Terminar
                    </button>
                  ) : (
                    <>
                      {step.optional && (
                        <button
                          type="button"
                          onClick={() => setGuideStep(guideStep + 1)}
                        >
                          Saltar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={guideStep === 0}
                        onClick={() => setGuideStep(guideStep - 1)}
                      >
                        Atrás
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => setGuideStep(null)}>
                    Salir de la guía
                  </button>
                </div>
              </div>
            )}
            {project.components.length === 0 && (
              <p className="hint empty-hint">
                Cuadro vacío. Añade componentes desde el catálogo o pulsa
                «Cuadro típico» para ver una vivienda normal.
              </p>
            )}
            <div className={`enclosure${alert ? ` alert-${alert.level}` : ""}`}>
              <div
                className={`board-inner${drawing ? " drawing" : ""}`}
                ref={innerRef}
                onPointerDown={boardDown}
                onPointerMove={boardMove}
                onPointerUp={boardUp}
                onPointerCancel={boardCancel}
              >
                <div className="supply">
                  Llega del contador
                  <span className="pins" aria-hidden="true">
                    <i data-pin="supply-L" className="borne L" />
                    <i data-pin="supply-N" className="borne N" />
                  </span>
                </div>
                <svg
                  className="wires"
                  width={paths.w ?? 0}
                  height={paths.h ?? 0}
                  aria-hidden="true"
                >
                  {(paths.edges ?? []).map((e) => {
                    const lit = pathSet && e.touch.every((t) => pathSet.has(t));
                    const cls = `wire ${e.kind}${lit ? " lit flow" : pathSet ? " dim" : ""}`;
                    return (
                      <g key={e.d}>
                        <path d={e.d} className="wire-bg" />
                        <path
                          d={e.d}
                          className={e.kind === "PE" ? `${cls} pe-base` : cls}
                        />
                        {e.kind === "PE" && (
                          <path d={e.d} className={`${cls} pe-stripe`} />
                        )}
                      </g>
                    );
                  })}
                  {project.wires.map((w) => {
                    const A = paths.pos?.[w.a];
                    const B = paths.pos?.[w.b];
                    if (!A || !B) return null;
                    const d = wireD(w, A, B);
                    const pole = pinPole(w.a);
                    const lit =
                      pathSet?.has(pinOwner(w.a)) && pathSet.has(pinOwner(w.b));
                    const bad = faulty.has(w.a);
                    const cls = `wire ${pole}${lit ? " lit flow" : pathSet ? " dim" : ""}${bad ? " bad" : ""}`;
                    return (
                      <g key={w.id}>
                        <path d={d} className="wire-bg" />
                        <path
                          d={d}
                          className={pole === "PE" ? `${cls} pe-base` : cls}
                        />
                        {pole === "PE" && !bad && (
                          <path d={d} className={`${cls} pe-stripe`} />
                        )}
                        <path d={d} data-wire={w.id} className="wire-hit" />
                      </g>
                    );
                  })}
                  {trace && (
                    <path
                      d={smoothPath(trace.pts)}
                      className={`wire ${pinPole(trace.a)}`}
                    />
                  )}
                </svg>
                {rowsOf.map((row, ri) => {
                  const used = row.reduce((s, c) => s + c.modules, 0);
                  const free = Array.from(
                    { length: project.perRow - used },
                    (_, i) => used + i + 1,
                  );
                  return (
                    <div className="row-block" key={row[0]?.id ?? `fila-${ri}`}>
                      <div
                        className="din-row"
                        style={{ "--per": project.perRow }}
                      >
                        <span className="rail" aria-hidden="true" />
                        {row.map((c) => (
                          <Device
                            key={c.id}
                            comp={c}
                            ordinals={ordinals}
                            selected={c.id === selectedId}
                            dim={pathSet !== null && !pathSet.has(c.id)}
                            onClick={() => setSelectedId(c.id)}
                            components={project.components}
                          />
                        ))}
                        {free.map((p) => (
                          <span className="slot" key={p}>
                            {p}
                          </span>
                        ))}
                      </div>
                      <div
                        className="circuits-row"
                        style={{ "--per": project.perRow }}
                      >
                        {row.map((c) =>
                          c.type === "pia" ? (
                            <CircuitCard
                              key={c.id}
                              comp={c}
                              style={{ "--w": c.modules }}
                              section={sectionOf(c, project.components)}
                              selected={c.id === selectedId}
                              dim={pathSet !== null && !pathSet.has(c.id)}
                              onClick={() => setSelectedId(c.id)}
                            />
                          ) : (
                            <span
                              key={c.id}
                              className="card-spacer"
                              style={{ "--w": c.modules }}
                            />
                          ),
                        )}
                      </div>
                      {rowsOf.length > 1 && (
                        <div className="earth-strip" aria-hidden="true">
                          PE
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pe-bar">
                  <span className="earth-pin" data-pin="earth-PE" />
                  PE · barra de tierra
                </div>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="sw l" aria-hidden="true" /> Marrón: fase (L)
              </span>
              <span>
                <i className="sw n" aria-hidden="true" /> Azul: neutro (N)
              </span>
              <span>
                <i className="sw pe" aria-hidden="true" /> Verde-amarillo:
                tierra (PE)
              </span>
              <span className="legend-note">
                Puente: un cable entre las entradas de dos magnetotérmicos
                reparte la corriente, como un peine
              </span>
            </div>
            <p className="hint">{WIRE_DISCLAIMER}</p>
          </section>

          <aside className="explain-col">
            <section className="inspector" aria-label="Detalle">
              {selected ? (
                <Explain
                  comp={selected}
                  ordinals={ordinals}
                  project={project}
                  topo={topo}
                  chainFor={chainFor}
                  selectedIndex={selectedIndex}
                  patchSelected={patchSelected}
                  moveSelected={moveSelected}
                  removeSelected={removeSelected}
                  setWires={(wires) => {
                    setAlert(null);
                    apply({ ...project, wires });
                  }}
                  total={project.components.length}
                />
              ) : (
                <p className="hint">
                  Toca cualquier aparato o circuito para ver qué hace y por
                  dónde llega la corriente.
                </p>
              )}
            </section>
            <div className="feedback">
              <div className="toasts">
                {alert && (
                  <div className={`alert ${alert.level}`} role="alert">
                    <span className="alert-icon" aria-hidden="true">
                      {alert.level === "danger" ? "⚠" : "!"}
                    </span>
                    <div className="alert-body">
                      <strong>
                        {alert.level === "danger"
                          ? "Conexión peligrosa"
                          : "Conexión a revisar"}
                      </strong>
                      <ul>
                        {alert.items.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="alert-close"
                      aria-label="Cerrar aviso"
                      onClick={() => setAlert(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                {notice && (
                  <p className="notice" role="alert">
                    {notice}
                  </p>
                )}
              </div>
              {warnings.length > 0 && (
                <>
                  <p className="issues-summary">
                    {ISSUE_LEVELS.map(({ level, plural }) => {
                      const n = warnings.filter(
                        (w) => w.level === level,
                      ).length;
                      return n
                        ? `${n} ${n === 1 ? plural[0] : plural[1]}`
                        : null;
                    })
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <ul className="issues">
                    {warnings.map((w) => {
                      const { icon, chip } = ISSUE_LEVELS.find(
                        (l) => l.level === w.level,
                      );
                      return (
                        <li key={w.text} className={`issue ${w.level}`}>
                          <span className="issue-chip">
                            <span aria-hidden="true">{icon}</span> {chip}
                          </span>
                          {w.text}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </aside>
        </main>
      )}
      <footer className="disclaimer">{DISCLAIMER}</footer>
    </div>
  );
}
