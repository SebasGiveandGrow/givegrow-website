# Hero's Wall — muro de reconocimiento (diseño para el futuro)

Estado: **diseñado, no construido.** Aprobar y construir cuando se decida.
Principio: digno, no vanidoso — "evidencia, no promesas". Aparecer es siempre opcional y revocable (Ley 1581).

## Cinco secciones (cada una con tratamiento propio)

1. **Donantes** — agrupados por nivel (Semilla / Raíz / Bosque). **Nunca se muestra el monto**, solo el nivel. Incluye conteo honesto de anónimos ("+23 anónimos").
2. **Voluntarios** — avatar con iniciales + rol (ej. Jagoda C. → Proyecto de Baile; Laura P. → Jornadas La Guajira).
3. **Empresas** — espacio para logo + frase corta. Variante corporativa del reconocimiento.
4. **Aliados** — las fundaciones del HUB (NDF primero).
5. **Menciones honoríficas** — líderes de fundaciones (ej. Francisco Grijalba). Tratamiento visual distinto (borde de acento + cita), porque es un honor, no un listado.

## Consentimiento (estructural, no decorativo)
Cada persona elige: aparecer con nombre / aparecer anónimo (cuenta pero no se nombra) / no aparecer. Revocable en cualquier momento. Conecta con el campo de consentimiento ya definido para la membresía (ver arquitectura-donaciones-membresias.md §2).

## Decisiones pendientes de Sebas (antes de construir)
1. **Fuente de datos:** (a) archivo `heroes.json` editable a mano (permite empezar ya, sin Wompi) — recomendado; o (b) construido pero vacío, autollenado cuando llegue Wompi.
2. **Ubicación:** página propia enlazada desde "Programa de Gratitud" y el pie — recomendado; o sección dentro de una página existente.
3. **Nivel de detalle de donantes:** ¿nombres cortos (María G.) + conteo de anónimos, o algo más sobrio (solo cantidad por nivel)?

## Notas de implementación (cuando se construya)
- Reusar el patrón de datos del inventario (JSON en repo, fetch en el cliente).
- Datos personales solo los autorizados; el resto vive en base privada. Nunca montos.
- Respetar tokens del design system del proyecto (verde institucional, tipografías).
- Maqueta visual ya diseñada y aprobada visualmente por Sebas (julio 2026).
