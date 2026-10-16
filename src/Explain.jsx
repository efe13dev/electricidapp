import { displayName } from "./Device.jsx";
import {
  CATALOG,
  CIRCUITS,
  circuitByKey,
  LABEL_MAX,
  RATINGS,
  SPD_INSTALL_NOTE,
  SUPPLY,
  sectionOf,
} from "./model.js";

const wire = (a, b) => ({ id: crypto.randomUUID(), a, b, pts: [] });

export function Explain({
  comp,
  ordinals,
  project,
  topo,
  chainFor,
  selectedIndex,
  patchSelected,
  moveSelected,
  removeSelected,
  setWires,
  total,
  isOff,
  inLive,
  outLive,
  onToggle,
  onTest,
}) {
  const cat = CATALOG.find((k) => k.type === comp.type);
  const sec = sectionOf(comp, project.components);
  const circ = comp.type === "pia" ? circuitByKey(comp.circuit) : null;
  const kids = project.components.filter((c) => topo.get(c.id) === comp.id);
  let cableText;
  if (comp.type === "pia") {
    cableText =
      sec !== null
        ? `Este circuito lleva cable de ${sec.toLocaleString("es-ES")} mm² porque su magnetotérmico es de ${comp.currentA} A: el cable debe aguantar la corriente a la que salta su protección.`
        : "Elige los amperios para ver la sección.";
  } else if (comp.type === "spd") {
    cableText = "Sus cables de conexión los indica el fabricante.";
  } else {
    cableText =
      sec !== null
        ? `Los cables que salen de aquí son de ${sec.toLocaleString("es-ES")} mm² porque los protege el interruptor general de ${project.components.find((x) => x.type === "iga")?.currentA} A.`
        : "Elige los amperios para ver la sección.";
  }
  let protege;
  if (comp.type === "iga") protege = "Toda la vivienda";
  else if (comp.type === "id") {
    protege =
      kids.length > 0
        ? kids
            .map((k) =>
              k.type === "pia"
                ? `${circuitByKey(k.circuit).key === "otro" ? "C" : circuitByKey(k.circuit).key} · ${circuitByKey(k.circuit).name}`
                : displayName(k, ordinals),
            )
            .join(", ")
        : "Aún no protege ningún circuito";
  } else if (comp.type === "pia") {
    protege = `${circ.name} — ${circ.desc}`;
  } else {
    protege = "Los aparatos del cuadro frente a picos de tensión";
  }
  const chain = chainFor(comp);
  return (
    <div className="explain">
      <h2>
        {cat?.name} ({displayName(comp, ordinals)})
        {comp.label ? ` — ${comp.label}` : ""}
      </h2>
      {comp.type !== "spd" && (
        <div className="switch-bar">
          <span className={`switch-state${outLive ? " on" : ""}`}>
            {isOff
              ? "Palanca bajada (O · OFF)"
              : outLive
                ? "Subido · Con corriente (I · ON)"
                : inLive
                  ? "Subido (I · ON)"
                  : "Subido · Sin corriente de entrada"}
          </span>
          <button type="button" className="primary" onClick={onToggle}>
            {isOff ? "Subir palanca (ON)" : "Bajar palanca (OFF)"}
          </button>
          {comp.type === "id" && (
            <button type="button" onClick={onTest}>
              Probar botón T
            </button>
          )}
        </div>
      )}
      <p>
        <strong>¿Qué es?</strong> {cat?.explain.what}
      </p>
      <p>
        <strong>¿Cuándo salta?</strong> {cat?.explain.when}
      </p>
      <p>
        <strong>Cable:</strong> {cableText}
      </p>
      <p>
        <strong>La corriente llega desde:</strong>{" "}
        {chain ?? "No está conectado: falta el aparato que lo alimenta."}
      </p>
      <p>
        <strong>Protege:</strong> {protege}
      </p>
      {comp.type === "spd" && (
        <p>
          <strong>Al instalarlo:</strong> {SPD_INSTALL_NOTE}
        </p>
      )}
      <details className="edit-details">
        <summary>Editar</summary>
        <div className="edit-grid">
          <label>
            Etiqueta
            <input
              value={comp.label}
              maxLength={LABEL_MAX}
              placeholder="p. ej. Iluminación salón"
              onChange={(e) => patchSelected({ label: e.target.value })}
            />
          </label>
          <label>
            Alimentado desde
            <select
              value={topo.get(comp.id) ?? ""}
              onChange={(e) => {
                const ins = [`${comp.id}-inL`, `${comp.id}-inN`];
                // solo se quita la alimentación; los puentes entre entradas se conservan
                const feed = (x, y) =>
                  ins.includes(x) &&
                  (y.startsWith("supply-") || /-out[LN]$/.test(y));
                const keep = project.wires.filter(
                  (w) => !feed(w.a, w.b) && !feed(w.b, w.a),
                );
                const src = e.target.value;
                if (src === "") return setWires(keep);
                const up =
                  src === SUPPLY
                    ? ["supply-L", "supply-N"]
                    : [`${src}-outL`, `${src}-outN`];
                setWires([...keep, wire(up[0], ins[0]), wire(up[1], ins[1])]);
              }}
            >
              <option value="">Sin conectar</option>
              <option value={SUPPLY}>Contador</option>
              {project.components
                .filter((c) => c.id !== comp.id && c.type !== "spd")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {displayName(c, ordinals)}
                  </option>
                ))}
            </select>
          </label>
          {comp.type === "spd" && (
            <label>
              <span>
                <input
                  type="checkbox"
                  checked={project.wires.some(
                    (w) =>
                      [w.a, w.b].includes(`${comp.id}-pe`) &&
                      [w.a, w.b].includes("earth-PE"),
                  )}
                  onChange={(e) => {
                    const pe = `${comp.id}-pe`;
                    const isPe = (w) =>
                      [w.a, w.b].includes(pe) &&
                      [w.a, w.b].includes("earth-PE");
                    setWires(
                      e.target.checked
                        ? [...project.wires, wire(pe, "earth-PE")]
                        : project.wires.filter((w) => !isPe(w)),
                    );
                  }}
                />{" "}
                Tierra (⏚) conectada a la barra PE
              </span>
            </label>
          )}
          {comp.type === "pia" && (
            <label>
              Circuito
              <select
                value={comp.circuit ?? "otro"}
                onChange={(e) => {
                  const k = circuitByKey(e.target.value);
                  patchSelected({
                    circuit: k.key,
                    label: k.name,
                    currentA: k.currentA,
                  });
                }}
              >
                {CIRCUITS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.key === "otro" ? k.name : `${k.key} · ${k.name}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Módulos
            <select
              value={comp.modules}
              onChange={(e) =>
                patchSelected({ modules: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {Object.entries(RATINGS[comp.type]).map(([field, opts]) => (
            <label key={field}>
              {field === "currentA"
                ? "In (A)"
                : field === "sensitivitymA"
                  ? "IΔn (mA)"
                  : "Imax (8/20 µs, kA)"}
              <select
                value={comp[field] ?? ""}
                onChange={(e) =>
                  patchSelected({
                    [field]:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">Pendiente</option>
                {opts.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="inspector-actions">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => moveSelected(-1)}
            >
              ← Mover antes
            </button>
            <button
              type="button"
              disabled={selectedIndex >= total - 1}
              onClick={() => moveSelected(1)}
            >
              Mover después →
            </button>
            <button type="button" className="danger" onClick={removeSelected}>
              Quitar
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
