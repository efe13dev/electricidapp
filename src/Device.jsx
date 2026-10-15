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

function Borne({ pin, pole }) {
  return (
    <span className={`borne-wrap ${pole}`}>
      <i data-pin={pin} className={`borne ${pole}`} />
      <em>{pole === "PE" ? "⏚" : pole}</em>
    </span>
  );
}

function DeviceFace({ comp, ordinals, section }) {
  const cat = CATALOG.find((k) => k.type === comp.type);
  const breaker = comp.type === "pia" || comp.type === "iga";
  const big = breaker && comp.currentA !== null;
  const printed = big ? [`C${comp.currentA}`] : ratingLines(comp);
  return (
    <span className="face">
      <span className="abbr">
        {cat?.abbr}
        {ordinals?.get(comp.id) ?? ""}
      </span>
      <span className={big ? "rating big" : "rating"}>
        {printed.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
      {comp.type === "spd" ? (
        <span className="status-win" aria-hidden="true" />
      ) : (
        <span className="ctrl" aria-hidden="true">
          <span className={`lever-slot ${comp.type}`}>
            <i className="lever" />
            <em className="io i">I</em>
            <em className="io o">O</em>
          </span>
          <span className="side">
            <b className="flag">ON</b>
            {comp.type === "id" && <b className="test-btn">T</b>}
          </span>
        </span>
      )}
      {section !== undefined && (
        <span className="sec-badge">{fmtSection(section)}</span>
      )}
    </span>
  );
}

export function Device({ comp, ordinals, selected, dim, onClick, components }) {
  const cat = CATALOG.find((k) => k.type === comp.type);
  const spd = comp.type === "spd";
  return (
    <button
      type="button"
      className={`device type-${comp.type}${selected ? " selected" : ""}${dim ? " dim" : ""}`}
      style={{ "--w": comp.modules }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={selected}
      aria-label={`${displayName(comp, ordinals)} · ${ratingLines(comp).join(" · ")} · ${comp.modules} módulos`}
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
      />
      <span className="tstrip bottom" aria-hidden="true">
        {spd ? (
          <Borne pin={`${comp.id}-pe`} pole="PE" />
        ) : (
          <>
            <Borne pin={`${comp.id}-outL`} pole="L" />
            <Borne pin={`${comp.id}-outN`} pole="N" />
          </>
        )}
      </span>
      <span className="devlabel">
        {comp.type === "pia" ? "" : comp.label || "—"}
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

export function CircuitCard({ comp, section, selected, dim, onClick, style }) {
  const circ = circuitByKey(comp.circuit);
  return (
    <button
      type="button"
      style={style}
      className={`circuit-card${selected ? " selected" : ""}${dim ? " dim" : ""}`}
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
    </button>
  );
}
