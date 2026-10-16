export const ROW_OPTIONS = [1, 2, 3];
export const PER_ROW_OPTIONS = [12, 18, 24];
export const NAME_MAX = 60;
export const LABEL_MAX = 40;
export const STORAGE_KEY = "cuadro.proyecto.v1";
export const SPD_INSTALL_NOTE =
  "SPD: comprueba esquema de tierra, Uc/Up, In/Imax/Iimp y protección de respaldo/desconexión según fabricante; este esquema no la dimensiona.";

export const CATALOG = [
  {
    type: "iga",
    abbr: "IGA",
    name: "Interruptor general",
    category: "Protección general",
    modules: 2,
    desc: "Protección general frente a sobrecargas y cortocircuitos. Su selección depende del proyecto y de la instalación.",
    explain: {
      what: "Es el interruptor principal de la casa: toda la electricidad pasa primero por él y sirve para cortar la luz de toda la vivienda.",
      when: "Salta si el consumo total supera lo que admite (sobrecarga) o si hay un cortocircuito.",
    },
  },
  {
    type: "id",
    abbr: "ID",
    name: "Diferencial",
    category: "Protección general",
    modules: 2,
    desc: "Detecta un desequilibrio entre corrientes de los conductores activos y desconecta los circuitos asociados. El tipo y la sensibilidad deben determinarse para la instalación.",
    explain: {
      what: "Compara la corriente que va por la fase con la que vuelve por el neutro. Si falta una parte, es que se está escapando (por ejemplo, a través de una persona) y corta.",
      when: "Salta si detecta una fuga igual o mayor que su sensibilidad (normalmente 30 mA). Tiene un botón «T» para probarlo de vez en cuando.",
    },
  },
  {
    type: "pia",
    abbr: "PIA",
    name: "Magnetotérmico",
    category: "Circuitos",
    modules: 2,
    desc: "Protección de los circuitos frente a sobrecargas y cortocircuitos. Su calibre y características deben comprobarse según cada circuito.",
    explain: {
      what: "Protege un solo circuito (por ejemplo, las luces o los enchufes) y el cable de ese circuito.",
      when: "Salta si ese circuito consume más de su calibre durante un tiempo o si hay un cortocircuito. Solo se apaga ese circuito.",
    },
  },
  {
    type: "spd",
    abbr: "SPD",
    name: "Protector de sobretensiones",
    category: "Protección general",
    modules: 2,
    desc: "Limita las sobretensiones transitorias, como las causadas por rayos o maniobras de red. No equivale a una protección frente a sobretensiones permanentes; comprueba el equipo y el proyecto.",
    explain: {
      what: "Desvía a tierra los picos de tensión muy breves (rayos, maniobras en la red) para proteger los aparatos.",
      when: "No salta como los demás: en muchos modelos, cuando se agota, su indicador cambia de color y hay que sustituirlo.",
    },
  },
];

const TYPES = new Set(CATALOG.map((c) => c.type));

export const MAX_PER_ID = 5;
export const SUPPLY = "$supply";

export const RATINGS = {
  iga: { currentA: [25, 32, 40, 50, 63] },
  id: {
    currentA: [25, 40, 63, 80, 100],
    sensitivitymA: [10, 30, 100, 300, 500],
  },
  pia: { currentA: [6, 10, 16, 20, 25, 32, 40] },
  spd: { dischargeKA: [5, 10, 20, 40, 65, 100] },
};

// Circuitos mínimos de una vivienda con electrificación básica (ITC-BT-25). Calibre habitual del PIA.
export const CIRCUITS = [
  {
    key: "C1",
    name: "Alumbrado",
    short: "Luces",
    currentA: 10,
    icon: "bulb",
    desc: "Todos los puntos de luz de la vivienda.",
  },
  {
    key: "C2",
    name: "Tomas de uso general",
    short: "Enchufes",
    currentA: 16,
    icon: "plug",
    desc: "Enchufes de salón, dormitorios y pasillo, y el frigorífico.",
  },
  {
    key: "C3",
    name: "Cocina y horno",
    short: "Cocina y horno",
    currentA: 25,
    icon: "stove",
    desc: "La placa de cocina y el horno, que consumen mucha potencia.",
  },
  {
    key: "C4",
    name: "Lavadora, lavavajillas y termo",
    short: "Lavadora y termo",
    currentA: 20,
    icon: "washer",
    desc: "Lavadora, lavavajillas y termo eléctrico.",
  },
  {
    key: "C5",
    name: "Tomas de baño y cocina",
    short: "Baño y cocina",
    currentA: 16,
    icon: "drop",
    desc: "Enchufes del baño y los de la encimera de la cocina.",
  },
  {
    key: "otro",
    name: "Otro circuito",
    short: "Otro",
    currentA: null,
    icon: "plug",
    desc: "Circuito adicional definido por ti.",
  },
];

export const circuitByKey = (key) =>
  CIRCUITS.find((c) => c.key === key) ?? CIRCUITS.at(-1);

// Orientativo: Cu, aislamiento PVC, conductores en tubo empotrado (ITC-BT-19, método B1, 2 cargados), In ≤ Iz; circuitos de vivienda según ITC-BT-25 (C4 20 A → 4 mm², C3 25 A → 6 mm²).
export const SECTION_BY_IN = {
  6: 1.5,
  10: 1.5,
  16: 2.5,
  20: 4,
  25: 6,
  32: 6,
  40: 10,
  50: 10,
  63: 16,
  80: 25,
  100: 35,
};
export const sectionFor = (currentA) => SECTION_BY_IN[currentA] ?? null;

export const MAX_WIRES = 200;
export const MAX_PTS = 400;

export const pinOwner = (pin) =>
  pin.startsWith("supply-") || pin === "earth-PE"
    ? SUPPLY
    : pin.slice(0, pin.lastIndexOf("-"));
export const pinPole = (pin) =>
  pin.endsWith("L") ? "L" : pin.endsWith("N") ? "N" : "PE";
const isSource = (pin) => pin.startsWith("supply-") || /-out[LN]$/.test(pin);

export function pinsOf(components) {
  const pins = new Set(["supply-L", "supply-N", "earth-PE"]);
  for (const c of components) {
    pins.add(`${c.id}-inL`);
    pins.add(`${c.id}-inN`);
    if (c.type === "spd") pins.add(`${c.id}-pe`);
    else pins.add(`${c.id}-outL`).add(`${c.id}-outN`);
  }
  return pins;
}

// pin → Set compartido con todos los pines de su red
function nets(wires) {
  const net = new Map();
  for (const { a, b } of wires) {
    const g = new Set([...(net.get(a) ?? [a]), ...(net.get(b) ?? [b])]);
    for (const p of g) net.set(p, g);
  }
  return net;
}

function netFaults(wires) {
  const faults = [];
  for (const g of new Set(nets(wires).values())) {
    const poles = ["L", "N", "PE"].filter((k) =>
      [...g].some((p) => pinPole(p) === k),
    );
    if (poles.length > 1) faults.push({ net: g, kind: "short", poles });
    for (const k of ["L", "N"]) {
      const owners = new Set(
        [...g].filter((p) => isSource(p) && pinPole(p) === k).map(pinOwner),
      );
      if (owners.size > 1) {
        faults.push({ net: g, kind: "joined", pole: k, owners: [...owners] });
      }
      for (const p of g) {
        const id = pinOwner(p);
        if (p === `${id}-in${k}` && g.has(`${id}-out${k}`)) {
          faults.push({ net: g, kind: "bypass", owner: id });
        }
      }
    }
  }
  return faults;
}

export function faultyPins(wires) {
  return new Set(netFaults(wires).flatMap((f) => [...f.net]));
}

// Dueño de la fuente de cada polo que llega a `${c.id}-in${k}`, o null si no hay exactamente uno
function feeders(components, wires) {
  const net = nets(wires);
  const feed = (c, k) => {
    const owners = new Set(
      [...(net.get(`${c.id}-in${k}`) ?? [])]
        .filter((p) => isSource(p) && pinPole(p) === k)
        .map(pinOwner)
        .filter((o) => o !== c.id),
    );
    return owners.size === 1 ? [...owners][0] : null;
  };
  return new Map(
    components.map((c) => [c.id, { L: feed(c, "L"), N: feed(c, "N") }]),
  );
}

// Quién alimenta a quién sale de los cables: el padre es el aparato que da L y N.
export function topology(components, wires = []) {
  const feed = feeders(components, wires);
  return new Map(
    components.map((c) => {
      const { L, N } = feed.get(c.id);
      return [c.id, L !== null && L === N ? L : null];
    }),
  );
}

// Ancestros desde el padre hacia arriba; corta si hay un ciclo de cables.
export function chainOf(id, topo) {
  const chain = [];
  const seen = new Set([id]);
  for (let p = topo.get(id); p && !seen.has(p); p = topo.get(p)) {
    seen.add(p);
    chain.push(p);
  }
  return chain;
}

// Qué aparatos y bornes tienen tensión según los interruptores bajados (offIds).
export function energized(components, wires = [], offIds = new Set()) {
  const topo = topology(components, wires);
  const inLive = new Set();
  const outLive = new Set();
  for (const c of components) {
    const chain = chainOf(c.id, topo);
    if (chain.at(-1) === SUPPLY && !chain.some((p) => offIds.has(p))) {
      inLive.add(c.id);
      if (c.type !== "spd" && !offIds.has(c.id)) outLive.add(c.id);
    }
  }
  const liveSources = new Set(["supply-L", "supply-N"]);
  for (const id of outLive) {
    liveSources.add(`${id}-outL`).add(`${id}-outN`);
  }
  const livePins = new Set(liveSources);
  for (const g of new Set(nets(wires).values())) {
    if ([...g].some((p) => liveSources.has(p))) {
      for (const p of g) livePins.add(p);
    }
  }
  return { inLive, outLive, livePins };
}

export function sectionOf(c, components) {
  if (c.type === "pia") return sectionFor(c.currentA);
  if (c.type === "iga" || c.type === "id") {
    const iga = components.find((x) => x.type === "iga");
    return iga ? sectionFor(iga.currentA) : null;
  }
  return null;
}

export function typicalProject() {
  const mk = (type, extra = {}) => ({
    id: crypto.randomUUID(),
    type,
    label: "",
    modules: CATALOG.find((k) => k.type === type).modules,
    currentA: null,
    sensitivitymA: null,
    dischargeKA: null,
    circuit: null,
    ...extra,
  });
  const comps = [
    mk("iga", { currentA: 25 }),
    mk("spd", { dischargeKA: 20 }),
    mk("id", { currentA: 40, sensitivitymA: 30 }),
    ...CIRCUITS.slice(0, 5).map((k) =>
      mk("pia", { currentA: k.currentA, label: k.name, circuit: k.key }),
    ),
  ];
  const [iga, spd, id, ...pias] = comps;
  const wire = (a, b) => ({ id: crypto.randomUUID(), a, b, pts: [] });
  const wires = [
    wire("supply-L", `${iga.id}-inL`),
    wire("supply-N", `${iga.id}-inN`),
    wire(`${iga.id}-outL`, `${spd.id}-inL`),
    wire(`${iga.id}-outN`, `${spd.id}-inN`),
    wire(`${spd.id}-pe`, "earth-PE"),
    wire(`${iga.id}-outL`, `${id.id}-inL`),
    wire(`${iga.id}-outN`, `${id.id}-inN`),
    wire(`${id.id}-outL`, `${pias[0].id}-inL`),
    wire(`${id.id}-outN`, `${pias[0].id}-inN`),
    ...pias
      .slice(1)
      .flatMap((p, i) => [
        wire(`${pias[i].id}-inL`, `${p.id}-inL`),
        wire(`${pias[i].id}-inN`, `${p.id}-inN`),
      ]),
  ];
  return {
    version: 5,
    name: "Vivienda tipo (electrificación básica)",
    rows: 2,
    perRow: 12,
    components: comps,
    wires,
  };
}

function validRating(c) {
  const r = RATINGS[c.type];
  const fields = ["currentA", "sensitivitymA", "dischargeKA"];
  for (const f of fields) {
    if (!(f in r)) {
      if (c[f] !== null) return false;
    } else if (c[f] !== null && !r[f].includes(c[f])) {
      return false;
    }
  }
  return true;
}

export function issues(project) {
  const warnings = [];
  const add = (level, text) => warnings.push({ level, text });
  const comps = project.components;
  const wires = project.wires ?? [];
  const igas = comps.filter((c) => c.type === "iga");
  const feed = feeders(comps, wires);
  const topo = topology(comps, wires);
  const byId = new Map(comps.map((c) => [c.id, c]));
  const net = nets(wires);
  const names = new Map();
  const ord = {};
  for (const c of comps) {
    const abbr = CATALOG.find((k) => k.type === c.type)?.abbr ?? c.type;
    ord[c.type] = (ord[c.type] ?? 0) + 1;
    names.set(c.id, `${abbr} ${ord[c.type]}${c.label ? ` · ${c.label}` : ""}`);
  }
  if (comps.length > 0 && igas.length === 0) {
    add(
      "info",
      "Falta el interruptor general (IGA): es la primera protección del cuadro.",
    );
  }
  if (igas.length > 1) {
    add("warn", "Solo debe haber un interruptor general (IGA).");
  }
  for (const c of comps) {
    const chain = chainOf(c.id, topo);
    const f = feed.get(c.id);
    if ((f.L === null) !== (f.N === null)) {
      const falta = f.L === null ? "fase (L)" : "neutro (N)";
      add("info", `${names.get(c.id)}: le falta el cable de ${falta}.`);
      continue;
    }
    if (c.type === "pia") {
      if (
        chain.at(-1) === SUPPLY &&
        !chain.some((p) => byId.get(p)?.type === "id")
      ) {
        add(
          "danger",
          `${names.get(c.id)} no está protegido por ningún diferencial: dibuja sus cables desde la salida de un diferencial (ID).`,
        );
      } else if (topo.get(c.id) === null) {
        add(
          "info",
          `${names.get(c.id)} aún no tiene corriente: conecta sus entradas L y N a la salida de un diferencial.`,
        );
      }
    } else if (topo.get(c.id) === null) {
      add(
        "info",
        `${names.get(c.id)} no está conectado: dibuja cables L y N desde el aparato que lo alimenta hasta sus bornes de entrada.`,
      );
    }
    if (
      c.type === "iga" &&
      topo.get(c.id) !== null &&
      topo.get(c.id) !== SUPPLY
    ) {
      add(
        "warn",
        `${names.get(c.id)} debe ir conectado directamente a la llegada del contador.`,
      );
    }
    if (
      c.type !== "iga" &&
      chain.at(-1) === SUPPLY &&
      !chain.some((p) => byId.get(p)?.type === "iga")
    ) {
      add("danger", `${names.get(c.id)} no pasa por el interruptor general.`);
    }
    if (f.L !== null && f.N !== null && f.L !== f.N) {
      add(
        "danger",
        `${names.get(c.id)}: la fase y el neutro llegan de aparatos distintos.`,
      );
    }
    const parent = byId.get(topo.get(c.id));
    if ((c.type === "pia" || c.type === "id") && parent?.type === "pia") {
      add(
        "warn",
        `${names.get(c.id)} se alimenta de la salida de ${names.get(parent.id)}: aliméntalo desde el diferencial o puenteando las entradas de los magnetotérmicos.`,
      );
    }
  }
  const shorts = new Set();
  const joined = new Set();
  const bypass = new Set();
  const nombre = (o) => (o === SUPPLY ? "Contador" : names.get(o));
  for (const f of netFaults(wires)) {
    if (f.kind === "short") {
      shorts.add(`Cortocircuito: un cable une ${f.poles.join(" y ")}.`);
    } else if (f.kind === "joined") {
      joined.add(
        `Dos salidas unidas: ${f.owners.map(nombre).join(" y ")} alimentan el mismo cable.`,
      );
    } else {
      bypass.add(
        `${names.get(f.owner)}: un cable une su entrada con su salida y lo anula (queda puenteado).`,
      );
    }
  }
  for (const text of shorts) add("danger", text);
  for (const text of joined) add("danger", text);
  for (const text of bypass) add("danger", text);
  for (const c of comps.filter((x) => x.type === "spd")) {
    if (!net.get(`${c.id}-pe`)?.has("earth-PE")) {
      add(
        "warn",
        `${names.get(c.id)}: conecta su borne de tierra (⏚) a la barra PE.`,
      );
    }
  }
  if (
    comps.some(
      (c) =>
        (c.type === "spd" && c.dischargeKA === null) ||
        (c.type !== "spd" && c.currentA === null) ||
        (c.type === "id" && c.sensitivitymA === null),
    )
  ) {
    add("info", "Hay valores eléctricos sin definir (Pendiente).");
  }
  for (const d of comps.filter((c) => c.type === "id")) {
    const up = igas[0];
    if (
      up !== undefined &&
      up.currentA !== null &&
      d.currentA !== null &&
      d.currentA < up.currentA
    ) {
      add(
        "warn",
        `${names.get(d.id)} aguanta menos amperios que el interruptor general.`,
      );
    }
    if (d.sensitivitymA !== null && d.sensitivitymA > 30) {
      add(
        "warn",
        `${names.get(d.id)} tiene una sensibilidad mayor de 30 mA: protege menos a las personas.`,
      );
    }
    const hijos = comps.filter((c) => topo.get(c.id) === d.id).length;
    if (hijos > MAX_PER_ID) {
      add(
        "warn",
        `${names.get(d.id)} protege ${hijos} circuitos; lo habitual es un máximo de ${MAX_PER_ID} por diferencial.`,
      );
    }
  }
  for (const c of comps.filter((x) => x.type === "pia")) {
    const circ = circuitByKey(c.circuit);
    if (circ.currentA !== null && c.currentA !== circ.currentA) {
      add(
        "warn",
        `${names.get(c.id)} (${circ.name}) lleva ${c.currentA} A; lo habitual es ${circ.currentA} A.`,
      );
    }
  }
  const rank = { danger: 0, warn: 1, info: 2 };
  return warnings.sort((a, b) => rank[a.level] - rank[b.level]);
}

export const analyze = (project) => issues(project).map((i) => i.text);

export function simplify(pts, eps = 2.5) {
  if (pts.length <= 2) return pts.slice();
  const [ax, ay] = pts[0];
  const [bx, by] = pts.at(-1);
  const len = Math.hypot(bx - ax, by - ay);
  let max = 0;
  let idx = 0;
  pts.forEach(([x, y], i) => {
    const d =
      len === 0
        ? Math.hypot(x - ax, y - ay)
        : Math.abs((by - ay) * x - (bx - ax) * y + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  });
  if (max <= eps) return [pts[0], pts.at(-1)];
  return [
    ...simplify(pts.slice(0, idx + 1), eps).slice(0, -1),
    ...simplify(pts.slice(idx), eps),
  ];
}

export function denoise(pts, k = 2) {
  if (pts.length <= 2) return pts.slice();
  return pts.map(([x, y], i) => {
    if (i === 0 || i === pts.length - 1) return [x, y];
    const lo = Math.max(0, i - k);
    const hi = Math.min(pts.length - 1, i + k);
    let sx = 0;
    let sy = 0;
    for (let j = lo; j <= hi; j++) {
      sx += pts[j][0];
      sy += pts[j][1];
    }
    const n = hi - lo + 1;
    return [sx / n, sy / n];
  });
}

const r1 = (v) => Math.round(v * 10) / 10;

export function smoothPath(pts) {
  if (pts.length === 0) return "";
  const [x0, y0] = pts[0];
  if (pts.length <= 2) {
    const tail = pts[1] ? ` L ${r1(pts[1][0])} ${r1(pts[1][1])}` : "";
    return `M ${r1(x0)} ${r1(y0)}${tail}`;
  }
  let d = `M ${r1(x0)} ${r1(y0)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

export function packComponents(components, rows, perRow) {
  if (!ROW_OPTIONS.includes(rows) || !PER_ROW_OPTIONS.includes(perRow)) {
    return null;
  }
  const out = Array.from({ length: rows }, () => []);
  let row = 0;
  let used = 0;
  for (const c of components) {
    if (!Number.isInteger(c.modules) || c.modules < 1 || c.modules > 4) {
      return null;
    }
    if (used + c.modules > perRow) {
      row += 1;
      used = 0;
      if (row >= rows) return null;
    }
    out[row].push(c);
    used += c.modules;
  }
  return out;
}

function validWires(wires, components) {
  if (!Array.isArray(wires) || wires.length > MAX_WIRES) return null;
  const pins = pinsOf(components);
  const ids = new Set();
  const out = [];
  for (const w of wires) {
    if (
      !w ||
      typeof w.id !== "string" ||
      w.id === "" ||
      ids.has(w.id) ||
      !pins.has(w.a) ||
      !pins.has(w.b) ||
      w.a === w.b ||
      !Array.isArray(w.pts) ||
      w.pts.length > MAX_PTS ||
      !w.pts.every(
        (q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite),
      )
    ) {
      return null;
    }
    ids.add(w.id);
    out.push({ id: w.id, a: w.a, b: w.b, pts: w.pts.map(([x, y]) => [x, y]) });
  }
  return out;
}

export function validateProject(p) {
  if (
    !p ||
    ![1, 2, 3, 4, 5].includes(p.version) ||
    typeof p.name !== "string"
  ) {
    return null;
  }
  if (!ROW_OPTIONS.includes(p.rows) || !PER_ROW_OPTIONS.includes(p.perRow)) {
    return null;
  }
  if (!Array.isArray(p.components)) return null;
  const ids = new Set();
  const v1 = p.version === 1;
  const circuitKeys = new Set(CIRCUITS.map((c) => c.key));
  for (const c of p.components) {
    if (
      !c ||
      typeof c.id !== "string" ||
      c.id === "" ||
      c.id.startsWith("$") ||
      ids.has(c.id) ||
      !TYPES.has(c.type) ||
      typeof c.label !== "string" ||
      !Number.isInteger(c.modules) ||
      c.modules < 1 ||
      c.modules > 4
    ) {
      return null;
    }
    ids.add(c.id);
  }
  const components = p.components.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.label.slice(0, LABEL_MAX),
    modules: c.modules,
    currentA: v1 ? null : (c.currentA ?? null),
    sensitivitymA: v1 ? null : (c.sensitivitymA ?? null),
    dischargeKA: v1 ? null : (c.dischargeKA ?? null),
    circuit:
      c.type === "pia"
        ? circuitKeys.has(c.circuit)
          ? c.circuit
          : "otro"
        : null,
  }));
  for (const c of components) {
    if (!validRating(c)) return null;
  }
  if (!packComponents(components, p.rows, p.perRow)) return null;
  const wires = p.version < 5 ? [] : validWires(p.wires, components);
  if (!wires) return null;
  return {
    version: 5,
    name: p.name.slice(0, NAME_MAX),
    rows: p.rows,
    perRow: p.perRow,
    components,
    wires,
  };
}
