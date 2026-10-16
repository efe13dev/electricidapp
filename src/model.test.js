import { describe, expect, test } from "bun:test";
import {
  analyze,
  chainOf,
  denoise,
  energized,
  faultyPins,
  issues,
  MAX_PTS,
  MAX_WIRES,
  packComponents,
  SUPPLY,
  sectionFor,
  sectionOf,
  simplify,
  smoothPath,
  topology,
  typicalProject,
  validateProject,
} from "./model.js";

const comp = (id, modules, type = "pia") => ({
  id,
  type,
  label: "",
  modules,
});

const wire = (a, b) => ({ id: `${a}~${b}`, a, b, pts: [] });

const comp2 = (id, type, extra = {}) => ({
  id,
  type,
  label: "",
  modules: 2,
  currentA: null,
  sensitivitymA: null,
  dischargeKA: null,
  circuit: type === "pia" ? "otro" : null,
  ...extra,
});

describe("packComponents", () => {
  test("packs mixed widths preserving order", () => {
    const rows = packComponents(
      [comp("a", 2), comp("b", 1), comp("c", 4), comp("d", 2)],
      2,
      12,
    );
    expect(rows.map((r) => r.map((c) => c.id))).toEqual([
      ["a", "b", "c", "d"],
      [],
    ]);
  });

  test("wraps to next row without splitting a component", () => {
    const rows = packComponents(
      [comp("a", 4), comp("b", 4), comp("c", 3), comp("d", 4)],
      2,
      12,
    );
    expect(rows.map((r) => r.map((c) => c.id))).toEqual([
      ["a", "b", "c"],
      ["d"],
    ]);
  });

  test("rejects overflow even when total fits (no row straddling)", () => {
    const items = [4, 4, 3, 4, 4, 3, 2].map((m, i) => comp(`c${i}`, m));
    expect(items.reduce((s, c) => s + c.modules, 0)).toBe(24);
    expect(packComponents(items, 2, 12)).toBeNull();
  });

  test("empty component list yields empty rows", () => {
    expect(packComponents([], 2, 12)).toEqual([[], []]);
  });

  test("rejects invalid module widths and options", () => {
    expect(packComponents([comp("a", 0)], 2, 12)).toBeNull();
    expect(packComponents([comp("a", 5)], 2, 12)).toBeNull();
    expect(packComponents([comp("a", 1.5)], 2, 12)).toBeNull();
    expect(packComponents([], 4, 12)).toBeNull();
    expect(packComponents([], 2, 16)).toBeNull();
  });
});

const v4base = {
  version: 4,
  name: "Vivienda",
  rows: 2,
  perRow: 12,
  components: [comp2("g", "iga", { currentA: 40 }), comp2("p", "pia")],
};

describe("validateProject v4", () => {
  test("accepts a valid v4 project and migrates it to v5 without wires", () => {
    expect(validateProject(v4base)).toEqual({
      ...v4base,
      version: 5,
      wires: [],
    });
  });

  test("rejects baseline malformed shapes", () => {
    expect(validateProject(null)).toBeNull();
    expect(validateProject({})).toBeNull();
    expect(validateProject({ ...v4base, version: 6 })).toBeNull();
    expect(validateProject({ ...v4base, rows: 4 })).toBeNull();
    expect(validateProject({ ...v4base, perRow: 10 })).toBeNull();
    expect(validateProject({ ...v4base, components: "x" })).toBeNull();
    expect(
      validateProject({ ...v4base, components: [comp2("a", "pia"), null] }),
    ).toBeNull();
    expect(
      validateProject({ ...v4base, components: [comp2("a", "ups")] }),
    ).toBeNull();
    expect(
      validateProject({
        ...v4base,
        components: [comp2("a", "pia"), comp2("a", "pia")],
      }),
    ).toBeNull();
    expect(
      validateProject({ ...v4base, components: [comp2("$x", "iga")] }),
    ).toBeNull();
    expect(
      validateProject({ ...v4base, components: [comp2("", "iga")] }),
    ).toBeNull();
  });

  test("truncates over-length name and label", () => {
    const v = validateProject({
      ...v4base,
      name: "x".repeat(200),
      components: [{ ...comp2("a", "iga"), label: "y".repeat(200) }],
    });
    expect(v.name).toHaveLength(60);
    expect(v.components[0].label).toHaveLength(40);
  });

  test("rejects layout that no longer fits", () => {
    const big = {
      ...v4base,
      rows: 1,
      components: Array.from({ length: 13 }, (_, i) =>
        comp2(`c${i}`, "pia", { modules: 1 }),
      ),
    };
    expect(validateProject(big)).toBeNull();
  });

  test("migrates v1: ratings null, circuit otro", () => {
    const v1 = {
      version: 1,
      name: "Casa",
      rows: 3,
      perRow: 18,
      components: [
        { id: "a", type: "iga", label: "General", modules: 2 },
        { id: "b", type: "pia", label: "", modules: 1 },
      ],
    };
    const v = validateProject(v1);
    expect(v.version).toBe(5);
    expect(v.components[0]).toMatchObject({
      id: "a",
      currentA: null,
      circuit: null,
    });
    expect(v.components[1].circuit).toBe("otro");
  });

  test("migrates v3: drops feeders/wiringMode, keeps ratings", () => {
    const v3 = {
      version: 3,
      name: "V",
      rows: 2,
      perRow: 12,
      wiringMode: "manual",
      components: [
        {
          ...comp2("g", "iga", { currentA: 40 }),
          feederL: "$supply",
          feederN: "$supply",
        },
        {
          ...comp2("p", "pia", { currentA: 16 }),
          feederL: "@g",
          feederN: "@g",
        },
      ],
    };
    const v = validateProject(v3);
    expect(v.version).toBe(5);
    expect(v.wiringMode).toBeUndefined();
    expect(v.components[0]).toMatchObject({ currentA: 40 });
    expect("feederL" in v.components[0]).toBe(false);
    expect(v.components[1].circuit).toBe("otro");
  });

  test("invalid circuit becomes otro; valid kept", () => {
    const v = validateProject({
      ...v4base,
      components: [
        comp2("p1", "pia", { circuit: "C3" }),
        comp2("p2", "pia", { circuit: "nope" }),
        comp2("s", "spd", { circuit: "C1" }),
      ],
    });
    expect(v.components[0].circuit).toBe("C3");
    expect(v.components[1].circuit).toBe("otro");
    expect(v.components[2].circuit).toBeNull();
  });

  test("v4 JSON roundtrip", () => {
    expect(validateProject(JSON.parse(JSON.stringify(v4base)))).toEqual({
      ...v4base,
      version: 5,
      wires: [],
    });
  });

  test("rejects invalid rating fields", () => {
    expect(
      validateProject({
        ...v4base,
        components: [comp2("g", "iga", { currentA: 33 })],
      }),
    ).toBeNull();
    expect(
      validateProject({
        ...v4base,
        components: [comp2("p", "pia", { sensitivitymA: 30 })],
      }),
    ).toBeNull();
    expect(
      validateProject({
        ...v4base,
        components: [comp2("d", "id", { sensitivitymA: 25 })],
      }),
    ).toBeNull();
  });
});

describe("topology", () => {
  const g = comp2("g", "iga");
  const d = comp2("d", "id");
  const p = comp2("p", "pia");
  const feed = [
    wire("supply-L", "g-inL"),
    wire("supply-N", "g-inN"),
    wire("g-outL", "d-inL"),
    wire("g-outN", "d-inN"),
    wire("d-outL", "p-inL"),
    wire("d-outN", "p-inN"),
  ];

  test("sigue los cables: contador → IGA → ID → PIA", () => {
    const t = topology([g, d, p], feed);
    expect(t.get("g")).toBe(SUPPLY);
    expect(t.get("d")).toBe("g");
    expect(t.get("p")).toBe("d");
  });

  test("un puente entre entradas de dos PIA cuelga el segundo del ID", () => {
    const p2 = comp2("p2", "pia");
    const t = topology(
      [g, d, p, p2],
      [...feed, wire("p-inL", "p2-inL"), wire("p-inN", "p2-inN")],
    );
    expect(t.get("p2")).toBe("d");
  });

  test("L y N desde aparatos distintos → null", () => {
    const t = topology(
      [g, d, p],
      [...feed.slice(0, 4), wire("g-outL", "p-inL"), wire("d-outN", "p-inN")],
    );
    expect(t.get("p")).toBeNull();
  });

  test("sin cables todo null", () => {
    const t = topology([g, d, p]);
    expect([...t.values()]).toEqual([null, null, null]);
  });

  test("un cable de un aparato consigo mismo → null", () => {
    const t = topology([p], [wire("p-outL", "p-inL"), wire("p-outN", "p-inN")]);
    expect(t.get("p")).toBeNull();
  });
});

describe("chainOf", () => {
  test("termina con un ciclo de cables", () => {
    const a = comp2("a", "pia");
    const b = comp2("b", "pia");
    const t = topology(
      [a, b],
      [
        wire("a-outL", "b-inL"),
        wire("a-outN", "b-inN"),
        wire("b-outL", "a-inL"),
        wire("b-outN", "a-inN"),
      ],
    );
    expect(chainOf("a", t)).toEqual(["b"]);
  });
});

describe("energized", () => {
  const g = comp2("g", "iga");
  const d = comp2("d", "id");
  const p1 = comp2("p1", "pia");
  const p2 = comp2("p2", "pia");
  const comps = [g, d, p1, p2];
  const wires = [
    wire("supply-L", "g-inL"),
    wire("supply-N", "g-inN"),
    wire("g-outL", "d-inL"),
    wire("g-outN", "d-inN"),
    wire("d-outL", "p1-inL"),
    wire("d-outN", "p1-inN"),
    wire("p1-inL", "p2-inL"),
    wire("p1-inN", "p2-inN"),
  ];

  test("todo subido: todos con tensión; bajar IGA corta aguas abajo; bajar PIA 1 no corta PIA 2", () => {
    const allOn = energized(comps, wires);
    expect([...allOn.outLive]).toEqual(["g", "d", "p1", "p2"]);

    const igaOff = energized(comps, wires, new Set(["g"]));
    expect([...igaOff.inLive]).toEqual(["g"]);
    expect([...igaOff.outLive]).toEqual([]);
    expect(igaOff.livePins.has("g-inL")).toBe(true);
    expect(igaOff.livePins.has("d-inL")).toBe(false);

    const p1Off = energized(comps, wires, new Set(["p1"]));
    expect([...p1Off.outLive]).toEqual(["g", "d", "p2"]);
  });
});

describe("sectionOf", () => {
  test("pia by its own calibre; id/iga by the IGA", () => {
    const comps = [
      comp2("g", "iga", { currentA: 25 }),
      comp2("d", "id", { currentA: 40 }),
      comp2("p", "pia", { currentA: 16 }),
      comp2("s", "spd"),
    ];
    expect(sectionOf(comps[2], comps)).toBe(2.5);
    expect(sectionOf(comps[1], comps)).toBe(6);
    expect(sectionOf(comps[0], comps)).toBe(6);
    expect(sectionOf(comps[3], comps)).toBeNull();
    expect(sectionFor(33)).toBeNull();
  });
});

describe("typicalProject", () => {
  test("validates, packs and analyzes clean", () => {
    const p = typicalProject();
    expect([p.rows, p.perRow]).toEqual([2, 12]);
    expect(validateProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(packComponents(p.components, p.rows, p.perRow)).not.toBeNull();
    expect(p.components.map((c) => c.type)).toEqual([
      "iga",
      "spd",
      "id",
      "pia",
      "pia",
      "pia",
      "pia",
      "pia",
    ]);
    expect(analyze(p)).toEqual([]);
    expect(faultyPins(p.wires).size).toBe(0);
  });
});

describe("analyze", () => {
  const proj = (components, wires = []) => ({
    version: 5,
    name: "",
    rows: 3,
    perRow: 24,
    components,
    wires,
  });

  test("missing / duplicate IGA and unprotected PIA", () => {
    expect(analyze(proj([comp2("p", "pia")]))[0]).toContain(
      "Falta el interruptor general",
    );
    const w = analyze(
      proj([comp2("g1", "iga"), comp2("g2", "iga"), comp2("p", "pia")]),
    ).join("\n");
    expect(w).toContain("Solo debe haber un interruptor general");
    expect(w).toContain("aún no tiene corriente");
    expect(w).not.toContain("no está protegido");
  });

  test("id warnings: >5 circuits, nominal < IGA, sensitivity >30", () => {
    const comps = [
      comp2("g", "iga", { currentA: 63 }),
      comp2("d", "id", { currentA: 40, sensitivitymA: 100 }),
      ...Array.from({ length: 6 }, (_, i) =>
        comp2(`p${i}`, "pia", { currentA: 16 }),
      ),
    ];
    const wires = [
      wire("supply-L", "g-inL"),
      wire("supply-N", "g-inN"),
      wire("g-outL", "d-inL"),
      wire("g-outN", "d-inN"),
      ...Array.from({ length: 6 }, (_, i) => [
        wire("d-outL", `p${i}-inL`),
        wire("d-outN", `p${i}-inN`),
      ]).flat(),
    ];
    const w = analyze(proj(comps, wires)).join("\n");
    expect(w).toContain("protege 6 circuitos");
    expect(w).toContain("aguanta menos amperios");
    expect(w).toContain("mayor de 30 mA");
  });

  test("pia with unusual calibre for its circuit", () => {
    const w = analyze(
      proj([
        comp2("g", "iga", { currentA: 25 }),
        comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
        comp2("p", "pia", { currentA: 16, circuit: "C1" }),
      ]),
    ).join("\n");
    expect(w).toContain("(Alumbrado) lleva 16 A; lo habitual es 10 A");
  });

  test("pia fed directly from the IGA warns unprotected", () => {
    const comps = [comp2("g", "iga"), comp2("p", "pia")];
    const w = analyze(
      proj(comps, [
        wire("supply-L", "g-inL"),
        wire("supply-N", "g-inN"),
        wire("g-outL", "p-inL"),
        wire("g-outN", "p-inN"),
      ]),
    ).join("\n");
    expect(w).toContain("PIA 1 no está protegido por ningún diferencial");
  });

  test("pending ratings warning kept", () => {
    expect(analyze(proj([comp2("g", "iga")])).join("\n")).toContain(
      "sin definir",
    );
    expect(analyze(proj([]))).toEqual([]);
  });

  test("componente sin conectar", () => {
    const w = analyze(
      proj([
        comp2("g", "iga", { currentA: 40 }),
        comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
      ]),
    ).join("\n");
    expect(w).toContain("ID 1 no está conectado");
  });

  test("cortocircuito entre fase y neutro", () => {
    const comps = [
      comp2("g", "iga", { currentA: 40 }),
      comp2("p", "pia", { currentA: 16 }),
    ];
    const w = analyze(proj(comps, [wire("g-outL", "p-inN")])).join("\n");
    expect(w).toContain("Cortocircuito: un cable une L y N.");
  });

  test("dos salidas unidas al mismo cable", () => {
    const comps = [
      comp2("g", "iga", { currentA: 40 }),
      comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
      comp2("p", "pia", { currentA: 16 }),
    ];
    const w = analyze(
      proj(comps, [wire("g-outL", "p-inL"), wire("d-outL", "p-inL")]),
    ).join("\n");
    expect(w).toMatch(
      /Dos salidas unidas: (IGA 1 y ID 1|ID 1 y IGA 1) alimentan el mismo cable\./,
    );
  });

  test("spd sin tierra y con tierra", () => {
    const comps = [comp2("s", "spd", { dischargeKA: 20 })];
    expect(analyze(proj(comps)).join("\n")).toContain(
      "conecta su borne de tierra",
    );
    expect(
      analyze(proj(comps, [wire("s-pe", "earth-PE")])).join("\n"),
    ).not.toContain("conecta su borne de tierra");
  });

  test("cable que puentea la entrada y la salida de un IGA", () => {
    const comps = [comp2("g", "iga", { currentA: 40 })];
    const wires = [wire("g-inL", "g-outL")];
    expect(analyze(proj(comps, wires)).join("\n")).toContain(
      "IGA 1: un cable une su entrada con su salida y lo anula (queda puenteado).",
    );
    expect(faultyPins(wires).has("g-inL")).toBe(true);
    expect(faultyPins(wires).has("g-outL")).toBe(true);
  });

  test("diferencial con solo fase: falta el neutro", () => {
    const comps = [
      comp2("g", "iga", { currentA: 40 }),
      comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
    ];
    expect(
      analyze(proj(comps, [wire("g-outL", "d-inL")])).join("\n"),
    ).toContain("ID 1: le falta el cable de neutro (N).");
  });

  test("magnetotérmico alimentado desde la salida de otro", () => {
    const comps = [
      comp2("g", "iga", { currentA: 40 }),
      comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
      comp2("p1", "pia", { currentA: 16 }),
      comp2("p2", "pia", { currentA: 16 }),
    ];
    const wires = [
      wire("g-outL", "d-inL"),
      wire("g-outN", "d-inN"),
      wire("d-outL", "p1-inL"),
      wire("d-outN", "p1-inN"),
      wire("p1-outL", "p2-inL"),
      wire("p1-outN", "p2-inN"),
    ];
    expect(analyze(proj(comps, wires)).join("\n")).toContain(
      "PIA 2 se alimenta de la salida de PIA 1: aliméntalo desde el diferencial",
    );
  });
});

describe("issues", () => {
  const proj = (components, wires = []) => ({
    version: 5,
    name: "",
    rows: 3,
    perRow: 24,
    components,
    wires,
  });

  test("niveles: cortocircuito peligro, sensibilidad aviso, pendiente info", () => {
    const short = issues(
      proj(
        [
          comp2("g", "iga", { currentA: 40 }),
          comp2("p", "pia", { currentA: 16 }),
        ],
        [wire("g-outL", "p-inN")],
      ),
    ).find((i) => i.text.startsWith("Cortocircuito"));
    expect(short.level).toBe("danger");
    const sens = issues(
      proj([comp2("d", "id", { currentA: 40, sensitivitymA: 100 })]),
    ).find((i) => i.text.includes("mayor de 30 mA"));
    expect(sens.level).toBe("warn");
    const pending = issues(proj([comp2("p", "pia")])).find((i) =>
      i.text.includes("Pendiente"),
    );
    expect(pending.level).toBe("info");
  });

  test("peligro primero cuando coexiste con pendientes", () => {
    const list = issues(
      proj(
        [comp2("g", "iga"), comp2("p", "pia", { currentA: 16 })],
        [wire("g-outL", "p-inN")],
      ),
    );
    expect(list[0].level).toBe("danger");
    expect(list.some((i) => i.level === "info")).toBe(true);
  });

  test("PIA alimentado desde un ID sin cables de entrada: sin aviso de protección", () => {
    const comps = [
      comp2("g", "iga", { currentA: 40 }),
      comp2("d", "id", { currentA: 40, sensitivitymA: 30 }),
      comp2("p", "pia", { currentA: 16 }),
    ];
    const w = analyze(
      proj(comps, [wire("d-outL", "p-inL"), wire("d-outN", "p-inN")]),
    ).join("\n");
    expect(w).toContain("ID 1 no está conectado");
    expect(w).not.toContain("no está protegido");
    expect(w).not.toContain("aún no tiene corriente");
  });
});

describe("simplify", () => {
  test("puntos casi alineados colapsan a los extremos", () => {
    const pts = [
      [0, 0],
      [10, 0.5],
      [20, -0.4],
      [30, 0.3],
      [40, 0],
    ];
    expect(simplify(pts)).toEqual([
      [0, 0],
      [40, 0],
    ]);
  });

  test("una L conserva su esquina", () => {
    const pts = [
      [0, 0],
      [10, 0],
      [20, 0],
      [20, 10],
      [20, 20],
    ];
    expect(simplify(pts)).toEqual([
      [0, 0],
      [20, 0],
      [20, 20],
    ]);
  });

  test("dos puntos o menos no cambian", () => {
    expect(simplify([[1, 1]])).toEqual([[1, 1]]);
    expect(
      simplify([
        [1, 1],
        [2, 2],
      ]),
    ).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});

describe("denoise", () => {
  test("mantiene los extremos y suaviza un zig-zag", () => {
    const pts = [[0, 0]];
    for (let i = 1; i < 9; i++) pts.push([i * 10, i % 2 ? 2 : -2]);
    pts.push([90, 0]);
    const out = denoise(pts);
    expect(out[0]).toEqual([0, 0]);
    expect(out.at(-1)).toEqual([90, 0]);
    for (const [, y] of out.slice(1, -1)) expect(Math.abs(y)).toBeLessThan(1);
  });
});

describe("smoothPath", () => {
  test("dos puntos: recta", () => {
    expect(
      smoothPath([
        [0, 0],
        [10, 10],
      ]),
    ).toBe("M 0 0 L 10 10");
  });

  test("cuatro puntos: tres curvas que acaban en el último", () => {
    const d = smoothPath([
      [0, 0],
      [10, 0],
      [20, 10],
      [30, 10],
    ]);
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    expect(d.endsWith("30 10")).toBe(true);
  });
});

describe("validateProject v5", () => {
  const v5base = {
    version: 5,
    name: "V",
    rows: 2,
    perRow: 12,
    components: [comp2("g", "iga", { currentA: 40 }), comp2("p", "pia")],
    wires: [
      {
        id: "w1",
        a: "supply-L",
        b: "g-inL",
        pts: [
          [1, 2],
          [3, 4],
        ],
      },
    ],
  };

  test("accepts a valid project and roundtrips JSON", () => {
    expect(validateProject(v5base)).toEqual(v5base);
    expect(validateProject(JSON.parse(JSON.stringify(v5base)))).toEqual(v5base);
  });

  test("rejects invalid wires", () => {
    const bad = (w) =>
      validateProject({ ...v5base, wires: [{ ...v5base.wires[0], ...w }] });
    expect(bad({ b: "x-inL" })).toBeNull();
    expect(bad({ b: "supply-L", a: "supply-L" })).toBeNull();
    expect(bad({ pts: [[NaN, 1]] })).toBeNull();
    expect(bad({ pts: [[1]] })).toBeNull();
    expect(bad({ pts: [[1, 2, 3]] })).toBeNull();
    expect(
      bad({ pts: Array.from({ length: MAX_PTS + 1 }, () => [0, 0]) }),
    ).toBeNull();
    expect(
      validateProject({
        ...v5base,
        wires: [v5base.wires[0], { ...v5base.wires[0], b: "g-inN" }],
      }),
    ).toBeNull();
    expect(validateProject({ ...v5base, wires: "x" })).toBeNull();
    expect(
      validateProject({
        ...v5base,
        wires: Array.from({ length: MAX_WIRES + 1 }, (_, i) => ({
          id: `w${i}`,
          a: "supply-L",
          b: "g-inL",
          pts: [],
        })),
      }),
    ).toBeNull();
  });
});
