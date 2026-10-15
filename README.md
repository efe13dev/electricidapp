# Cuadro (electricidapp)

Simulador interactivo y didáctico de un cuadro eléctrico doméstico (CGMP) en el navegador. Permite montar protecciones en carril DIN, tender cables entre bornes (fase, neutro y tierra), detectar fallos de cableado y consultar una guía paso a paso basada en los circuitos habituales de vivienda (ITC-BT-25).

## Funcionalidades

- **Catálogo de protecciones:** Interruptor general (IGA), protector de sobretensiones (SPD), diferencial (ID) y magnetotérmicos (PIA) para circuitos C1–C5.
- **Cableado interactivo:** Trazado de cables entre bornes con detección en tiempo real de cortocircuitos, puentes indebidos, circuitos sin diferencial o falta de tierra.
- **Modo guiado y cuadro típico:** Montaje paso a paso desde cero o carga de una vivienda tipo con electrificación básica.
- **Persistencia local:** Guardado automático en `localStorage` e impresión limpia del esquema.

## Requisitos y comandos

Gestor de paquetes y runtime: [Bun](https://bun.sh/).

```bash
bun install      # Instalar dependencias
bun run dev      # Servidor de desarrollo (http://localhost:5173)
bun test         # Tests unitarios del modelo (bun:test)
bun run lint     # Linter y formato con Biome
bun run build    # Build de producción en dist/
```

## Estructura

- `src/model.js` — Modelo de datos, topología de cables, validaciones y análisis de avisos.
- `src/model.test.js` — Tests del modelo y de migración/validación de proyectos.
- `src/App.jsx` — Estado principal, tablero del cuadro y trazado de cables.
- `src/Device.jsx` — Representación visual de aparatos DIN y tarjetas de circuito.
- `src/Explain.jsx` — Inspector y editor de propiedades del componente seleccionado.
- `src/Guide.jsx` — Vista de guía rápida y tabla de secciones orientativas.
- `src/styles.css` — Estilos del cuadro, cables SVG y vista de impresión.

## Aviso

Diseño orientativo y didáctico: no valida el cumplimiento del REBT ni sustituye el proyecto o la verificación de un profesional.
