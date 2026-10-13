# Obligaciones de la Fundación — calendario tributario y legal

> **Por qué existe este archivo.** El 22 de septiembre de 2026 la Alcaldía de
> Medellín notificó que la Fundación nunca presentó la declaración de ICA del año
> gravable 2025. No fue un olvido de una persona: el ICA no estaba en ninguna
> lista. Esta es la lista.

Verificada el 5 de octubre de 2026. Es la documentación de la constante
`OBLIGACIONES` de `worker.js`, que es lo que de verdad lee el panel
(«Contabilidad › Vencimientos» y la cola de «Hoy») y el correo diario a
contabilidad. **Si cambias una fecha aquí, cámbiala allá en el mismo PR**, y al
revés.

Las mismas fechas están en el Google Calendar de Sebas (color Uva). El panel es
la vista operativa: ahí se marca cada vencimiento como **«Hecho»** o **«No aplicó
este periodo»**, y eso queda en la tabla `obligaciones_cumplidas` (migración
0037).

## Datos que fijan las fechas

- **NIT 901.948.930-2.** Último dígito **0**; dos últimos **30**. De ahí salen
  las fechas de la DIAN.
- **UVT 2026 = $52.374** (Res. DIAN 238 de 2025).
- Responsabilidades del RUT: 04 (renta, régimen especial), 07 (agente de
  retención en la fuente), 14 (informante de exógena), 42 (obligado a llevar
  contabilidad), 55 (informante de beneficiarios finales). **No** es responsable
  de IVA (no tiene la 48).

## El calendario

| clave | entidad | obligación | condición | vencimientos |
|---|---|---|---|---|
| `ica-2025` | Alcaldía de Medellín | ICA del año gravable 2025, **extemporánea**. Venció el 17 abr 2026. Sanción mínima 10 UVT (art. 346 Acuerdo 93 de 2023) = **$523.740** con la UVT 2026 | aplica | objetivo **2026-10-09**; límite práctico **2026-12-31** (en 2027 se liquida con la UVT nueva) |
| `retencion-350` | DIAN | Retención en la fuente, formulario 350, mensual | **solo si ese mes hubo retenciones** (art. 606 par. ET); si se presenta, sin pago total es ineficaz (art. 580-1 ET) | 2026-10-23 (sep), 2026-11-25 (oct), 2026-12-23 (nov), 2027-01-26 (dic 2026), 2027-02-22, 03-23, 04-22, 05-25, 06-23, 07-26, 08-24, 09-22, 10-25, 11-24, 12-23 (nov 2027); 2028-01-25 (dic 2027) |
| `rub` | DIAN | Actualización de beneficiarios finales (Res. 164 de 2021, art. 11) | **solo si hubo cambios** en el trimestre | 2026-11-03 (jul–sep 2026), 2027-02-01, 2027-05-03, 2027-08-02, 2027-11-02 |
| `cert-donacion` | DIAN | Certificados de donación del año anterior (art. 1.2.1.4.3 DUR 1625 de 2016) | aplica | 2027-01-29 (el legal es el 31 ene, que cae domingo) |
| `asamblea` | Fundación | Reunión del máximo órgano: estados financieros, excedentes (art. 1.2.1.5.1.27 DUR), presupuesto, informe de gestión | aplica | límite 2027-03-31 |
| `camara` | Cámara de Comercio | Renovación anual del registro de la ESAL (Ley 1727 de 2014) | aplica | 2027-03-31 |
| `cert-retencion` | DIAN | Certificados de retención a proveedores (art. 381 ET) | si hubo retenciones en el año | 2027-03-31 |
| `ica-anual` | Alcaldía de Medellín | Declaración de ICA del año gravable 2026 | aplica: la beneficencia se declara como no sujeta (art. 51 num. 7 Acuerdo 93 de 2023) | 2027-04-16 **por confirmar** (en 2026 fue el 17 abr) |
| `gobernacion` | Gobernación de Antioquia | Reporte anual de documentación a la entidad de vigilancia (Circular K) | aplica | 2027-04-30 **por confirmar** (la circular de 2025 decía «antes del 30 de abril») |
| `exogena` | DIAN | Exógena del año gravable 2026, formato 1001 | aplica como agente de retención; confirmar con el contador si se reporta en un año sin retenciones | 2027-05-21 |
| `renta` | DIAN | Renta del RTE, formulario 110, y primera cuota. Activos en el exterior el mismo día si superan 2.000 UVT | aplica | 2027-05-25 |
| `rte-actualizacion` | DIAN | Actualización anual del registro web del RTE (art. 364-5 ET); si no se hace, la Fundación sale del RTE | aplica | 2027-06-30 |
| `renta-cuota2` | DIAN | Segunda cuota de renta | si la declaración deja impuesto a cargo | 2027-07-26 |
| `revision-calendario` | Fundación | **Actualizar este calendario para el año siguiente** | aplica | 2026-12-01 (calendario 2027), 2027-12-01 (calendario 2028) |

## Cómo se calcularon las fechas de la DIAN de 2027

El Decreto 2229 de 2023 fijó los plazos del calendario tributario **«a partir de
2024 y siguientes»**: en vez de un decreto nuevo cada año, una regla por último
dígito (o dos últimos dígitos) del NIT y día hábil del mes. Las fechas de 2026
se cotejaron contra el calendario publicado para 2026 y coinciden con la regla.
Las de 2027 **se calcularon con la misma regla** (corriendo los festivos de
Colombia de 2027) y **no se han cotejado contra un calendario publicado**: el
panel las marca **«por confirmar»**.

En el código eso lo decide la constante `DIAN_PUBLICADO_HASTA` (hoy
`2026-12-31`): toda fecha de la DIAN posterior sale «por confirmar». Las de
Medellín y la Gobernación llevan la marca en la propia obligación
(`porConfirmar: true`), porque salen de una resolución o circular nueva cada año.

## La revisión de cada diciembre

Es una obligación más de la lista (`revision-calendario`), así que aparece en
«Hoy» dos semanas antes. Qué hay que hacer:

1. Cotejar las fechas del año siguiente contra el calendario de la DIAN (y si
   salió un decreto que cambie el 2229 de 2023), la resolución del calendario
   tributario de Hacienda de Medellín y la circular de la Gobernación.
2. Escribir las fechas del año que entra en `OBLIGACIONES` (`worker.js`) y en
   este archivo, quitar `porConfirmar` de lo que ya esté publicado y subir
   `DIAN_PUBLICADO_HASTA`.
3. Añadir el `revision-calendario` del diciembre siguiente.
4. Es un PR, con el gate en verde. Las fechas viejas **no se borran** mientras
   tengan marcas en `obligaciones_cumplidas` que quieras seguir viendo.

Una `clave` no se renombra nunca: es lo que guarda la tabla.

## Lo que NO aplica hoy (y por qué)

- **Memoria económica** del RTE: solo por encima de 160.000 UVT de ingresos.
- **Registro Nacional de Bases de Datos (SIC)**: solo con activos por encima de
  100.000 UVT.
- **Retención y autorretención de ICA en Medellín**: la Fundación no está
  designada agente.
- **Exógena municipal de Medellín**: por debajo de los topes.
- **SAGRILAFT y reportes ROS a la UIAF**: no es sujeto obligado.
- **PILA y nómina electrónica**: no hay empleados.
- **IVA**: sin la responsabilidad 48 en el RUT.

## Lo que DEPENDE (decidir antes de que aplique)

- **Declaración de activos en el exterior**: si el saldo en PayPal (u otro
  activo afuera) supera 2.000 UVT al 1 de enero, va el mismo día que la renta.
- **Factura electrónica de las membresías**: depende de si la membresía es una
  donación o un servicio. Decisión con el contador.
- **Registro en el Sistema Nacional de Voluntariado**: voluntario, no obligatorio.

## Fuentes

- Decreto 2229 de 2023 (calendario tributario): https://normograma.dian.gov.co/dian/compilacion/docs/decreto_2229_2023.htm
- Decreto 2150 de 2017 (Régimen Tributario Especial): https://normograma.dian.gov.co/dian/compilacion/docs/decreto_2150_2017.htm
- Resolución DIAN 164 de 2021 (beneficiarios finales): https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0164_2021.htm
- Resolución DIAN 227 de 2025 (exógena): https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm
- Acuerdo 093 de 2023 de Medellín (estatuto tributario): https://www.medellin.gov.co/es/wp-content/uploads/2024/01/ACUERDO-093-2023-GACETA.pdf
- Resolución 202550100057 de 2025 (calendario tributario de Medellín 2026): https://www.medellin.gov.co/es/wp-content/uploads/2025/12/RESOLUCION-202550100057-DE-2025-CALENDARIO-TRIBUTARIO-2026.pdf
- Circular de la Gobernación de Antioquia (2025): https://www.antioquia.gov.co/images/PDF2/Circulares/2025/02/202590000038.pdf
- Ley 1727 de 2014 (renovación en Cámara de Comercio): http://www.secretariasenado.gov.co/senado/basedoc/ley_1727_2014.html

## Cómo avisa el sistema

- **«Hoy»**: entra lo que no está marcado y está vencido o vence en 14 días o
  menos (`OBLIGACIONES_DIAS_COLA`). Si algo está vencido o a 3 días o menos, la
  cola sale «vencida» y sube arriba de la portada.
- **Correo diario** (cron de las 9 a. m., `resumenObligaciones`): a
  `CORREO_AVISOS` (contabilidad), solo con lo vencido o a 3 días o menos
  (`OBLIGACIONES_DIAS_CORREO`), una vez al día como máximo (etiqueta
  `resumen-diario-obligaciones`).
- Lo que «solo aplica si…» hay que cerrarlo igual: **«No aplicó este periodo»**.
  Si no, sigue saliendo.
