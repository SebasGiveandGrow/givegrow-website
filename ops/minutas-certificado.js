/* ===========================================================================
   Minutas del certificado de donación · uso interno
   ===========================================================================
   Genera dos .docx para llenar a mano y firmar: DINERO y ESPECIE. Existen para
   los casos que el sistema no puede resolver solo — una donación que no entró
   por el sitio, o una en especie, que el certificado automático no cubre.

   POR QUÉ VIVE AQUÍ Y NO EN EL DRIVE
   El articulado de estas minutas es el MISMO que arma `documentos.js`. Cuando
   dos copias del mismo texto legal viven en sistemas distintos, se separan sin
   que nadie lo note: los documentos del Drive decían Art. 125 / 125% mientras
   el sitio decía Art. 257 / 25%, y así estuvieron meses. Con el generador al
   lado del código, un cambio en el articulado sale en el mismo diff — y el
   check #10 de `validate.mjs` falla el build si alguien toca uno y no el otro.

   POR QUÉ LOS .docx NO SE COMMITEAN
   Este repositorio es público. Las cédulas y el articulado ya lo son (viven en
   `documentos.js`), así que un .docx no revelaría nada nuevo; lo que sí dejaría
   es una plantilla EDITABLE y lista para llenar de un documento que se rinde
   bajo la gravedad de juramento y que compromete a la Revisora Fiscal. El
   generador se versiona; los documentos que produce viven en el Drive.
   (`ops/` está en `.assetsignore`: no se sirve desde el sitio. Verificado
   contra producción — /ops/… devuelve el index.html de la SPA.)

   LA NUMERACIÓN NO PUEDE CHOCAR CON LA DEL SISTEMA
   D1 lleva su consecutivo de certificados desde CD-2026-000001. Las minutas se
   numeran desde CD-2026-900001, en un bloque aparte, porque dos sistemas que
   numeran lo mismo terminan emitiendo el mismo número para documentos
   distintos — ya pasó entre D1 y la hoja de cálculo con las guías de donación.

   CÓMO SE CORRE
     npm i docx --no-save          (no es dependencia del sitio: pdf-lib sigue
                                    siendo la única, ver CLAUDE.md)
     node ops/minutas-certificado.js [directorio de salida]

   Detalle de uso y de llenado en ops/minutas-certificado.md.
   =========================================================================== */

import fs from "node:fs";
import path from "node:path";

/* El paquete es CommonJS y el repositorio es `"type": "module"`, así que se
   carga con import dinámico y se toma su `default`. Va en try/catch porque no
   es dependencia declarada: el mensaje tiene que decir qué instalar, no soltar
   un stack de resolución de módulos. */
let D;
try {
  const mod = await import("docx");
  D = mod.default ?? mod;
} catch (e) {
  console.error(
    "No se pudo cargar la librería `docx`, que NO es dependencia del sitio a propósito.\n" +
    "Instálala solo para esta corrida:\n\n  npm i docx --no-save\n\n" +
    "Detalle: " + (e && e.message) + "\n"
  );
  process.exit(1);
}

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType
} = D;

const VERDE = "1F5C38";
const TINTA = "191813";
const GRIS  = "5C636F";
const LINEA = "DAD3C3";
const RELLENO = "F2EEE4";       // el hueso del sitio, como fondo de campo
const FUENTE = "Arial";

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NADA = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };

/* --- piezas de texto ---------------------------------------------------- */

/* Un campo por llenar. Va sombreado para que se vea de un vistazo lo que falta:
   una minuta con un hueco sin llenar es un certificado falso, y en gris se
   detecta hojeando. */
const campo = (txt, ancho = 0) =>
  new TextRun({
    text: ancho ? txt + " ".repeat(ancho) : txt,
    font: FUENTE, size: 20, color: TINTA, bold: true,
    shading: { type: ShadingType.CLEAR, fill: RELLENO }
  });

const t = (txt, o = {}) => new TextRun({
  text: txt, font: FUENTE, size: o.size || 20, color: o.color || TINTA,
  bold: !!o.bold, italics: !!o.italics
});

const p = (hijos, o = {}) => new Paragraph({
  children: Array.isArray(hijos) ? hijos : [hijos],
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after == null ? 140 : o.after, line: o.line || 260 },
  indent: o.indent,
  border: o.border,
  keepNext: o.keepNext
});

const texto = (s, o = {}) => p(t(s, o), o);

/* Numeral de la sección II / III: sangría francesa, como en el PDF. */
const numeral = (n, hijos) => new Paragraph({
  children: [t(n === "•" ? "•   " : n + ". ", { bold: true }), ...(Array.isArray(hijos) ? hijos : [hijos])],
  alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 120, line: 260 },
  indent: { left: 340, hanging: 340 }
});

const seccion = (rom, titulo) => new Paragraph({
  children: [t(rom + ". " + titulo, { bold: true, size: 20, color: VERDE })],
  spacing: { before: 260, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 4 } },
  keepNext: true
});

const regla = (antes = 0, despues = 0) => new Paragraph({
  children: [t("")],
  spacing: { before: antes, after: despues },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 1 } }
});

const salto = () => new Paragraph({ children: [new PageBreak()] });

/* --- membrete y firmas -------------------------------------------------- */

function membrete() {
  return [
    new Paragraph({
      children: [t("FUNDACIÓN GIVE&GROW INTERNATIONAL", { bold: true, size: 17, color: VERDE })],
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [t("NIT 901.948.930-2  ·  Carrera 82 A # 9 A Sur 28, Medellín (Antioquia)  ·  thegiveandgrowproject.org",
        { size: 15, color: GRIS })],
      spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: VERDE, space: 6 } }
    }),
    new Paragraph({ children: [t("")], spacing: { after: 200 } })
  ];
}

function firmas() {
  const col = (nombre, cargo, lineas) => new TableCell({
    width: { size: 4400, type: WidthType.DXA },
    margins: { top: 60, bottom: 0, left: 0, right: 120 },
    borders: { top: { style: BorderStyle.SINGLE, size: 6, color: TINTA }, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE },
    children: [
      new Paragraph({ children: [t(nombre, { bold: true, size: 19 })], spacing: { after: 20 } }),
      new Paragraph({ children: [t(cargo, { size: 17, color: GRIS })], spacing: { after: 20 } }),
      ...lineas.map((l) => new Paragraph({ children: [t(l, { size: 17, color: GRIS })], spacing: { after: 20 } }))
    ]
  });

  return [
    new Paragraph({ children: [t("")], spacing: { before: 700, after: 0 } }),
    new Table({
      columnWidths: [4400, 4400],
      width: { size: 8800, type: WidthType.DXA },
      borders: NADA,
      rows: [new TableRow({
        children: [
          col("JUAN SEBASTIÁN NAVARRO OSORIO", "Representante Legal", ["C.C. 1.007.420.930"]),
          col("MANUELA LONDOÑO ARBOLEDA", "Revisora Fiscal", ["C.C. 1.040.745.501", "T.P. 244894-T"])
        ]
      })]
    })
  ];
}

/* --- las tres secciones que son idénticas en las dos minutas ------------ */

function seccionIII() {
  return [
    seccion("III", "DECLARACIONES SOBRE EL CUMPLIMIENTO DE CONDICIONES LEGALES"),
    texto("Para efectos de lo previsto en los artículos 125-1, 125-2 y 125-3 del Estatuto Tributario, se certifica que la Fundación:", { size: 19 }),
    numeral(1, t("Ha sido reconocida como persona jurídica sin ánimo de lucro y está sometida en su funcionamiento a vigilancia oficial.")),
    numeral(2, t("Ha cumplido con la obligación de presentar la declaración de renta y complementarios o de ingresos y patrimonio, según el caso, correspondiente al año inmediatamente anterior al de la donación.")),
    numeral(3, t("Maneja los ingresos por donaciones en depósitos o inversiones en establecimientos financieros autorizados.")),
    numeral(4, t("Se encuentra calificada y vigente en el Régimen Tributario Especial, y no está incursa en ninguna de las causales de exclusión previstas en el artículo 364-3 del Estatuto Tributario.")),
    numeral(5, t("Destina la totalidad de sus excedentes al desarrollo de su actividad meritoria, y ni el patrimonio ni los excedentes se distribuyen, directa ni indirectamente, entre el fundador o miembros, ni durante su existencia ni al momento de su disolución y liquidación.")),
    numeral(6, t("La donación aquí certificada constituye un acto de mera liberalidad y no dio lugar a contraprestación alguna, directa ni indirecta, a favor del donante.")),
    numeral(7, t("La donación no consistió en acciones, cuotas partes, participaciones, títulos valores, derechos o acreencias poseídos en entidades o sociedades."))
  ];
}

function seccionIV() {
  return [
    seccion("IV", "SUSTENTO CONTABLE DE LA CERTIFICACIÓN"),
    texto("La información aquí certificada fue tomada de los libros de contabilidad de la Fundación, los cuales se llevan conforme a las normas legales vigentes y al Marco Técnico Normativo de Información Financiera para Pymes (Grupo 2), y se encuentran debidamente registrados. La Revisora Fiscal realizó las verificaciones propias de su función respecto del registro, la existencia y la destinación de la donación aquí relacionada, con base en las cuales suscribe la presente certificación.", { size: 19 })
  ];
}

function seccionV() {
  return [
    seccion("V", "EFECTOS"),
    texto("El contenido de esta certificación se entiende rendido bajo la gravedad del juramento, sirve como soporte del descuento tributario del donante y estará disponible para la Administración Tributaria cuando esta lo requiera.", { size: 19 }),

    /* El aviso del 257 va en caja, igual que en el PDF: es lo único que el
       donante puede malinterpretar a su favor. */
    new Table({
      columnWidths: [8800],
      width: { size: 8800, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
        left: { style: BorderStyle.SINGLE, size: 18, color: VERDE },
        right: { style: BorderStyle.SINGLE, size: 6, color: LINEA }
      },
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: 8800, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: "FBF8F1" },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [texto("Se informa al donante que, conforme al artículo 257 del Estatuto Tributario, las donaciones efectuadas a entidades sin ánimo de lucro calificadas en el Régimen Tributario Especial no son deducibles del impuesto sobre la renta, pero dan lugar a un descuento del impuesto equivalente al 25% del valor donado en el año o período gravable, con sujeción al límite del artículo 258 del mismo Estatuto. La procedencia y aplicación de este descuento corresponde al donante y a su asesor tributario.", { size: 18, after: 0 })]
        })]
      })]
    }),
    new Paragraph({ children: [t("")], spacing: { after: 160 } }),
    texto("La presente certificación se expide en cumplimiento del artículo 125-3 del Estatuto Tributario y del numeral 2 del artículo 1.2.1.4.3 del Decreto 1625 de 2016, y únicamente puede ser utilizada por el donante identificado en el numeral I.", { size: 19 })
  ];
}

/* --- encabezado común de la minuta -------------------------------------- */

function cabecera(clase) {
  return [
    ...membrete(),
    new Paragraph({
      children: [t("CERTIFICADO DE DONACIÓN", { bold: true, size: 30 })],
      alignment: AlignmentType.CENTER, spacing: { after: 80 }
    }),
    new Paragraph({
      children: [t("No. ", { bold: true, size: 22, color: VERDE }), campo("CD-2026-______", 0)],
      alignment: AlignmentType.CENTER, spacing: { after: 60 }
    }),
    new Paragraph({
      children: [t("(donación en " + clase + ")", { size: 17, color: GRIS, italics: true })],
      alignment: AlignmentType.CENTER, spacing: { after: 180 }
    }),
    new Paragraph({
      children: [t("Medellín, ", { size: 18, color: GRIS }), campo("____ de __________ de 2026")],
      alignment: AlignmentType.CENTER, spacing: { after: 300 }
    }),

    texto("La FUNDACIÓN GIVE&GROW INTERNATIONAL, entidad sin ánimo de lucro identificada con NIT 901.948.930-2, con domicilio principal en la Carrera 82 A # 9 A Sur 28 de Medellín (Antioquia), calificada y vigente en el Régimen Tributario Especial del impuesto sobre la renta y complementarios, a través de los suscritos Representante Legal y Revisora Fiscal,", { after: 220 }),

    regla(0, 120),
    new Paragraph({
      children: [t("CERTIFICA BAJO LA GRAVEDAD DE JURAMENTO", { bold: true, size: 22, color: VERDE })],
      alignment: AlignmentType.CENTER, spacing: { after: 120 }
    }),
    regla(0, 220),

    texto("Que recibió a título de donación, del donante que a continuación se identifica, el aporte cuyas condiciones se detallan:", { after: 240 }),

    seccion("I", "IDENTIFICACIÓN DEL DONANTE"),
    p([t("Nombre o razón social: ", { bold: true }), campo("________________________________________________")]),
    p([t("C.C. o NIT No.: ", { bold: true }), campo("________________________________")]),
    p([t("Domicilio: ", { bold: true }), campo("________________________________________________")], { after: 200 })
  ];
}

/* --- instructivo (hoja que se descarta antes de imprimir) --------------- */

function instructivo(clase, especificos) {
  return [
    new Paragraph({
      children: [t("CÓMO SE LLENA ESTA MINUTA", { bold: true, size: 26, color: VERDE })],
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [t("Certificado de donación " + clase + "  ·  uso interno", { size: 18, color: GRIS })],
      spacing: { after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: VERDE, space: 6 } }
    }),
    new Paragraph({ children: [t("")], spacing: { after: 220 } }),

    new Paragraph({
      children: [t("Esta hoja NO hace parte del certificado. Bórrala antes de imprimir o de enviar el PDF.", { bold: true, size: 19 })],
      shading: { type: ShadingType.CLEAR, fill: RELLENO },
      spacing: { after: 240, line: 260 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 6 },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 6 },
        left: { style: BorderStyle.SINGLE, size: 18, color: VERDE, space: 6 },
        right: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 6 }
      }
    }),

    texto("Todo lo que aparece sombreado es un campo por llenar. Un campo sin llenar convierte el documento en un certificado falso rendido bajo juramento: revisa la hoja completa antes de firmar.", { after: 220 }),

    new Paragraph({ children: [t("1. Antes de firmar el primero del año — dos hechos que hay que comprobar", { bold: true, size: 21, color: VERDE })], spacing: { before: 120, after: 120 } }),
    texto("Los numerales III.2 y III.4 no son fórmulas: son afirmaciones de hecho que se rinden bajo juramento y que nadie puede verificar por ti.", { after: 100 }),
    numeral("•", t("III.2 — que esté presentada la declaración de renta del año gravable anterior al de la donación (para las de 2026, la de 2025).")),
    numeral("•", t("III.4 — que la calificación en el Régimen Tributario Especial esté VIGENTE. La permanencia exige la actualización anual del registro web ante la DIAN; sin ella, «vigente» no se sostiene.")),
    texto("Si alguna de las dos no se cumple hoy, el certificado no se firma todavía.", { after: 220, bold: true }),

    new Paragraph({ children: [t("2. El número del certificado", { bold: true, size: 21, color: VERDE })], spacing: { before: 120, after: 120 } }),
    texto("El sitio lleva su propio consecutivo de certificados en la base de datos, y arranca en CD-2026-000001. Si una minuta usa un número de ese mismo rango, dos documentos distintos terminan con el mismo número — que es exactamente lo que pasó con las guías de donación entre D1 y la hoja de cálculo.", { after: 100 }),
    texto("Por eso las minutas usan un bloque aparte: numéralas desde CD-2026-900001 en adelante, en orden y sin saltos. Así el número dice solo con verlo que ese certificado se expidió a mano, y nunca choca con los del sistema.", { after: 220 }),

    new Paragraph({ children: [t("3. Qué se llena en cada sección", { bold: true, size: 21, color: VERDE })], spacing: { before: 120, after: 120 } }),
    ...especificos,

    new Paragraph({ children: [t("4. Después de firmar", { bold: true, size: 21, color: VERDE })], spacing: { before: 120, after: 120 } }),
    numeral("•", t("Escanea el documento firmado y guárdalo. La copia firmada es el soporte: la minuta en blanco no prueba nada.")),
    numeral("•", t("Anota en la contabilidad el número del certificado junto al registro de la donación, para que el consecutivo manual quede conciliado.")),
    numeral("•", t("Si aparece un error después de firmar, el certificado NO se corrige: se anula, se deja constancia del motivo y se expide uno nuevo con el número siguiente. El número anulado conserva su hueco.")),
    numeral("•", t("El certificado se expide, como mínimo, dentro del mes siguiente a la finalización del año gravable en que se recibió la donación (Decreto 1625 de 2016, art. 1.2.1.4.3 num. 2). Expedirlo antes es válido y es lo que estamos haciendo.")),

    new Paragraph({ children: [t("5. Lo que este documento no puede decir", { bold: true, size: 21, color: VERDE })], spacing: { before: 200, after: 120 } }),
    texto("El numeral III.6 jura que la donación no dio lugar a contraprestación. Se sostiene para un aporte único. NO se puede firmar sobre una donación que vino con carnet, membresía, publicidad o cualquier beneficio para quien donó, sin revisarlo antes con la Revisora Fiscal.", { after: 200 }),

    salto()
  ];
}

/* --- minuta A: DINERO ---------------------------------------------------- */

const instructivoDinero = [
  numeral("•", [t("II.1 — la fecha en que ENTRÓ el dinero, no la del certificado.")]),
  numeral("•", [t("II.4 — el valor en cifras y el mismo valor en letras. El artículo 125-3 pide las dos; si no coinciden, prevalece la que esté en letras y el documento queda en discusión.")]),
  numeral("•", [t("II.5 — deja únicamente la modalidad que aplica (consignación o transferencia) y borra la otra. El número es el del comprobante bancario, no un identificador interno ni un id de pasarela: es el que la DIAN puede cruzar contra el extracto.")]),
  numeral("•", [t("II.6 — la destinación real: el fondo general del HUB SOCIAL, la brigada de atención a emergencia, o el programa concreto. Si el donante dirigió su aporte, aquí va ese destino y no el genérico.")])
];

function minutaDinero() {
  return [
    ...instructivo("en dinero", instructivoDinero),

    ...cabecera("dinero"),

    seccion("II", "INFORMACIÓN DE LA DONACIÓN"),
    numeral(1, [t("Fecha de la donación: "), campo("____ de __________ de 2026"), t(".")]),
    numeral(2, t("Tipo de entidad donataria: entidad sin ánimo de lucro, calificada en el Régimen Tributario Especial del impuesto sobre la renta y complementarios, sometida en su funcionamiento a la inspección, vigilancia y control de la Gobernación de Antioquia.")),
    numeral(3, t("Clase de bien donado: dinero.")),
    numeral(4, [t("Valor de la donación: $"), campo("________________"), t(" ("), campo("________________________________________"), t(" pesos M/cte.).")]),
    numeral(5, [
      t("Manera en que se efectuó la donación: mediante "),
      campo("[consignación / transferencia electrónica]"),
      t(" No. "), campo("________________"), t(" del "), campo("____ de __________ de 2026"),
      t(", realizada a través del sistema financiero en la cuenta de ahorros No. 31000009221 de Bancolombia, en cumplimiento de lo previsto en el numeral 1 del artículo 125-2 del Estatuto Tributario.")
    ]),
    numeral(6, [
      t("Destinación de la donación: los recursos donados fueron incorporados al patrimonio de la Fundación y destinados exclusivamente al desarrollo de su objeto social y de su actividad meritoria de interés general, de acceso a la comunidad, consistente en "),
      campo("________________________________________"),
      t(", en beneficio de la población vulnerable atendida a través del HUB SOCIAL.")
    ]),

    ...seccionIII(),
    ...seccionIV(),
    ...seccionV(),
    ...firmas()
  ];
}

/* --- minuta B: ESPECIE --------------------------------------------------- */

const instructivoEspecie = [
  numeral("•", [t("II.1 — la fecha de la ENTREGA FÍSICA de los bienes, que es la que consta en el acta de recibido.")]),
  numeral("•", [t("II.4 — el valor total del Anexo 1. "), t("La Fundación no estima ese valor: lo soporta el donante.", { bold: true }), t(" El artículo 125-2, parágrafo 1 exige certificar el MENOR entre el valor comercial y el costo fiscal del bien. Sin factura, cotización o soporte del donante, esta casilla no se llena y el certificado no se expide.")]),
  numeral("•", [t("II.5 — el número del acta de recibido (AE-2026-______), que es el documento que prueba la entrega. Si no hay acta firmada, no hay certificado.")]),
  numeral("•", [t("Anexo 1 — una fila por tipo de bien. Añade las filas que necesites. La columna «soporte» es la factura o documento del donante que respalda el valor; si un renglón no tiene soporte, se saca del certificado.")]),
  numeral("•", [t("Bienes usados: solo se certifican si el donante puede soportar su valor. Ropa y enseres de segunda mano casi nunca lo permiten y por regla no entran.")])
];

function tablaAnexo() {
  const cabeza = ["Descripción del bien", "Cant.", "Unidad", "Valor unitario", "Valor total", "Soporte (factura No.)"];
  const anchos = [2900, 700, 900, 1400, 1400, 1500];

  const celdaCab = (txt, i) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "F2EEE4" },
    margins: { top: 80, bottom: 80, left: 90, right: 90 },
    children: [new Paragraph({ children: [t(txt, { bold: true, size: 16 })], spacing: { after: 0 } })]
  });

  const celdaVacia = (i) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    margins: { top: 130, bottom: 130, left: 90, right: 90 },
    children: [new Paragraph({ children: [t("")], spacing: { after: 0 } })]
  });

  const filas = [new TableRow({ tableHeader: true, children: cabeza.map(celdaCab) })];
  for (let i = 0; i < 7; i++) filas.push(new TableRow({ children: anchos.map((_, j) => celdaVacia(j)) }));

  /* Última fila: el total. Va en la tabla y no suelto debajo porque es el número
     que se copia al numeral II.4 y no puede quedar lejos de lo que suma. */
  filas.push(new TableRow({
    children: [
      new TableCell({
        width: { size: anchos[0] + anchos[1] + anchos[2] + anchos[3], type: WidthType.DXA },
        columnSpan: 4,
        shading: { type: ShadingType.CLEAR, fill: "F2EEE4" },
        margins: { top: 110, bottom: 110, left: 90, right: 90 },
        children: [new Paragraph({ children: [t("VALOR TOTAL DE LA DONACIÓN EN ESPECIE", { bold: true, size: 16 })], alignment: AlignmentType.RIGHT, spacing: { after: 0 } })]
      }),
      new TableCell({
        width: { size: anchos[4], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "F2EEE4" },
        margins: { top: 110, bottom: 110, left: 90, right: 90 },
        children: [new Paragraph({ children: [t("$", { bold: true, size: 16 })], spacing: { after: 0 } })]
      }),
      new TableCell({
        width: { size: anchos[5], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "F2EEE4" },
        margins: { top: 110, bottom: 110, left: 90, right: 90 },
        children: [new Paragraph({ children: [t("")], spacing: { after: 0 } })]
      })
    ]
  }));

  return new Table({
    columnWidths: anchos,
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
      left: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
      right: { style: BorderStyle.SINGLE, size: 6, color: LINEA },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINEA },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LINEA }
    },
    rows: filas
  });
}

function minutaEspecie() {
  return [
    ...instructivo("en especie", instructivoEspecie),

    ...cabecera("especie"),

    seccion("II", "INFORMACIÓN DE LA DONACIÓN"),
    numeral(1, [t("Fecha de la donación: "), campo("____ de __________ de 2026"), t(".")]),
    numeral(2, t("Tipo de entidad donataria: entidad sin ánimo de lucro, calificada en el Régimen Tributario Especial del impuesto sobre la renta y complementarios, sometida en su funcionamiento a la inspección, vigilancia y control de la Gobernación de Antioquia.")),
    numeral(3, [t("Clase de bien donado: bienes en especie, según la descripción, cantidad y unidades detalladas en el Anexo 1 de este certificado, que hace parte integral del mismo.")]),
    numeral(4, [
      t("Valor de la donación: $"), campo("________________"), t(" ("), campo("________________________________________"),
      t(" pesos M/cte.). Conforme al parágrafo 1 del artículo 125-2 del Estatuto Tributario, el valor certificado corresponde al menor entre el valor comercial y el costo fiscal de los bienes donados.")
    ]),
    numeral(5, [
      t("Manera en que se efectuó la donación: mediante entrega física de los bienes, documentada en el acta de recibido No. "),
      campo("AE-2026-________"), t(" del "), campo("____ de __________ de 2026"), t(".")
    ]),
    numeral(6, [
      t("Destinación de la donación: los bienes donados fueron incorporados al patrimonio de la Fundación y destinados exclusivamente al desarrollo de su objeto social y de su actividad meritoria de interés general, de acceso a la comunidad, consistente en "),
      campo("________________________________________"),
      t(", en beneficio de la población vulnerable atendida a través del HUB SOCIAL.")
    ]),

    ...seccionIII(),
    ...seccionIV(),
    ...seccionV(),
    ...firmas(),

    salto(),
    new Paragraph({
      children: [t("ANEXO 1 · DETALLE DE LOS BIENES DONADOS", { bold: true, size: 22, color: VERDE })],
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [t("Hace parte integral del Certificado de Donación No. ", { size: 18, color: GRIS }), campo("CD-2026-________")],
      spacing: { after: 200 }
    }),
    texto("El valor de cada renglón corresponde al menor entre el valor comercial y el costo fiscal del bien, soportado en el documento que se relaciona en la última columna (art. 125-2, parágrafo 1 del Estatuto Tributario).", { size: 18, after: 200 }),
    tablaAnexo(),
    new Paragraph({ children: [t("")], spacing: { after: 200 } }),
    texto("Los bienes relacionados fueron recibidos en las condiciones descritas y quedaron registrados en la contabilidad de la Fundación.", { size: 18, after: 0 }),
    ...firmas()
  ];
}

/* --- armado -------------------------------------------------------------- */

function documento(hijos) {
  return new Document({
    creator: "Fundación Give&Grow International",
    description: "Minuta de certificado de donación",
    title: "Certificado de donación",
    styles: {
      default: {
        document: { run: { font: FUENTE, size: 20, color: TINTA } }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },   // carta
          margin: { top: 1160, right: 1240, bottom: 1400, left: 1240 }
        }
      },
      children: hijos
    }]
  });
}

/* El destino es un argumento y por defecto el directorio actual: los .docx no
   se commitean (ver cabecera), así que el script no debe escribir dentro del
   repositorio por su cuenta. */
const salida = process.argv[2] || process.cwd();

for (const [nombre, hijos] of [
  ["Minuta-certificado-donacion-DINERO.docx", minutaDinero()],
  ["Minuta-certificado-donacion-ESPECIE.docx", minutaEspecie()]
]) {
  const buf = await Packer.toBuffer(documento(hijos));
  const destino = path.join(salida, nombre);
  fs.writeFileSync(destino, buf);
  console.log("escrito  " + destino + "  (" + buf.length + " bytes)");
}
