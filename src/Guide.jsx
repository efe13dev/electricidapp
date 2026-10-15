import { CATALOG, SECTION_BY_IN } from "./model.js";

export function Guide() {
  return (
    <main className="guide">
      <h2>Guía rápida</h2>
      {CATALOG.map((c) => (
        <section key={c.type} className="guide-card">
          <h3>
            <span className="tag">{c.abbr}</span> {c.name}
          </h3>
          <p>
            <strong>¿Qué es?</strong> {c.explain.what}
          </p>
          <p>
            <strong>¿Cuándo salta?</strong> {c.explain.when}
          </p>
        </section>
      ))}
      <section className="guide-card">
        <h3>Secciones orientativas de cable</h3>
        <table className="sec-table">
          <thead>
            <tr>
              <th>In (A)</th>
              <th>mm²</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SECTION_BY_IN).map(([a, s]) => (
              <tr key={a}>
                <td>{a}</td>
                <td>{s.toLocaleString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Secciones orientativas (Cu/PVC en tubo empotrado, ITC-BT-19/25):
          comprueba longitud, caída de tensión y método de instalación.
        </p>
      </section>
      <section className="guide-card checklist">
        <h3>Antes de montar</h3>
        <ul>
          <li>Confirma las dimensiones reales (módulos DIN) del fabricante.</li>
          <li>La elección de protecciones depende de cada proyecto.</li>
          <li>Un profesional debe verificar la instalación según el REBT.</li>
        </ul>
      </section>
      <section className="guide-card">
        <h3>Referencias</h3>
        <ul>
          <li>
            <a href="https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Documents/bt/guia_bt_25_jul12R2.pdf">
              Guía ITC-BT-25 (Ministerio de Industria)
            </a>
          </li>
          <li>
            <a href="https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Documents/bt/guia_bt_19_feb09R2.pdf">
              Guía ITC-BT-19 (Ministerio de Industria)
            </a>
          </li>
          <li>
            <a href="https://www.se.com/es/es/faqs/FA345364/">
              Schneider Electric FAQ FA345364 (sobretensiones)
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
