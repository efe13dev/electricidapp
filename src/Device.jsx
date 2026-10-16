import { CATALOG, circuitByKey, sectionOf } from "./model.js";

function ratingLines(c) {
  if (c.type === "spd") {
    return [
      c.dischargeKA !== null ? `Imax ${c.dischargeKA} kA` : "Imax pendiente",
    ];
  }
  const lines = [c.currentA !== null ? `${c.currentA} A` : "In pendiente"];
  if (c.type === "id") {
    lines.push(
      c.sensitivitymA !== null ? `${c.sensitivitymA} mA` : "IΔn pendiente",
    );
  }
  return lines;
}

export function displayName(c, ordinals) {
  const cat = CATALOG.find((k) => k.type === c.type);
  const base = `${cat?.abbr ?? "?"} ${ordinals.get(c.id) ?? ""}`.trim();
  return c.label ? `${base} · ${c.label}` : base;
}

function fmtSection(s) {
  return s === null ? "sección pendiente" : `${s.toLocaleString("es-ES")} mm²`;
}

function Borne({ pin, pole, bottom }) {
  const tag =
    pole === "PE"
      ? "⏚ PE"
      : pole === "L"
        ? bottom
          ? "2·L"
          : "1·L"
        : bottom
          ? "4·N"
          : "3·N";
  return (
    <span className={`borne-wrap ${pole}`}>
      {!bottom && <em>{tag}</em>}
      <i data-pin={pin} className={`borne ${pole}`} />
      {bottom && <em>{tag}</em>}
    </span>
  );
}

const SPEC_TAG = {
  iga: "2P · 400V~",
  id: "Clase AC",
  pia: "6000 · 230V~",
  spd: "Tipo 2 · 275V~",
};

function DeviceFace({ comp, ordinals, section, isOff, onToggle, onTest }) {
  const cat = CATALOG.find((k) => k.type === comp.type);
  const breaker = comp.type === "pia" || comp.type === "iga";
  const big = breaker && comp.currentA !== null;
  const printed = big ? [`C${comp.currentA}`] : ratingLines(comp);
  const flip = onToggle
    ? (e) => {
        e.stopPropagation();
        onToggle();
      }
    : undefined;
  return (
    <span className="face">
      <span className="face-head">
        <span className="abbr">
          {cat?.abbr}
          {ordinals?.get(comp.id) ?? ""}
        </span>
        <span className="spec-tag">{SPEC_TAG[comp.type]}</span>
      </span>
      <span className="face-specs">
        <span className={big ? "rating big" : "rating"}>
          {printed.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </span>
        {section !== undefined && (
          <span className="sec-badge">{fmtSection(section)}</span>
        )}
      </span>
      {comp.type === "spd" ? (
        <span className="spd-carts" aria-hidden="true">
          <span className="spd-cart">
            <em>L</em>
            <i className="status-win" />
          </span>
          <span className="spd-cart">
            <em>N</em>
            <i className="status-win" />
          </span>
        </span>
      ) : (
        <span className={`ctrl ${comp.type}`} aria-hidden="true">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: el botón padre y el panel lateral exponen el control accesible */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: el botón padre y el panel lateral exponen el control accesible */}
          <span
            className={`lever-slot ${comp.type}${breaker ? " coupled" : ""}${isOff ? " off" : ""}`}
            onClick={flip}
            title={isOff ? "Subir palanca (I · ON)" : "Bajar palanca (O · OFF)"}
          >
            <i className="lever" />
            <em className="io i">I</em>
            <em className="io o">O</em>
          </span>
          <span className="side">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: control visual duplicado en el inspector */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: control visual duplicado en el inspector */}
            <b
              className={`flag${isOff ? " off" : ""}`}
              onClick={flip}
              title={
                isOff ? "Subir palanca (I · ON)" : "Bajar palanca (O · OFF)"
              }
            >
              {isOff ? "O·OFF" : "I·ON"}
            </b>
            {comp.type === "id" && (
              // biome-ignore lint/a11y/noStaticElementInteractions: control visual duplicado en el inspector
              // biome-ignore lint/a11y/useKeyWithClickEvents: control visual duplicado en el inspector
              <b
                className="test-btn"
                title="Pulsar botón de prueba (Test)"
                onClick={
                  onTest
                    ? (e) => {
                        e.stopPropagation();
                        onTest();
                      }
                    : undefined
                }
              >
                T
              </b>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

export function Device({
  comp,
  ordinals,
  selected,
  dim,
  isOff,
  powered,
  onClick,
  onToggle,
  onTest,
  components,
}) {
  const cat = CATALOG.find((k) => k.type === comp.type);
  const spd = comp.type === "spd";
  const circ = comp.type === "pia" ? circuitByKey(comp.circuit) : null;
  const holderText =
    comp.type === "pia"
      ? `${circ.key === "otro" ? "C" : circ.key} · ${comp.label || circ.short}`
      : comp.label || cat?.name || "—";
  const stateLabel = spd ? "" : isOff ? " · Bajado (OFF)" : " · Subido (ON)";
  return (
    <button
      type="button"
      className={`device type-${comp.type}${selected ? " selected" : ""}${dim ? " dim" : ""}${isOff ? " is-off" : ""}${powered === false ? " no-power" : ""}`}
      style={{ "--w": comp.modules }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={selected}
      aria-label={`${displayName(comp, ordinals)} · ${ratingLines(comp).join(" · ")}${stateLabel} · ${comp.modules} módulos`}
      title={comp.label || cat?.abbr}
    >
      <span className="tstrip" aria-hidden="true">
        <Borne pin={`${comp.id}-inL`} pole="L" />
        <Borne pin={`${comp.id}-inN`} pole="N" />
      </span>
      <DeviceFace
        comp={comp}
        ordinals={ordinals}
        section={spd ? undefined : sectionOf(comp, components)}
        isOff={isOff}
        onToggle={onToggle}
        onTest={onTest}
      />
      <span className="devlabel">{holderText}</span>
      <span className="tstrip bottom" aria-hidden="true">
        {spd ? (
          <Borne pin={`${comp.id}-pe`} pole="PE" bottom />
        ) : (
          <>
            <Borne pin={`${comp.id}-outL`} pole="L" bottom />
            <Borne pin={`${comp.id}-outN`} pole="N" bottom />
          </>
        )}
      </span>
    </button>
  );
}

export function DeviceMini({ modules, type }) {
  const comp = {
    id: "mini",
    type,
    label: "",
    modules,
    currentA: null,
    sensitivitymA: null,
    dischargeKA: null,
  };
  return (
    <span
      className={`device mini type-${type}`}
      style={{ "--w": modules }}
      aria-hidden="true"
    >
      <span className="tstrip">
        <i className="borne L" />
        <i className="borne N" />
      </span>
      <DeviceFace comp={comp} />
      <span className="tstrip bottom">
        <i className="borne L" />
        <i className="borne N" />
      </span>
    </span>
  );
}

function CircuitIcon({ icon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      aria-hidden="true"
      {...common}
    >
      {icon === "bulb" && (
        <>
          <circle cx="12" cy="9.5" r="5.5" />
          <path d="M9.5 17.5h5M10 20.5h4" />
        </>
      )}
      {icon === "plug" && (
        <>
          <path d="M9 4v5M15 4v5" />
          <path d="M7 9h10v4a5 5 0 0 1-10 0z" />
          <path d="M12 18v3" />
        </>
      )}
      {icon === "stove" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="1.5" />
          <circle cx="9" cy="11" r="2.2" />
          <circle cx="15.5" cy="11" r="1.5" />
          <path d="M7 15.5h10" />
        </>
      )}
      {icon === "washer" && (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <circle cx="12" cy="13" r="4.5" />
          <path d="M8 7h2" />
        </>
      )}
      {icon === "drop" && (
        <path d="M12 4c3.5 4.5 6 7.7 6 10.5a6 6 0 0 1-12 0C6 11.7 8.5 8.5 12 4z" />
      )}
    </svg>
  );
}

export function CircuitCard({
  comp,
  section,
  selected,
  dim,
  powered,
  onClick,
  style,
}) {
  const circ = circuitByKey(comp.circuit);
  return (
    <button
      type="button"
      style={style}
      className={`circuit-card${selected ? " selected" : ""}${dim ? " dim" : ""}${powered ? " live" : " is-off"}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={circ.name}
    >
      <i className="card-pin" data-pin={`${comp.id}-cardL`} />
      <i className="card-pin" data-pin={`${comp.id}-cardN`} />
      <CircuitIcon icon={circ.icon} />
      <strong>{circ.key === "otro" ? "C" : circ.key}</strong>
      <span className="card-name">{circ.short}</span>
      <span className="card-sec">{fmtSection(section)}</span>
      <span className={`card-power${powered ? " on" : ""}`}>
        {powered ? "Con corriente" : "Sin corriente"}
      </span>
    </button>
  );
}
