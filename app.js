/* ===== Give&Grow International - app.js (rebuild v4) ===== */
"use strict";

/* ---------- I18N ---------- */
var I18N = {
  es: {
    "nav.donar":"Donar",
    "nav.empresas":"Empresas",
    "nav.fundaciones":"Fundaciones",
    "nav.hub":"HUB SOCIAL",
    "nav.gratitud":"Programa de Gratitud",
    "nav.impacto":"Impacto",
    "nav.origen":"Origen",
    "nav.alma":"ALMA",
    "nav.transp":"Transparencia",
    "nav.contacto":"Contacto",
    "nav.faq":"FAQ",
    "nav.conocenos":"Conócenos",
    "hero.eyebrow":"Medellín, Colombia · ESAL · NIT 901.948.930-2",
    "hero.title":"Dar para crecer, crecer para dar más.",
    "hero.lead":"Conectamos generosidad con necesidad de forma estratégica y sostenible. No reemplazamos a las fundaciones, las amplificamos. Y aquí, quien da también crece.",
    "path.donar.t":"Quiero donar",
    "path.donar.s":"Como persona natural",
    "path.emp.t":"RSE empresarial",
    "path.emp.s":"Para mi empresa",
    "path.fund.t":"Somos fundación",
    "path.fund.s":"Unirme al Hub",
    "stat.rutas":"Rutas activas",
    "stat.pobl":"Poblaciones impactadas",
    "stat.traz":"Trazabilidad",
    "stat.fund":"Fundada en Medellín",
    "model.ey":"El modelo",
    "model.t":"El sector social opera fragmentado. Somos el puente.",
    "model.p":"Potenciamos fundaciones en campo, conectamos donantes con causas verificadas y creamos un ecosistema donde dar tiene beneficios reales para quien contribuye.",
    "model.btn":"Ver el HUB SOCIAL",
    "feat.hub.t":"HUB SOCIAL",
    "feat.hub.p":"Centro operativo de 100m2 en El Poblado. Cinco rutas que conectan alianzas, donaciones e impacto medible.",
    "feat.hub.tag":"Activo hoy",
    "feat.grat.t":"Programa de Gratitud",
    "feat.grat.p":"Red de empresas aliadas con descuentos exclusivos para todos los miembros activos.",
    "feat.grat.tag":"Nuevo",
    "feat.tax.t":"Beneficio tributario",
    "feat.tax.p":"Descuento del 25% sobre el impuesto de renta a cargo (Art. 257 ET) por cada donación vía sistema financiero.",
    "feat.tax.tag":"Para donantes",
    "traz.ey":"Cómo funciona",
    "traz.t":"Trazabilidad completa, de principio a fin.",
    "traz.1.t":"Visita de contexto",
    "traz.1.p":"Conocemos a la fundación y la comunidad en terreno.",
    "traz.2.t":"Onboarding",
    "traz.2.p":"Perfil digital y convenio firmado entre las partes.",
    "traz.3.t":"Gestión de necesidades",
    "traz.3.p":"Conectamos la necesidad concreta con el donante adecuado.",
    "traz.4.t":"Entrega con acta",
    "traz.4.p":"Cada entrega queda documentada y verificada.",
    "traz.5.t":"Reporte fotográfico",
    "traz.5.p":"El donante recibe evidencia mensual del impacto real.",
    "comm.ey":"Comunidades reales",
    "comm.t":"Impacto medible. Personas reales.",
    "origen.ey":"Nuestro origen",
    "origen.t":"Casi cuatro años en terreno antes de fundar nada.",
    "origen.p1":"Give&Grow International nace de la experiencia de campo de Juan Sebastián Navarro Osorio en La Guajira, la Sierra Nevada y las comunas de Medellín. Casi cuatro años trabajando donde el acceso es difícil y la confianza se gana caminando.",
    "origen.p2":"La fundación se constituyó el 19 de mayo de 2025 en El Poblado, Medellín, como Entidad Sin Ánimo de Lucro (ESAL) bajo el Régimen Tributario Especial. El propósito: que la generosidad llegue a donde más se necesita, con trazabilidad y sin intermediarios opacos.",
    "hub.ey":"HUB SOCIAL",
    "hub.t":"Cinco rutas. Un solo propósito.",
    "hub.lead":"El centro operativo donde alianzas, donaciones e impacto se encuentran. Un espacio de 100m2 en El Poblado, Medellín.",
    "hub.r1.t":"R1 - Alianzas con Fundaciones",
    "hub.r1.p":"Red de fundaciones preaprobadas que reciben apoyo y, en algunos casos, contribuyen servicios al Hub.",
    "hub.r2.t":"R2 - Gestión de Donaciones",
    "hub.r2.p":"Donaciones en especie y monetarias, gestionadas con trazabilidad completa.",
    "hub.r3.t":"R3 - Social Grow",
    "hub.r3.p":"Formación y fortalecimiento de capacidades para las fundaciones aliadas.",
    "hub.r4.t":"R4 - Impact Journey",
    "hub.r4.p":"Experiencias que llevan a donantes y equipos al campo, con comunidades reales.",
    "hub.r5.t":"R5 - Conexión Laboral",
    "hub.r5.p":"Puente hacia oportunidades de empleo para poblaciones vulnerables.",
    "hub.pob.t":"Ocho poblaciones que acompañamos",
    "hub.pob.list":"Niñez en riesgo - Comunidades indígenas - Comunidades campesinas - Personas en situación de calle - Adultos mayores - Animales en maltrato - Personas en rehabilitación - Personas privadas de la libertad",
    "emp.ey":"RSE empresarial",
    "emp.t":"Tu empresa, con propósito y trazabilidad.",
    "emp.lead":"Tres formas de aliarte. Cada una con beneficio tributario y reporte verificable.",
    "emp.p1.t":"Aliado Semilla",
    "emp.p1.p":"Donación más certificado tributario y reconocimiento como negocio con propósito.",
    "emp.p2.t":"Impact Partner",
    "emp.p2.p":"Incluye un Impact Journey para tu equipo: un día en campo con comunidades reales.",
    "emp.p3.t":"Alianza Estratégica",
    "emp.p3.p":"Co-creación, naming de ruta o programa y reportes alineados al estándar GRI.",
    "fund.ey":"Para fundaciones",
    "fund.t":"Aplica al HUB SOCIAL.",
    "fund.lead":"Más de 25 fundaciones preaprobadas. Compartamos con Colombia es aliada formal que aporta formación al Hub.",
    "fund.req.t":"Qué buscamos",
    "fund.req.p":"Fundaciones legalmente constituidas, con trabajo verificable en campo y disposición a la trazabilidad.",
    "fund.give.t":"Aliadas que aportan",
    "fund.give.p":"Un modelo novedoso: algunas fundaciones contribuyen servicios al Hub en lugar de solo recibir.",
    "fund.proto.t":"Protocolo de cumplimiento",
    "fund.proto.p":"Faltas leves van a revisión de comité con tres oportunidades; faltas gravísimas, como el mal uso de fondos, implican expulsión inmediata y acción legal.",
    "fund.btn":"Quiero aplicar",
    "grat.ey":"Programa de Gratitud",
    "grat.t":"Quien da, también recibe.",
    "grat.lead":"Una red de empresas aliadas que ofrecen beneficios exclusivos a todos los miembros activos, desde el primer nivel.",
    "grat.cat":"Gastronomía - Moda - Belleza - Bienestar - Odontología",
    "grat.how.t":"Como funciona",
    "grat.how.p":"Donas, recibes tu credencial digital de miembro y la presentas en los comercios aliados para acceder a los beneficios.",
    "imp.ey":"Impacto",
    "imp.t":"Lo que hacemos, en imágenes y datos.",
    "imp.tab.gal":"Galería",
    "imp.tab.map":"Mapa",
    "imp.tab.blog":"Historias",
    "alma.ey":"Asistente IA",
    "alma.t":"Conversa con ALMA.",
    "alma.lead":"ALMA (Asistente de Labor Misional y Alianzas) responde tus dudas sobre donaciones, alianzas y el HUB SOCIAL.",
    "alma.placeholder":"Escribe tu pregunta...",
    "hero.imgalt":"Comunidad acompañada por Give&Grow en terreno",
    "alma.send":"Enviar",
    "alma.hello":"Hola, soy ALMA. Puedo contarte cómo donar, los beneficios tributarios, las membresías o cómo aplica tu fundación al Hub. ¿En qué te ayudo?",
    "donar.ey":"Donar",
    "donar.t":"Tu donación, con destino claro.",
    "donar.lead":"Calcula tu impacto y tu beneficio tributario, luego elige cómo aportar.",
    "calc.tab.ind":"Persona",
    "calc.tab.emp":"Empresa",
    "calc.tax":"Beneficio tributario (25%)",
    "calc.net":"Costo neto de tu donación",
    "calc.annual":"Equivalente anual",
    "pay.t":"Cómo aportar",
    "pay.tab.banco":"Bancolombia",
    "pay.tab.paypal":"PayPal",
    "pay.tab.mp":"MercadoPago",
    "pay.banco.note":"Transfiere y envía el comprobante a sebas@thegiveandgrowproject.org. En 24h recibes tu credencial de miembro y tu certificado tributario.",
    "pay.bank":"Banco",
    "pay.acc":"Cuenta de Ahorros",
    "pay.holder":"Titular",
    "pay.nit":"NIT",
    "copy":"Copiar",
    "copied":"Copiado",
    "pay.paypal.note":"Para donaciones internacionales en USD. Escríbenos y te enviamos el enlace de PayPal.",
    "pay.mp.note":"Paga con tarjeta o PSE vía MercadoPago. Solicita el enlace por WhatsApp o correo.",
    "pay.wompi":"Próximamente: pagos con tarjeta y PSE vía Wompi.",
    "transp.ey":"Transparencia",
    "transp.t":"Nada que esconder.",
    "transp.p1":"Somos una Entidad Sin Ánimo de Lucro (ESAL) colombiana, constituida formalmente y bajo inspección del Estado. Aquí están nuestros datos de registro, gobernanza y compromisos financieros, verificables de forma independiente.",
    "transp.p2":"Creemos que la confianza se demuestra con hechos y documentos, no con promesas.",
    "transp.reg.t":"Registro oficial",
    "transp.reg.razon":"Razón social",
    "transp.reg.nit":"NIT",
    "transp.reg.nat":"Naturaleza jurídica",
    "transp.reg.nat.v":"ESAL - Régimen Tributario Especial (Código 04, DIAN)",
    "transp.reg.insc":"Inscripción Cámara de Comercio",
    "transp.reg.const":"Constitución",
    "transp.reg.const.v":"Documento privado del 11 de abril de 2025, registrado el 19 de mayo de 2025 (No. 1889, Libro I).",
    "transp.reg.dom":"Domicilio principal",
    "transp.reg.dur":"Duración",
    "transp.reg.dur.v":"Indefinida",
    "transp.reg.niif":"Grupo NIIF",
    "transp.reg.niif.v":"Grupo II",
    "transp.gov.t":"Gobernanza y control",
    "transp.gov.p":"La Fundación no puede distribuir excedentes: la totalidad de su patrimonio se destina a su objeto social.",
    "transp.gov.rep":"Representante legal y fundador",
    "transp.gov.rf":"Revisora Fiscal",
    "transp.gov.over":"Inspección, vigilancia y control",
    "transp.gov.over.v":"Gobernación de Antioquia",
    "transp.gov.surplus":"Destinación de excedentes",
    "transp.gov.surplus.v":"Prohibida su distribución. 100% al objeto social.",
    "transp.fin.t":"Compromiso financiero",
    "transp.fin.p":"Cumplimos las obligaciones de una ESAL bajo Régimen Tributario Especial:",
    "transp.fin.1":"Estados financieros bajo NIIF (Grupo II), firmados por la Revisora Fiscal Manuela Londoño Arboleda (T.P. 244894-T).",
    "transp.fin.2":"Declaración de renta anual ante la DIAN (Formulario 110).",
    "transp.fin.3":"Actualización anual del Registro Web RTE (Formato 5245).",
    "transp.fin.4":"Certificado de donación expedido conforme a la ley por cada aporte.",
    "transp.trace.t":"Trazabilidad de cada aporte",
    "transp.trace.p":"Confirmación en 24 horas, certificado tributario, acta de entrega y reporte fotográfico mensual del impacto.",
    "transp.verify.t":"Verifícalo tú mismo",
    "transp.verify.p":"Nuestro Certificado de Existencia y Representación Legal es público. Puedes consultar la entidad en el RUES con el NIT 901.948.930-2.",
    "transp.verify.btn":"Consultar en el RUES",
    "transp.docs.t":"Documentos públicos",
    "transp.docs.p":"Descarga los disponibles; el resto, a solicitud por correo:",
    "transp.docs.1":"Certificado de Existencia y Representación Legal",
    "transp.docs.2":"Registro Único Tributario (RUT)",
    "transp.docs.3":"Estados financieros 2025 (PDF)",
    "transp.docs.4":"Declaración de renta (Formulario 110)",
    "transp.docs.5":"Informe de gestión 2025 (PDF)",
    "transp.docs.btn":"Solicitar documentos",
    "contacto.ey":"Contacto",
    "contacto.t":"Hablemos.",
    "form.name":"Nombre",
    "form.email":"Correo",
    "form.msg":"Mensaje",
    "form.send":"Enviar mensaje",
    "contacto.email":"Correo",
    "contacto.phone":"WhatsApp",
    "contacto.loc":"Ubicación",
    "faq.ey":"Preguntas frecuentes",
    "faq.t":"Lo que más nos preguntan.",
    "faq.q1":"¿Cómo hago una donación?",
    "faq.a1":"Transfiere a la Cuenta de Ahorros Bancolombia No. 31000009221 a nombre de Fundación Give&Grow International (NIT 901.948.930-2). Envía el comprobante a sebas@thegiveandgrowproject.org y en máximo 24 horas recibes tu certificado de donación y tu credencial de membresía. Próximamente habilitaremos tarjeta y PSE vía Wompi.",
    "faq.q2":"¿Qué es el Programa de Gratitud?",
    "faq.a2":"Es una red de empresas aliadas que ofrecen descuentos exclusivos a todos los miembros activos, desde el primer nivel de membresía. Las empresas ganan visibilidad como negocios con propósito y los miembros acceden a beneficios en gastronomía, moda, belleza, bienestar y odontología.",
    "faq.q3":"¿Cómo funciona el beneficio tributario?",
    "faq.a3":"Por cada donación realizada a través del sistema financiero accedes a un descuento del 25% sobre el impuesto de renta a cargo (Art. 257 ET). Por ejemplo, $4.000.000 COP donados equivalen a $1.000.000 COP menos en tu impuesto.",
    "faq.q4":"¿Puedo ser voluntario?",
    "faq.a4":"Aceptamos voluntariado de habilidades profesionales: médicos, odontólogos, abogados, contadores, desarrolladores, docentes y más. Escríbenos a sebas@thegiveandgrowproject.org o por WhatsApp al +57 315 330 5028 indicando tu área y disponibilidad.",
    "faq.q5":"¿Mi fundación puede aplicar al Hub?",
    "faq.a5":"Sí. Buscamos fundaciones legalmente constituidas, con trabajo verificable en campo y disposición a la trazabilidad. Algunas aliadas, como Compartamos con Colombia, contribuyen servicios al Hub en lugar de solo recibir.",
    "foot.tagline":"Dar para crecer, crecer para dar más.",
    "foot.explore":"Explorar",
    "foot.legal":"Entidad",
    "foot.rights":"Todos los derechos reservados.",
    "emp.cta.t":"Hablemos de tu alianza",
    "emp.cta.p":"Diseñamos el aporte a la medida de tu empresa, con beneficio tributario y reportes verificables. Cuéntanos tu objetivo y construimos la ruta juntos.",
    "emp.cta.btn":"Quiero conversar",
    "impactos.ey":"ALMA + ImpactOS",
    "impactos.t":"ALMA es la voz de ImpactOS.",
    "impactos.lead":"ImpactOS es el sistema operativo de Give&Grow: la plataforma que conecta donantes, empresas, fundaciones y comunidades en un solo lugar. ALMA es su interfaz inteligente, la que te lleva a donde necesitas sin formularios ni menús.",
    "impactos.os.t":"Qué es ImpactOS",
    "impactos.os.p":"El sistema operativo del ecosistema. Reúne donaciones, membresías, trazabilidad de campo, certificados y alianzas en una sola plataforma. En español suena a impactos; en inglés significa Impact Operating System.",
    "impactos.alma.t":"Qué es ALMA",
    "impactos.alma.p":"La capa inteligente que hace accesible todo ImpactOS. ALMA navega, acompaña y conecta: entiende qué necesitas y te guía hasta ahí. Es a Give&Grow lo que Siri es al iPhone.",
    "impactos.eco.t":"Cómo se conecta",
    "impactos.eco.p":"Give&Grow es el ecosistema; ImpactOS, su plataforma; ALMA, la inteligencia que las une. Hoy ALMA responde tus preguntas; mañana será tu puerta de entrada a todo el ecosistema.",
    "impactos.soon":"En construcción · fase inicial",
    "alma.chip1":"¿Cómo dono?",
    "alma.chip2":"Beneficio tributario",
    "alma.chip3":"Aliar mi empresa",
    "alma.chip4":"¿Aplica mi fundación?",
    "vis.ey":"Hacia dónde vamos",
    "vis.t":"Que dar sea transparente, medible y mutuo.",
    "vis.p":"Nuestra meta es construir la red de impacto social más confiable de Colombia: que cada aporte transforme una vida con trazabilidad total y que, al hacerlo, también haga crecer a quien da. Empezamos en Medellín; el horizonte es Latinoamérica.",
    "vis.1.t":"Impacto verificable",
    "vis.1.p":"Que cada donación tenga destino, evidencia y un resultado medible, no promesas.",
    "vis.2.t":"Fundaciones más fuertes",
    "vis.2.p":"Amplificar a quienes ya trabajan en campo, reduciendo costos y multiplicando su alcance.",
    "vis.3.t":"Generosidad que crece",
    "vis.3.p":"Un modelo donde dar deja una huella real y, a la vez, beneficios para quien contribuye.",
  },
  en: {
    "nav.donar":"Donate",
    "nav.empresas":"Companies",
    "nav.fundaciones":"Foundations",
    "nav.hub":"Social Hub",
    "nav.gratitud":"Gratitude Program",
    "nav.impacto":"Impact",
    "nav.origen":"Origin",
    "nav.alma":"ALMA",
    "nav.transp":"Transparency",
    "nav.contacto":"Contact",
    "nav.faq":"FAQ",
    "nav.conocenos":"About",
    "hero.eyebrow":"Medellín, Colombia - Nonprofit - NIT 901.948.930-2",
    "hero.title":"Give to grow, grow to give more.",
    "hero.lead":"We connect generosity with need in a strategic, sustainable way. We do not replace foundations, we amplify them. And here, those who give also grow.",
    "path.donar.t":"I want to donate",
    "path.donar.s":"As an individual",
    "path.emp.t":"Corporate CSR",
    "path.emp.s":"For my company",
    "path.fund.t":"We are a foundation",
    "path.fund.s":"Join the Hub",
    "stat.rutas":"Active routes",
    "stat.pobl":"Populations served",
    "stat.traz":"Traceability",
    "stat.fund":"Founded in Medellín",
    "model.ey":"The model",
    "model.t":"The social sector is fragmented. We are the bridge.",
    "model.p":"We strengthen foundations in the field, connect donors with verified causes and build an ecosystem where giving brings real benefits to those who contribute.",
    "model.btn":"See the Social Hub",
    "feat.hub.t":"Social Hub",
    "feat.hub.p":"A 100m2 operations center in El Poblado. Five routes linking alliances, donations and measurable impact.",
    "feat.hub.tag":"Live now",
    "feat.grat.t":"Gratitude Program",
    "feat.grat.p":"A network of partner businesses offering exclusive discounts to every active member.",
    "feat.grat.tag":"New",
    "feat.tax.t":"Tax benefit",
    "feat.tax.p":"A 25% credit on income tax due (Art. 257 ET) for every donation made through the financial system.",
    "feat.tax.tag":"For donors",
    "traz.ey":"How it works",
    "traz.t":"Full traceability, end to end.",
    "traz.1.t":"Context visit",
    "traz.1.p":"We meet the foundation and the community on the ground.",
    "traz.2.t":"Onboarding",
    "traz.2.p":"Digital profile and signed agreement between the parties.",
    "traz.3.t":"Needs management",
    "traz.3.p":"We match the specific need with the right donor.",
    "traz.4.t":"Delivery with record",
    "traz.4.p":"Every delivery is documented and verified.",
    "traz.5.t":"Photo report",
    "traz.5.p":"Donors receive monthly evidence of real impact.",
    "comm.ey":"Real communities",
    "comm.t":"Measurable impact. Real people.",
    "origen.ey":"Our origin",
    "origen.t":"Almost four years in the field before founding anything.",
    "origen.p1":"Give&Grow International grew out of Juan Sebastián Navarro Osorio's field work in La Guajira, the Sierra Nevada and the comunas of Medellín. Nearly four years working where access is hard and trust is earned on foot.",
    "origen.p2":"The foundation was constituted on May 19, 2025 in El Poblado, Medellín, as a nonprofit under the Special Tax Regime. The purpose: that generosity reaches where it is needed most, with traceability and no opaque intermediaries.",
    "hub.ey":"Social Hub",
    "hub.t":"Five routes. One purpose.",
    "hub.lead":"The operations center where alliances, donations and impact meet. A 100m2 space in El Poblado, Medellín.",
    "hub.r1.t":"R1 - Foundation Alliances",
    "hub.r1.p":"A network of pre-approved foundations that receive support and, in some cases, contribute services to the Hub.",
    "hub.r2.t":"R2 - Donation Management",
    "hub.r2.p":"In-kind and monetary donations, managed with full traceability.",
    "hub.r3.t":"R3 - Social Grow",
    "hub.r3.p":"Training and capacity building for partner foundations.",
    "hub.r4.t":"R4 - Impact Journey",
    "hub.r4.p":"Experiences that take donors and teams to the field with real communities.",
    "hub.r5.t":"R5 - Job Connection",
    "hub.r5.p":"A bridge to employment opportunities for vulnerable populations.",
    "hub.pob.t":"Eight populations we accompany",
    "hub.pob.list":"Children at risk - Indigenous communities - Rural communities - People living on the street - Older adults - Abused animals - People in rehabilitation - Incarcerated people",
    "emp.ey":"Corporate CSR",
    "emp.t":"Your company, with purpose and traceability.",
    "emp.lead":"Three ways to partner. Each with a tax benefit and a verifiable report.",
    "emp.p1.t":"Seed Partner",
    "emp.p1.p":"Donation plus tax certificate and recognition as a purpose-driven business.",
    "emp.p2.t":"Impact Partner",
    "emp.p2.p":"Includes an Impact Journey for your team: a day in the field with real communities.",
    "emp.p3.t":"Strategic Alliance",
    "emp.p3.p":"Co-creation, route or program naming and GRI-aligned reporting.",
    "fund.ey":"For foundations",
    "fund.t":"Apply to the Social Hub.",
    "fund.lead":"More than 25 pre-approved foundations. Compartamos con Colombia is a formal partner that contributes training to the Hub.",
    "fund.req.t":"What we look for",
    "fund.req.p":"Legally constituted foundations, with verifiable field work and a willingness to embrace traceability.",
    "fund.give.t":"Partners that contribute",
    "fund.give.p":"A novel model: some foundations contribute services to the Hub instead of only receiving.",
    "fund.proto.t":"Compliance protocol",
    "fund.proto.p":"Minor breaches go to committee review with three chances; the most serious, such as misuse of funds, mean immediate expulsion and legal action.",
    "fund.btn":"I want to apply",
    "grat.ey":"Gratitude Program",
    "grat.t":"Those who give, also receive.",
    "grat.lead":"A network of partner businesses offering exclusive benefits to every active member, from the first tier.",
    "grat.cat":"Dining - Fashion - Beauty - Wellness - Dental",
    "grat.how.t":"How it works",
    "grat.how.p":"You donate, receive your digital member credential and present it at partner businesses to access the benefits.",
    "imp.ey":"Impact",
    "imp.t":"What we do, in images and data.",
    "imp.tab.gal":"Gallery",
    "imp.tab.map":"Map",
    "imp.tab.blog":"Stories",
    "alma.ey":"AI assistant",
    "alma.t":"Chat with ALMA.",
    "alma.lead":"ALMA answers your questions about donations, partnerships and the Social Hub.",
    "alma.placeholder":"Type your question...",
    "hero.imgalt":"Community accompanied by Give&Grow in the field",
    "alma.send":"Send",
    "alma.hello":"Hi, I am ALMA. I can tell you how to donate, the tax benefits, the memberships or how your foundation applies to the Hub. How can I help?",
    "donar.ey":"Donate",
    "donar.t":"Your donation, with a clear destination.",
    "donar.lead":"Estimate your impact and tax benefit, then choose how to give.",
    "calc.tab.ind":"Individual",
    "calc.tab.emp":"Company",
    "calc.tax":"Tax benefit (25%)",
    "calc.net":"Net cost of your donation",
    "calc.annual":"Annual equivalent",
    "pay.t":"How to give",
    "pay.tab.banco":"Bancolombia",
    "pay.tab.paypal":"PayPal",
    "pay.tab.mp":"MercadoPago",
    "pay.banco.note":"Transfer and send the receipt to sebas@thegiveandgrowproject.org. Within 24h you receive your member credential and tax certificate.",
    "pay.bank":"Bank",
    "pay.acc":"Savings account",
    "pay.holder":"Account holder",
    "pay.nit":"Tax ID",
    "copy":"Copy",
    "copied":"Copied",
    "pay.paypal.note":"For international donations in USD. Write to us and we will send the PayPal link.",
    "pay.mp.note":"Pay by card or PSE via MercadoPago. Request the link by WhatsApp or email.",
    "pay.wompi":"Coming soon: card and PSE payments via Wompi.",
    "transp.ey":"Transparency",
    "transp.t":"Nothing to hide.",
    "transp.p1":"We are a Colombian nonprofit (ESAL), formally incorporated and under State oversight. Here are our registration details, governance and financial commitments, independently verifiable.",
    "transp.p2":"We believe trust is shown with facts and documents, not promises.",
    "transp.reg.t":"Official registry",
    "transp.reg.razon":"Legal name",
    "transp.reg.nit":"Tax ID (NIT)",
    "transp.reg.nat":"Legal status",
    "transp.reg.nat.v":"Nonprofit - Special Tax Regime (Code 04, DIAN)",
    "transp.reg.insc":"Chamber of Commerce registration",
    "transp.reg.const":"Incorporation",
    "transp.reg.const.v":"Private document dated April 11, 2025, registered May 19, 2025 (No. 1889, Book I).",
    "transp.reg.dom":"Registered address",
    "transp.reg.dur":"Term",
    "transp.reg.dur.v":"Indefinite",
    "transp.reg.niif":"IFRS group",
    "transp.reg.niif.v":"Group II",
    "transp.gov.t":"Governance and control",
    "transp.gov.p":"The Foundation cannot distribute surplus: all of its assets are devoted to its social purpose.",
    "transp.gov.rep":"Legal representative and founder",
    "transp.gov.rf":"Statutory Auditor",
    "transp.gov.over":"Inspection and oversight",
    "transp.gov.over.v":"Government of Antioquia",
    "transp.gov.surplus":"Use of surplus",
    "transp.gov.surplus.v":"Distribution prohibited. 100% to the social purpose.",
    "transp.fin.t":"Financial commitment",
    "transp.fin.p":"We meet the obligations of a nonprofit under the Special Tax Regime:",
    "transp.fin.1":"Financial statements under IFRS (Group II), signed by the Statutory Auditor Manuela Londono Arboleda (License 244894-T).",
    "transp.fin.2":"Annual income tax return filed with the DIAN (Form 110).",
    "transp.fin.3":"Annual update of the RTE web registry (Form 5245).",
    "transp.fin.4":"A legal donation certificate issued for every gift.",
    "transp.trace.t":"Traceability of every gift",
    "transp.trace.p":"Confirmation within 24 hours, tax certificate, delivery record and a monthly photographic impact report.",
    "transp.verify.t":"Verify it yourself",
    "transp.verify.p":"Our Certificate of Existence and Legal Representation is public. You can look up the entity in RUES using NIT 901.948.930-2.",
    "transp.verify.btn":"Look up in RUES",
    "transp.docs.t":"Public documents",
    "transp.docs.p":"Download the available ones; the rest on request by email:",
    "transp.docs.1":"Certificate of Existence and Legal Representation",
    "transp.docs.2":"Tax Registry (RUT)",
    "transp.docs.3":"2025 financial statements (PDF)",
    "transp.docs.4":"Income tax return (Form 110)",
    "transp.docs.5":"2025 management report (PDF)",
    "transp.docs.btn":"Request documents",
    "contacto.ey":"Contact",
    "contacto.t":"Let us talk.",
    "form.name":"Name",
    "form.email":"Email",
    "form.msg":"Message",
    "form.send":"Send message",
    "contacto.email":"Email",
    "contacto.phone":"WhatsApp",
    "contacto.loc":"Location",
    "faq.ey":"Frequently asked",
    "faq.t":"What people ask most.",
    "faq.q1":"How do I make a donation?",
    "faq.a1":"Transfer to Bancolombia Savings Account No. 31000009221 under Fundacion Give&Grow International (NIT 901.948.930-2). Send the receipt to sebas@thegiveandgrowproject.org and within 24 hours you receive your donation certificate and membership credential. Card and PSE via Wompi are coming soon.",
    "faq.q2":"What is the Gratitude Program?",
    "faq.a2":"A network of partner businesses offering exclusive discounts to every active member, from the first membership tier. Businesses gain visibility as purpose-driven, and members access benefits in dining, fashion, beauty, wellness and dental care.",
    "faq.q3":"How does the tax benefit work?",
    "faq.a3":"For every donation made through the financial system you access a 25% credit on income tax due (Art. 257 ET). For example, $4,000,000 COP donated equals $1,000,000 COP less in tax.",
    "faq.q4":"Can I volunteer?",
    "faq.a4":"We welcome skilled volunteering: doctors, dentists, lawyers, accountants, developers, teachers and more. Write to sebas@thegiveandgrowproject.org or WhatsApp +57 315 330 5028 with your area and availability.",
    "faq.q5":"Can my foundation apply to the Hub?",
    "faq.a5":"Yes. We look for legally constituted foundations with verifiable field work and a willingness to embrace traceability. Some partners, like Compartamos con Colombia, contribute services to the Hub instead of only receiving.",
    "foot.tagline":"Give to grow, grow to give more.",
    "foot.explore":"Explore",
    "foot.legal":"Entity",
    "foot.rights":"All rights reserved.",
    "emp.cta.t":"Let's talk about your alliance",
    "emp.cta.p":"We design the contribution to fit your company, with tax benefit and verifiable reports. Tell us your goal and we build the path together.",
    "emp.cta.btn":"Start a conversation",
    "impactos.ey":"ALMA + ImpactOS",
    "impactos.t":"ALMA is the voice of ImpactOS.",
    "impactos.lead":"ImpactOS is Give&Grow's operating system: the platform that connects donors, companies, foundations and communities in one place. ALMA is its intelligent interface, the one that takes you where you need to go with no forms or menus.",
    "impactos.os.t":"What ImpactOS is",
    "impactos.os.p":"The ecosystem's operating system. It brings donations, memberships, field traceability, certificates and partnerships into a single platform. In Spanish it sounds like impactos; in English it means Impact Operating System.",
    "impactos.alma.t":"What ALMA is",
    "impactos.alma.p":"The intelligent layer that makes all of ImpactOS accessible. ALMA navigates, supports and connects: it understands what you need and guides you there. It is to Give&Grow what Siri is to the iPhone.",
    "impactos.eco.t":"How it connects",
    "impactos.eco.p":"Give&Grow is the ecosystem; ImpactOS, its platform; ALMA, the intelligence that links them. Today ALMA answers your questions; tomorrow it will be your gateway to the whole ecosystem.",
    "impactos.soon":"In progress · early phase",
    "alma.chip1":"How do I donate?",
    "alma.chip2":"Tax benefit",
    "alma.chip3":"Partner my company",
    "alma.chip4":"Can my foundation apply?",
    "vis.ey":"Where we're heading",
    "vis.t":"Make giving transparent, measurable and mutual.",
    "vis.p":"Our goal is to build Colombia's most trusted social-impact network: every gift transforming a life with full traceability and, in doing so, helping the giver grow too. We start in Medellín; the horizon is Latin America.",
    "vis.1.t":"Verifiable impact",
    "vis.1.p":"Every donation with a destination, evidence and a measurable result, not promises.",
    "vis.2.t":"Stronger foundations",
    "vis.2.p":"Amplify those already working in the field, cutting costs and multiplying their reach.",
    "vis.3.t":"Generosity that grows",
    "vis.3.p":"A model where giving leaves a real mark and, at the same time, benefits the giver.",
  }
};

var lang = "es";
function t(k){ return (I18N[lang] && I18N[lang][k]) || (I18N.es[k]) || k; }

function setLang(l){
  lang = (l === "en") ? "en" : "es";
  document.documentElement.lang = lang;
  var nodes = document.querySelectorAll("[data-i18n]");
  for (var i=0;i<nodes.length;i++){
    var k = nodes[i].getAttribute("data-i18n");
    var val = t(k);
    if (nodes[i].hasAttribute("data-i18n-attr")){
      nodes[i].setAttribute(nodes[i].getAttribute("data-i18n-attr"), val);
    } else {
      nodes[i].textContent = val;
    }
  }
  var on = lang;
  ["lang-es","dlang-es"].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.toggle("on",on==="es");});
  ["lang-en","dlang-en"].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.toggle("on",on==="en");});
  calcUpdate();
}

/* ---------- SPA routing ---------- */
function go(id){
  var pages = document.querySelectorAll(".page");
  for (var i=0;i<pages.length;i++) pages[i].classList.remove("active");
  var target = document.getElementById("page-"+id) || document.getElementById("page-inicio");
  target.classList.add("active");
  if (location.hash !== "#"+id) history.replaceState(null,"","#"+id);
  window.scrollTo(0,0);
  closeDrawer();
  initReveal();
  animateCounters();
  if (id === "impacto") { /* lazy content handled on tab click */ }
  return false;
}

/* ---------- nav scroll + drawer ---------- */
function onScroll(){
  var n = document.getElementById("nav");
  if (!n) return;
  n.classList.toggle("sol", window.scrollY > 30);
}
function toggleDrawer(){ document.getElementById("nav-mobile").classList.toggle("open"); }
function closeDrawer(){ var d=document.getElementById("nav-mobile"); if(d) d.classList.remove("open"); }

/* ---------- reveal ---------- */
var revObserver;
function initReveal(){
  if (!revObserver){
    revObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); revObserver.unobserve(e.target);} });
    },{threshold:0.12});
  }
  document.querySelectorAll(".page.active .rv:not(.in)").forEach(function(el){ revObserver.observe(el); });
}

/* ---------- counters ---------- */
function animateCounters(){
  document.querySelectorAll(".page.active [data-count]").forEach(function(el){
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var target = parseInt(el.getAttribute("data-count"),10);
    var suffix = el.getAttribute("data-suffix") || "";
    var start = null, dur = 1100;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min((ts-start)/dur,1);
      el.textContent = Math.floor(p*target) + suffix;
      if (p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ---------- calculator ---------- */
var calc = { cur:"COP", freq:"m", val:200000, mode:"ind" };
var USD_RATE = 4200;
var TIERS = [
  {min:1,  ic:"\uD83C\uDF31", es:"Semilla", en:"Seed"},
  {min:25, ic:"\uD83C\uDF3F", es:"Retoño",  en:"Sprout"},
  {min:50, ic:"\uD83C\uDF33", es:"Árbol",   en:"Tree"},
  {min:100,ic:"\uD83C\uDF32", es:"Bosque",  en:"Forest"}
];
function fmtCOP(n){ return "$" + Math.round(n).toLocaleString("es-CO"); }
function fmtUSD(n){ return "$" + Math.round(n).toLocaleString("en-US"); }

function setCur(c){
  calc.cur = c;
  document.getElementById("cur-cop").classList.toggle("on", c==="COP");
  document.getElementById("cur-usd").classList.toggle("on", c==="USD");
  document.getElementById("calc-rate").textContent = (c==="USD") ? "1 USD = $4.200 COP " + (lang==="en"?"(reference)":"(referencia)") : "";
  calcUpdate();
}
function setFreq(f){
  calc.freq = f;
  document.getElementById("freq-m").classList.toggle("on", f==="m");
  document.getElementById("freq-a").classList.toggle("on", f==="a");
  calcUpdate();
}
function setCalcMode(m){
  calc.mode = m;
  document.getElementById("ctab-ind").classList.toggle("on", m==="ind");
  document.getElementById("ctab-emp").classList.toggle("on", m==="emp");
}
function setQuick(cop){
  calc.val = cop;
  syncSlider();
  calcUpdate();
}
function sliderToVal(p){
  var minC = 5000, maxC = 20000000;
  var v = minC * Math.pow(maxC/minC, p/100);
  return Math.round(v/1000)*1000;
}
function valToSlider(cop){
  var minC = 5000, maxC = 20000000;
  cop = Math.max(minC, Math.min(maxC, cop));
  return 100 * Math.log(cop/minC) / Math.log(maxC/minC);
}
function onSlider(p){
  calc.val = sliderToVal(parseFloat(p));
  calcUpdate();
}
function onManual(raw){
  var n = parseInt(String(raw).replace(/[^0-9]/g,""),10) || 0;
  if (calc.cur === "USD") n = n * USD_RATE;
  calc.val = n;
  syncSlider();
  calcUpdate();
}
function syncSlider(){
  var s = document.getElementById("calc-slider");
  if (s) s.value = valToSlider(calc.val);
}
function calcUpdate(){
  var cop = calc.val;
  var displayN = (calc.cur === "USD") ? cop / USD_RATE : cop;
  var disp = document.getElementById("calc-display");
  if (disp) disp.textContent = (calc.cur === "USD") ? fmtUSD(displayN) : fmtCOP(displayN);

  var tax = cop * 0.25;
  var net = cop - tax;
  var annual = (calc.freq === "m") ? cop * 12 : cop;

  setText("co-tax", (calc.cur==="USD")? fmtUSD(tax/USD_RATE) : fmtCOP(tax));
  setText("co-net", (calc.cur==="USD")? fmtUSD(net/USD_RATE) : fmtCOP(net));
  setText("calc-annual", (calc.cur==="USD")? fmtUSD(annual/USD_RATE) : fmtCOP(annual));

  var usdMonthly = (calc.freq==="m") ? cop/USD_RATE : (cop/12)/USD_RATE;
  var tier = TIERS[0];
  for (var i=0;i<TIERS.length;i++){ if (usdMonthly >= TIERS[i].min) tier = TIERS[i]; }
  setText("m-ic", tier.ic);
  setText("m-name", tier[lang] || tier.es);
  setText("m-sub", (lang==="en")?("~ " + Math.round(usdMonthly) + " USD / month"):("~ " + Math.round(usdMonthly) + " USD / mes"));
}
function setText(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }

/* ---------- RSE simulator ---------- */
function empSim(){
  var budget = parseInt((document.getElementById("ce-budget").value||"0").replace(/[^0-9]/g,""),10)||0;
  var team = parseInt(document.getElementById("ce-team").value||"0",10)||0;
  var pkg, journey;
  if (budget >= 25000000){ pkg = (lang==="en")?"Strategic Alliance":"Alianza Estrategica"; journey = (lang==="en")?"Included + co-creation":"Incluido + co-creacion"; }
  else if (budget >= 8000000){ pkg = "Impact Partner"; journey = (lang==="en")?("Included for up to "+team+" people"):("Incluido para hasta "+team+" personas"); }
  else { pkg = (lang==="en")?"Seed Partner":"Aliado Semilla"; journey = (lang==="en")?"Not included":"No incluido"; }
  setText("ce-pkg", pkg);
  setText("ce-journey", journey);
  setText("ce-net", fmtCOP(budget*0.75));
}

/* ---------- payments ---------- */
function payMethod(m){
  ["banco","paypal","mp"].forEach(function(x){
    var tab = document.getElementById("paytab-"+x);
    var pan = document.getElementById("pay-"+x);
    if (tab) tab.classList.toggle("on", x===m);
    if (pan) pan.classList.toggle("on", x===m);
  });
}
function copyAccount(){
  var txt = "31000009221";
  if (navigator.clipboard) navigator.clipboard.writeText(txt);
  var lbl = document.getElementById("copy-label");
  if (lbl){ lbl.textContent = t("copied"); setTimeout(function(){ lbl.textContent = t("copy"); }, 1600); }
}

function formSend(){
  var g=function(id){var el=document.getElementById(id);return el?(el.value||"").trim():"";};
  var n=g("cf-name"), e=g("cf-email"), m=g("cf-msg");
  var note=document.getElementById("cf-note");
  var es=(typeof lang!=="undefined" && lang==="es");
  function show(t,ok){ if(!note)return; note.style.display="block"; note.style.color= ok?"var(--g)":"#b00020"; note.textContent=t; }
  if(!e || !m){ show(es?"Escribe tu correo y un mensaje, por favor.":"Please enter your email and a message.", false); return; }
  var subject=encodeURIComponent((es?"Contacto web — ":"Web contact — ")+(n||e));
  var body=encodeURIComponent((es?"Nombre: ":"Name: ")+n+"\n"+(es?"Correo: ":"Email: ")+e+"\n\n"+m);
  window.location.href="mailto:sebas@thegiveandgrowproject.org?subject="+subject+"&body="+body;
  show(es?"Abrimos tu app de correo con el mensaje listo para enviar.":"We opened your email app with the message ready to send.", true);
}

/* ---------- gallery + lightbox ---------- */
var IMG_BASE = "https://raw.githubusercontent.com/SebasGiveandGrow/givegrow-website/main/img/";
var GALLERY = [
  {f:"benef_01.jpg", es:"Comunidad acompañada en terreno", en:"Community accompanied in the field"},
  {f:"benef_02.jpg", es:"Entrega documentada con acta", en:"Delivery documented with a record"},
  {f:"benef_03.jpg", es:"Impacto medible, personas reales", en:"Measurable impact, real people"},
  {f:"campo_01.jpg", es:"Trabajo de campo en La Guajira", en:"Field work in La Guajira"},
  {f:"campo_02.jpg", es:"Sierra Nevada de Santa Marta", en:"Sierra Nevada de Santa Marta"},
  {f:"campo_03.jpg", es:"Comunas de Medellín", en:"Comunas of Medellín"},
  {f:"campo_04.jpg", es:"Acompañamiento continuo", en:"Continuous accompaniment"}
];
var lbIndex = 0;
function initGallery(){
  var g = document.getElementById("gallery");
  if (!g || g.dataset.done) return;
  g.dataset.done = "1";
  GALLERY.forEach(function(item, i){
    var img = document.createElement("img");
    img.src = IMG_BASE + item.f;
    img.alt = item[lang] || item.es;
    img.loading = "lazy";
    img.addEventListener("click", function(){ openLightbox(i); });
    g.appendChild(img);
  });
}
function openLightbox(i){
  lbIndex = i;
  var item = GALLERY[i];
  document.getElementById("lb-img").src = IMG_BASE + item.f;
  document.getElementById("lb-cap").textContent = item[lang] || item.es;
  document.getElementById("lb-count").textContent = (i+1) + " / " + GALLERY.length;
  document.getElementById("lightbox").classList.add("on");
}
function closeLightbox(){ document.getElementById("lightbox").classList.remove("on"); }
function lbStep(d){ openLightbox((lbIndex + d + GALLERY.length) % GALLERY.length); }

/* ---------- impacto tabs (lazy) ---------- */
function accTab(name){
  ["gal","map","blog"].forEach(function(x){
    var tab = document.getElementById("acctab-"+x);
    var pan = document.getElementById("acc-"+x);
    if (tab) tab.classList.toggle("on", x===name);
    if (pan) pan.classList.toggle("on", x===name);
  });
  if (name==="gal") initGallery();
  if (name==="map") initMap();
  if (name==="blog") initBlog();
}
function initMap(){
  var box = document.getElementById("map-box");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  function build(){
    var map = L.map("map-box").setView([6.2088, -75.5648], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OpenStreetMap"}).addTo(map);
    L.marker([6.2088, -75.5648]).addTo(map).bindPopup("HUB SOCIAL - El Poblado, Medellín");
  }
  if (window.L){ build(); return; }
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
  var s = document.createElement("script");
  s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  s.onload = build;
  document.body.appendChild(s);
}
var BLOG = [
  {es:"Por que la trazabilidad lo cambia todo", en:"Why traceability changes everything", d:"2026-05", t:"60s"},
  {es:"HUB SOCIAL: el primer ano", en:"Social Hub: the first year", d:"2026-04", t:"3 min"},
  {es:"Dar para crecer, en la practica", en:"Give to grow, in practice", d:"2026-03", t:"2 min"}
];
function initBlog(){
  var grid = document.getElementById("blog-grid");
  if (!grid || grid.dataset.done) return;
  grid.dataset.done = "1";
  BLOG.forEach(function(b){
    var card = document.createElement("div");
    card.className = "card rv";
    var h = document.createElement("h3"); h.textContent = b[lang] || b.es;
    var p = document.createElement("p"); p.className="mu"; p.textContent = b.d + " - " + b.t;
    card.appendChild(h); card.appendChild(p);
    grid.appendChild(card);
  });
  initReveal();
}

/* ---------- FAQ ---------- */
function toggleFaq(btn){
  var item = btn.parentElement;
  var ans = item.querySelector(".faq-a");
  var open = item.classList.toggle("open");
  ans.style.maxHeight = open ? (ans.scrollHeight + "px") : "0";
}

/* ---------- ALMA chat ---------- */
var ALMA_SYS = `Eres ALMA (Asistente de Labor Misional y Alianzas), la IA de Fundación Give&Grow International. Respondes de forma clara, cálida y concisa. Máximo 3 párrafos por respuesta. No uses listas extensas. Responde en el idioma del usuario.

GIVE&GROW: Fundación colombiana ESAL (NIT 901.948.930-2, RTE Código 04 DIAN). Fundada el 19 de mayo de 2025 en El Poblado, Medellín. Fundador: Juan Sebastián Navarro Osorio, casi 4 años de trabajo en zonas de difícil acceso (La Guajira, Sierra Nevada, Medellín). Tagline: "Dar para crecer, crecer para dar más". Web: www.thegiveandgrowproject.org. Contacto: sebas@thegiveandgrowproject.org / +57 315 330 5028.

MISIÓN: Conectar generosidad con necesidad de forma estratégica y con trazabilidad completa. No reemplazamos fundaciones, las amplificamos.

IMPACTOS Y ALMA: ImpactOS es el sistema operativo de Give&Grow (la plataforma digital del ecosistema). ALMA es su interfaz inteligente. Give&Grow es el ecosistema completo. ALMA es a Give&Grow lo que Siri es al iPhone.

HUB SOCIAL: Centro de 100m2 en El Poblado. 5 rutas: R1 Alianzas con Fundaciones, R2 Gestión de Donaciones, R3 Social Grow, R4 Impact Journey, R5 Conexión Laboral. Proceso: visita de contexto, onboarding, gestión de necesidades, entrega con acta, reporte fotográfico al donante.

DONACIONES: Transferencia a Bancolombia Cuenta de Ahorros 31000009221 (NIT 901.948.930-2). Enviar comprobante a sebas@thegiveandgrowproject.org. El donante recibe en 24h confirmación, credencial digital y certificado tributario, más reportes fotográficos mensuales.

BENEFICIO TRIBUTARIO: 25% de descuento sobre el impuesto de renta a cargo (Art. 257 ET). Ejemplo: 4.000.000 COP donados = 1.000.000 COP menos de impuesto.

MEMBRESÍAS: Semilla, Retoño, Árbol y Bosque (niveles crecientes de aporte mensual), Temporal (donación única) y Honor (por invitación).

PROGRAMA DE GRATITUD: Red de empresas aliadas con descuentos exclusivos para todos los miembros activos. Categorías: gastronomía, moda, belleza, bienestar, odontología.

RSE EMPRESARIAL: 3 formas de aliarse según el alcance: Aliado Semilla, Impact Partner (incluye Impact Journey para el equipo) y Alianza Estratégica (co-creación y reportes GRI). El aporte se define a la medida de cada empresa; invita a escribir para una propuesta personalizada.

POBLACIONES (8): niñez en riesgo, comunidades indígenas, comunidades campesinas, personas en situación de calle, adultos mayores, animales en maltrato, personas en rehabilitación, personas privadas de la libertad.

Más de 25 fundaciones preaprobadas. Compartamos con Colombia es aliada formal.`;

var almaHistory = [];
function almaFmt(text){
  var safe = String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  var paras = safe.split(/\n{2,}/).map(function(p){ return "<p>" + p.replace(/\n/g,"<br>") + "</p>"; });
  return paras.join("");
}
function almaPush(role, html){
  var box = document.getElementById("alma-msgs");
  var div = document.createElement("div");
  div.className = "amsg " + (role==="you" ? "you" : "bot");
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}
function almaAsk(t){ var i=document.getElementById("alma-input"); if(!i) return; i.value=(t||"").trim(); almaSend(); }
function almaSend(){
  var input = document.getElementById("alma-input");
  var text = (input.value||"").trim();
  if (!text) return;
  input.value = "";
  almaPush("you", almaFmt(text));
  almaHistory.push({role:"user", content:text});
  var thinking = almaPush("bot", "<p>...</p>");
  fetch("https://givegrow-alma.sebas-4af.workers.dev", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1024, system: ALMA_SYS, messages: almaHistory })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    var reply = (data.content && data.content[0]) ? data.content[0].text
      : (data.error ? ("Error: " + data.error.message) : "Error: respuesta inesperada");
    thinking.innerHTML = almaFmt(reply);
    almaHistory.push({role:"assistant", content:reply});
    document.getElementById("alma-msgs").scrollTop = 99999;
  })
  .catch(function(){
    thinking.innerHTML = almaFmt(lang==="en"
      ? "Sorry, I could not connect right now. Write to sebas@thegiveandgrowproject.org."
      : "Lo siento, no pude conectarme ahora. Escribe a sebas@thegiveandgrowproject.org.");
  });
}

/* ---------- init ---------- */
function init(){
  // language
  setLang("es");
  // routing from hash
  var hash = location.hash.replace("#","") || "inicio";
  go(hash);
  // nav scroll
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();
  // slider initial
  syncSlider();
  setCur("COP");
  setFreq("m");
  setCalcMode("ind");
  calcUpdate();
  // ALMA greeting
  var amsgs = document.getElementById("alma-msgs");
  if (amsgs && !amsgs.dataset.done){ amsgs.dataset.done="1"; almaPush("bot", almaFmt(t("alma.hello"))); }
  // alma enter key
  var ainput = document.getElementById("alma-input");
  if (ainput) ainput.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); almaSend(); } });
  // lightbox keys
  document.addEventListener("keydown", function(e){
    if (!document.getElementById("lightbox").classList.contains("on")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") lbStep(1);
    if (e.key === "ArrowLeft") lbStep(-1);
  });
  initReveal();
  animateCounters();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
