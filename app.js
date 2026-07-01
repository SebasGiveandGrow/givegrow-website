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
    "nav.alma":"ALMA · ImpactOS",
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
    "feat.hub.p":"Centro operativo en Medellín. Cinco rutas que conectan alianzas, donaciones e impacto medible.",
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
    "origen.p2":"La fundación se constituyó el 19 de mayo de 2025 en Medellín, como Entidad Sin Ánimo de Lucro (ESAL) bajo el Régimen Tributario Especial. El propósito: que la generosidad llegue a donde más se necesita, con trazabilidad y sin intermediarios opacos.",
    "hub.ey":"HUB SOCIAL",
    "hub.t":"Cinco rutas. Un solo propósito.",
    "hub.lead":"El centro operativo donde alianzas, donaciones e impacto se encuentran. En Medellín.",
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
    "imp.t":"Evidencia, no promesas.",
    "imp.tab.gal":"Galería",
    "imp.tab.map":"Mapa",
    "imp.tab.blog":"Historias",
    "alma.ey":"Asistente IA",
    "alma.t":"Conversa con ALMA.",
    "alma.lead":"ALMA (Asistente de Labor Misional y Alianzas) responde tus dudas sobre donaciones, alianzas y el HUB SOCIAL.",
    "alma.placeholder":"Escribe tu pregunta...",
    "hero.imgalt":"Comunidad acompañada por Give&Grow en terreno",
    "a11y.skip":"Saltar al contenido",
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
    "calc.freq.m":"Mensual",
    "calc.freq.a":"Anual",
    "calc.freq.u":"Único",
    "pay.t":"Cómo aportar",
    "pay.tab.banco":"Bancolombia",
    "pay.tab.paypal":"PayPal",
    "pay.tab.mp":"MercadoPago",
    "pay.banco.note":"Transfiere y envía el comprobante a contabilidad@thegiveandgrowproject.org. En 24h recibes tu credencial de miembro y tu certificado tributario.",
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
    "transp.t":"Cuentas claras.",
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
    "faq.a1":"Transfiere a la Cuenta de Ahorros Bancolombia No. 31000009221 a nombre de Fundación Give&Grow International (NIT 901.948.930-2). Envía el comprobante a contabilidad@thegiveandgrowproject.org y en máximo 24 horas recibes tu certificado de donación y tu credencial de membresía. Próximamente habilitaremos tarjeta y PSE vía Wompi.",
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
    "eco.ey":"El ecosistema",
    "eco.t":"ALMA conecta todo, para todos.",
    "eco.modules":"Módulos de ImpactOS",
    "eco.alma":" — la interfaz inteligente que une el ecosistema",
    "eco.users":"Para cada persona: visitante, donante, voluntario, empresa, fundación, beneficiario, equipo y junta — sin importar su nivel técnico.",
    "mod.ey":"Los módulos",
    "mod.t":"El ecosistema, módulo a módulo.",
    "mod.active":"Activo",
    "mod.dev":"En desarrollo",
    "mod.hub.t":"HUB SOCIAL",
    "mod.hub.p":"El centro operativo en terreno: rutas que reciben, clasifican y redistribuyen donaciones a las comunidades.",
    "mod.synergy.t":"Synergy Finder",
    "mod.synergy.p":"Motor de coincidencias que conecta necesidades con donantes, aliados y recursos.",
    "mod.mente.t":"MenteSana",
    "mod.mente.p":"Acompañamiento emocional: ALMA cambia a modo acompañante cuando lo detecta en el tono.",
    "mod.hope.t":"HopeMarket",
    "mod.hope.p":"Mercado solidario para artesanos y emprendedores de las comunidades.",
    "mod.academy.t":"Academy",
    "mod.academy.p":"Formación y orientación de aprendizaje personalizada para personas y organizaciones.",
    "mod.crowd.t":"CrowdFunding",
    "mod.crowd.p":"Campañas de recaudo para fundaciones aliadas, con metas y trazabilidad.",
    "mod.crisis.t":"CrisisNet",
    "mod.crisis.p":"Alertas y coordinación de emergencias con donantes geolocalizados.",
    "mod.dash.t":"Dashboard",
    "mod.dash.p":"Datos de impacto y reportes, consultables en lenguaje natural vía ALMA.",
    "cap.ey":"Qué hace ALMA",
    "cap.t":"Cinco capacidades, una sola conversación.",
    "cap.nav.t":"Navega",
    "cap.nav.p":"Te lleva a cualquier parte de la plataforma en lenguaje natural, sin menús ni formularios.",
    "cap.acc.t":"Acompaña",
    "cap.acc.p":"Si detecta angustia, cambia a modo acompañante. No espera a que se lo pidas.",
    "cap.con.t":"Conecta",
    "cap.con.p":"Encuentra aliados, oportunidades y coincidencias para cada perfil del ecosistema.",
    "cap.per.t":"Personaliza",
    "cap.per.p":"Con tu cuenta, recuerda tu historial y retoma cada sesión donde la dejaste.",
    "cap.apr.t":"Aprende",
    "cap.apr.p":"Mejora con cada conversación para guiar y recomendar mejor.",
    "mode.ey":"Dos modos",
    "mode.t":"Navegador y Acompañante, en la misma interfaz.",
    "mode.nav.t":"Modo Navegador",
    "mode.nav.p":"Para preguntas, tareas y acciones. Directo y conciso: te lleva a donde necesitas en el menor número de pasos.",
    "mode.acc.t":"Modo Acompañante",
    "mode.acc.p":"Para momentos difíciles. Empático y pausado; escucha antes de actuar. Es MenteSana en acción.",
    "road.ey":"Hacia dónde va",
    "road.t":"El camino de ALMA.",
    "road.y1.t":"Año 1 · Interfaz",
    "road.y1.p":"ALMA conecta a las personas con los módulos de ImpactOS en la web, en español.",
    "road.y2.t":"Años 2-3 · Voz",
    "road.y2.p":"ALMA en app móvil y WhatsApp; comandos de voz para el trabajo de campo, incluso sin buena conexión.",
    "road.y3.t":"Años 4-5 · Red",
    "road.y3.p":"ALMA conecta el ecosistema de Give&Grow con otros de impacto social en Latinoamérica.",
    "impactos.cta.t":"ImpactOS está en construcción.",
    "impactos.cta.p":"Lo estamos levantando módulo a módulo. Si quieres ser parte —como aliado, voluntario técnico o inversionista— conversemos.",
    "impactos.cta.btn":"Conversemos",
    "nav.membres":"Membresías",
    "membres.ey":"Membresías",
    "membres.t":"Crece con cada aporte.",
    "membres.lead":"Hacerte miembro es donar de forma recurrente y crecer con la fundación. Cada nivel refleja tu compromiso y desbloquea los mismos beneficios desde el primer aporte.",
    "membres.tiers.ey":"Tu recorrido",
    "membres.tiers.t":"De semilla a bosque.",
    "membres.t1.t":"Semilla",
    "membres.t1.p":"El primer paso. Empiezas a aportar cada mes y ya accedes a todos los beneficios de miembro.",
    "membres.t2.t":"Retoño",
    "membres.t2.p":"Tu aporte crece y, con él, tu impacto sostenido en las comunidades.",
    "membres.t3.t":"Árbol",
    "membres.t3.p":"Un compromiso firme: tu apoyo mensual sostiene proyectos completos.",
    "membres.t4.t":"Bosque",
    "membres.t4.p":"El nivel más alto. Tu generosidad multiplica el impacto de toda la red.",
    "membres.extra.ey":"Otras formas",
    "membres.extra.t":"No todo es mensual.",
    "membres.temp.t":"Temporal",
    "membres.temp.p":"Una donación única, sin compromiso recurrente. Igual recibes tu certificado y el beneficio tributario.",
    "membres.honor.t":"Honor",
    "membres.honor.p":"Un reconocimiento por invitación, para aliados y personas que dejan una huella excepcional en el ecosistema.",
    "membres.ben.ey":"Lo que recibes",
    "membres.ben.t":"Beneficios desde el primer nivel.",
    "membres.ben.1.t":"Programa de Gratitud",
    "membres.ben.1.p":"Descuentos exclusivos en gastronomía, moda, belleza, bienestar y odontología con empresas aliadas.",
    "membres.ben.2.t":"Certificado y credencial",
    "membres.ben.2.p":"Tu certificado de donación para el beneficio tributario y tu credencial de miembro.",
    "membres.ben.3.t":"Reportes de impacto",
    "membres.ben.3.p":"Te contamos a dónde llegó tu aporte y a quién ayudó, con evidencia real.",
    "membres.ben.4.t":"Trazabilidad total",
    "membres.ben.4.p":"Cada donación tiene destino, acta y reporte. Sin promesas: evidencia.",
    "membres.cta.t":"Elige tu nivel.",
    "membres.cta.p":"Usa el calculador para ver tu aporte, tu beneficio tributario y el nivel de membresía que alcanzas.",
    "membres.cta.btn":"Calcular mi aporte",
    "emp.why.ey":"Por qué aliarte",
    "emp.why.t":"RSE que se ve, se mide y se siente.",
    "emp.why.1.t":"Beneficio tributario",
    "emp.why.1.p":"Hasta 25% de descuento en renta (Art. 257 ET) por tus donaciones, con certificado.",
    "emp.why.2.t":"Trazabilidad real",
    "emp.why.2.p":"Cada aporte con destino, acta y reporte verificable. Evidencia, no promesas.",
    "emp.why.3.t":"Marca con propósito",
    "emp.why.3.p":"Reconocimiento como empresa aliada y visibilidad ante una comunidad que valora el propósito.",
    "emp.why.4.t":"Impact Journey",
    "emp.why.4.p":"Un día en campo para tu equipo, con comunidades reales. RSE que se vive.",
    "emp.levels.ey":"Tres formas de aliarte",
    "emp.levels.t":"Elige el nivel de tu alianza.",
    "emp.how.ey":"Cómo funciona",
    "emp.how.t":"De la intención al impacto, en cuatro pasos.",
    "emp.how.1.t":"Diagnóstico",
    "emp.how.1.p":"Conversamos tu objetivo de RSE y tu presupuesto.",
    "emp.how.2.t":"Diseño del aporte",
    "emp.how.2.p":"Estructuramos la donación y el beneficio tributario a tu medida.",
    "emp.how.3.t":"Ejecución en campo",
    "emp.how.3.p":"Llevamos tu aporte a las comunidades por las rutas del HUB SOCIAL.",
    "emp.how.4.t":"Reporte verificable",
    "emp.how.4.p":"Recibes acta, evidencia fotográfica y reporte de impacto.",
    "emp.grat.t":"Tu marca, en la red del Programa de Gratitud.",
    "emp.grat.p":"Como empresa aliada puedes sumarte al Programa de Gratitud y llegar a nuestra comunidad de miembros con beneficios — ganando clientes mientras aportas.",
    "emp.grat.btn":"Ver Programa de Gratitud",
    "grat.you.ey":"Para todos",
    "grat.you.t":"Dos caras de la misma gratitud.",
    "grat.you.mem.t":"Si eres miembro",
    "grat.you.mem.p":"Con tu credencial digital accedes a descuentos exclusivos en comercios aliados, desde el primer nivel de aporte.",
    "grat.you.biz.t":"Si eres comercio",
    "grat.you.biz.p":"Sumas tu negocio sin costo, ganas visibilidad como marca con propósito y llegas a una comunidad que valora a quien da.",
    "grat.cats.ey":"Categorías",
    "grat.cats.t":"Beneficios en lo que vives cada día.",
    "grat.c1":"Gastronomía",
    "grat.c2":"Moda",
    "grat.c3":"Belleza",
    "grat.c4":"Bienestar",
    "grat.c5":"Odontología",
    "grat.steps.ey":"Cómo funciona",
    "grat.steps.t":"Tres pasos para empezar a recibir.",
    "grat.s1.t":"Dona",
    "grat.s1.p":"Haz tu aporte y conviértete en miembro activo.",
    "grat.s2.t":"Recibe tu credencial",
    "grat.s2.p":"Te llega tu credencial digital de miembro.",
    "grat.s3.t":"Presenta y disfruta",
    "grat.s3.p":"Muéstrala en los comercios aliados y accede a los beneficios.",
    "grat.cta.t":"Empieza a recibir.",
    "grat.cta.mem":"Quiero ser miembro",
    "grat.cta.biz":"Quiero ser comercio aliado",
    "imp.lead":"Somos una fundación joven y transparente: en lugar de cifras infladas, te mostramos lo que sí podemos probar — el trabajo en campo, las rutas donde operamos y cómo documentamos cada entrega.",
    "imp.pr1.t":"Fotografías reales",
    "imp.pr1.p":"Cada imagen es de nuestro trabajo en terreno. Sin bancos de fotos ni montajes.",
    "imp.pr2.t":"Rutas en territorio",
    "imp.pr2.p":"Operamos en La Guajira, la Sierra Nevada y las comunas de Medellín. Mira dónde llegamos.",
    "imp.pr3.t":"Acta por entrega",
    "imp.pr3.p":"Cada donación entregada queda documentada con acta y reporte fotográfico para el donante.",
    "imp.ev.ey":"La evidencia",
    "imp.ev.t":"Compruébalo tú mismo.",
    "imp.soon.t":"Estamos documentando las primeras historias.",
    "imp.soon.p":"A medida que el Hub Social crece, este espacio se llenará de historias reales del terreno — sin inventar nada. Síguenos para no perdértelas.",
    "start.ey":"¿Por dónde empiezo?",
    "start.t":"Hay un camino para ti.",
    "start.don.t":"Soy donante",
    "start.don.p":"Elige un monto, dona con beneficio tributario y recibe reportes de tu impacto.",
    "start.don.btn":"Quiero donar →",
    "start.emp.t":"Soy empresa",
    "start.emp.p":"Convierte tu RSE en impacto medible y trazable, con beneficios tributarios.",
    "start.emp.btn":"Aliar mi empresa →",
    "start.fund.t":"Soy fundación",
    "start.fund.p":"Súmate al HUB SOCIAL y recibe donaciones y herramientas, sin costo.",
    "start.fund.btn":"Aplicar al Hub →",
    "start.vol.t":"Quiero ayudar",
    "start.vol.p":"Suma tu tiempo o talento al equipo que está construyendo todo esto.",
    "start.vol.btn":"Escríbenos →",
    "calc.impact":"Tu impacto",
    "calc.impact.note":"Equivalencia aproximada, según datos de las fundaciones del Hub.",
    "origen.imgalt":"Trabajo de campo de Give&Grow en La Guajira",
    "origen.tl.ey":"El recorrido",
    "origen.tl.t":"De caminar el territorio a fundar una red.",
    "origen.ms1.t":"Años en terreno",
    "origen.ms1.p":"Casi cuatro años de trabajo de campo en La Guajira, la Sierra Nevada y las comunas de Medellín, donde la confianza se gana caminando.",
    "origen.ms2.t":"Abril 2025 · Nace Give&Grow",
    "origen.ms2.p":"La experiencia se formaliza: se constituye como Entidad Sin Ánimo de Lucro en Medellín.",
    "origen.ms3.t":"Mayo 2025 · Registro oficial",
    "origen.ms3.p":"Queda inscrita ante la Cámara de Comercio, bajo el Régimen Tributario Especial.",
    "origen.ms4.t":"Hoy · El HUB SOCIAL",
    "origen.ms4.p":"Operamos el Hub Social y construimos ImpactOS para multiplicar el impacto con trazabilidad.",
    "origen.cta.btn":"Ver el HUB SOCIAL",
    "fund.proc.ey":"El proceso",
    "fund.proc.t":"De la aplicación a la vinculación.",
    "fund.s1.t":"Aplicas",
    "fund.s1.p":"Completas el formulario con la información de tu fundación. Toma 10–15 minutos.",
    "fund.s2.t":"Revisamos",
    "fund.s2.p":"Estudiamos tu información y verificamos tu trabajo en campo.",
    "fund.s3.t":"Visita de contexto",
    "fund.s3.p":"Nos conocemos en territorio para entender tu operación y tus necesidades reales.",
    "fund.s4.t":"Convenio de cooperación",
    "fund.s4.p":"Formalizamos la alianza con un convenio claro — gratuito y transparente.",
    "fund.s5.t":"Vinculación al Hub",
    "fund.s5.p":"Tu fundación entra a la red y empieza a recibir donaciones, herramientas y acompañamiento.",
    "fund.free.t":"Sin costo. Sin intermediarios opacos.",
    "fund.free.p":"Vincularte al HUB SOCIAL es y será siempre gratuito. Solo te pedimos una cosa a cambio: trazabilidad, que cada apoyo llegue documentado a quien lo necesita.",
    "hub.aliadas.ey":"Fundaciones aliadas",
    "hub.aliadas.t":"Las primeras del muro.",
    "hub.aliadas.lead":"El Muro de Héroes empieza aquí: fundaciones reales, verificadas y en territorio. Esta es la primera.",
    "ndf.chip.sector":"Niñez y adolescencia",
    "ndf.chip.loc":"Medellín · Manrique, La Honda",
    "ndf.chip.since":"Desde 2020",
    "ndf.desc":"Brinda bienestar y educación a niños y jóvenes de las comunidades más vulnerables de Medellín. Proyecto en proceso de constitución.",
    "ndf.prog1":"Chefs del Futuro · ~100 niños/día",
    "ndf.prog2":"Borboletas · 30 niños · 3×/sem",
    "ndf.web":"ninosdelfuturo.com →",
    "ndf.ig":"@ninosdelfuturo →",
    "ndf.logo.alt":"Logo de Fundación Niños del Futuro",
  },
  en: {
    "nav.donar":"Donate",
    "nav.empresas":"Companies",
    "nav.fundaciones":"Foundations",
    "nav.hub":"Social Hub",
    "nav.gratitud":"Gratitude Program",
    "nav.impacto":"Impact",
    "nav.origen":"Origin",
    "nav.alma":"ALMA · ImpactOS",
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
    "feat.hub.p":"An operations center in Medellín. Five routes linking alliances, donations and measurable impact.",
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
    "origen.p2":"The foundation was constituted on May 19, 2025 in Medellín, as a nonprofit under the Special Tax Regime. The purpose: that generosity reaches where it is needed most, with traceability and no opaque intermediaries.",
    "hub.ey":"Social Hub",
    "hub.t":"Five routes. One purpose.",
    "hub.lead":"The operations center where alliances, donations and impact meet. In Medellín.",
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
    "imp.t":"Evidence, not promises.",
    "imp.tab.gal":"Gallery",
    "imp.tab.map":"Map",
    "imp.tab.blog":"Stories",
    "alma.ey":"AI assistant",
    "alma.t":"Chat with ALMA.",
    "alma.lead":"ALMA answers your questions about donations, partnerships and the Social Hub.",
    "alma.placeholder":"Type your question...",
    "hero.imgalt":"Community accompanied by Give&Grow in the field",
    "a11y.skip":"Skip to content",
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
    "calc.freq.m":"Monthly",
    "calc.freq.a":"Annual",
    "calc.freq.u":"One-time",
    "pay.t":"How to give",
    "pay.tab.banco":"Bancolombia",
    "pay.tab.paypal":"PayPal",
    "pay.tab.mp":"MercadoPago",
    "pay.banco.note":"Transfer and send the receipt to contabilidad@thegiveandgrowproject.org. Within 24h you receive your member credential and tax certificate.",
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
    "transp.t":"Open books.",
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
    "faq.a1":"Transfer to Bancolombia Savings Account No. 31000009221 under Fundacion Give&Grow International (NIT 901.948.930-2). Send the receipt to contabilidad@thegiveandgrowproject.org and within 24 hours you receive your donation certificate and membership credential. Card and PSE via Wompi are coming soon.",
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
    "eco.ey":"The ecosystem",
    "eco.t":"ALMA connects everything, for everyone.",
    "eco.modules":"ImpactOS modules",
    "eco.alma":" — the intelligent interface that unites the ecosystem",
    "eco.users":"For every person: visitor, donor, volunteer, company, foundation, beneficiary, staff and board — whatever their technical level.",
    "mod.ey":"The modules",
    "mod.t":"The ecosystem, module by module.",
    "mod.active":"Active",
    "mod.dev":"In development",
    "mod.hub.t":"HUB SOCIAL",
    "mod.hub.p":"The on-the-ground operations center: routes that receive, sort and redistribute donations to communities.",
    "mod.synergy.t":"Synergy Finder",
    "mod.synergy.p":"A matching engine that connects needs with donors, allies and resources.",
    "mod.mente.t":"MenteSana",
    "mod.mente.p":"Emotional support: ALMA switches to companion mode when it senses it in your tone.",
    "mod.hope.t":"HopeMarket",
    "mod.hope.p":"A solidarity marketplace for artisans and entrepreneurs from the communities.",
    "mod.academy.t":"Academy",
    "mod.academy.p":"Personalized learning and guidance for people and organizations.",
    "mod.crowd.t":"CrowdFunding",
    "mod.crowd.p":"Fundraising campaigns for allied foundations, with goals and traceability.",
    "mod.crisis.t":"CrisisNet",
    "mod.crisis.p":"Emergency alerts and coordination with geolocated donors.",
    "mod.dash.t":"Dashboard",
    "mod.dash.p":"Impact data and reports, queryable in natural language through ALMA.",
    "cap.ey":"What ALMA does",
    "cap.t":"Five capabilities, one single conversation.",
    "cap.nav.t":"Navigates",
    "cap.nav.p":"Takes you anywhere in the platform in natural language, with no menus or forms.",
    "cap.acc.t":"Accompanies",
    "cap.acc.p":"If it senses distress, it switches to companion mode. It doesn't wait to be asked.",
    "cap.con.t":"Connects",
    "cap.con.p":"Finds allies, opportunities and matches for every profile in the ecosystem.",
    "cap.per.t":"Personalizes",
    "cap.per.p":"With your account, it remembers your history and resumes each session where you left off.",
    "cap.apr.t":"Learns",
    "cap.apr.p":"Improves with every conversation to guide and recommend better.",
    "mode.ey":"Two modes",
    "mode.t":"Navigator and Companion, in the same interface.",
    "mode.nav.t":"Navigator mode",
    "mode.nav.p":"For questions, tasks and actions. Direct and concise: it takes you where you need to go in the fewest steps.",
    "mode.acc.t":"Companion mode",
    "mode.acc.p":"For hard moments. Empathetic and unhurried; it listens before acting. It's MenteSana in action.",
    "road.ey":"Where it's heading",
    "road.t":"ALMA's road ahead.",
    "road.y1.t":"Year 1 · Interface",
    "road.y1.p":"ALMA connects people with the ImpactOS modules on the web, in Spanish.",
    "road.y2.t":"Years 2-3 · Voice",
    "road.y2.p":"ALMA on mobile and WhatsApp; voice commands for field work, even with poor connectivity.",
    "road.y3.t":"Years 4-5 · Network",
    "road.y3.p":"ALMA connects the Give&Grow ecosystem with other social-impact ecosystems across Latin America.",
    "impactos.cta.t":"ImpactOS is being built.",
    "impactos.cta.p":"We're raising it module by module. If you want to be part of it —as an ally, technical volunteer or investor— let's talk.",
    "impactos.cta.btn":"Let's talk",
    "nav.membres":"Memberships",
    "membres.ey":"Memberships",
    "membres.t":"Grow with every gift.",
    "membres.lead":"Becoming a member means giving regularly and growing with the foundation. Each tier reflects your commitment and unlocks the same benefits from your very first gift.",
    "membres.tiers.ey":"Your journey",
    "membres.tiers.t":"From seed to forest.",
    "membres.t1.t":"Seed",
    "membres.t1.p":"The first step. You start giving monthly and already access every member benefit.",
    "membres.t2.t":"Sprout",
    "membres.t2.p":"Your gift grows and, with it, your sustained impact in the communities.",
    "membres.t3.t":"Tree",
    "membres.t3.p":"A firm commitment: your monthly support sustains entire projects.",
    "membres.t4.t":"Forest",
    "membres.t4.p":"The highest tier. Your generosity multiplies the impact of the whole network.",
    "membres.extra.ey":"Other ways",
    "membres.extra.t":"Not everything is monthly.",
    "membres.temp.t":"One-time",
    "membres.temp.p":"A single donation, with no recurring commitment. You still get your certificate and tax benefit.",
    "membres.honor.t":"Honor",
    "membres.honor.p":"A recognition by invitation, for allies and people who leave an exceptional mark on the ecosystem.",
    "membres.ben.ey":"What you receive",
    "membres.ben.t":"Benefits from the very first tier.",
    "membres.ben.1.t":"Gratitude Program",
    "membres.ben.1.p":"Exclusive discounts in dining, fashion, beauty, wellness and dental care with partner businesses.",
    "membres.ben.2.t":"Certificate & credential",
    "membres.ben.2.p":"Your donation certificate for the tax benefit and your member credential.",
    "membres.ben.3.t":"Impact reports",
    "membres.ben.3.p":"We show you where your gift went and who it helped, with real evidence.",
    "membres.ben.4.t":"Full traceability",
    "membres.ben.4.p":"Every donation has a destination, a record and a report. No promises: evidence.",
    "membres.cta.t":"Choose your tier.",
    "membres.cta.p":"Use the calculator to see your gift, your tax benefit and the membership tier you reach.",
    "membres.cta.btn":"Calculate my gift",
    "emp.why.ey":"Why partner",
    "emp.why.t":"CSR you can see, measure and feel.",
    "emp.why.1.t":"Tax benefit",
    "emp.why.1.p":"Up to 25% income-tax discount (Art. 257 ET) for your donations, with a certificate.",
    "emp.why.2.t":"Real traceability",
    "emp.why.2.p":"Every gift with a destination, a record and a verifiable report. Evidence, not promises.",
    "emp.why.3.t":"Brand with purpose",
    "emp.why.3.p":"Recognition as a partner company and visibility before a community that values purpose.",
    "emp.why.4.t":"Impact Journey",
    "emp.why.4.p":"A day in the field for your team, with real communities. CSR you live firsthand.",
    "emp.levels.ey":"Three ways to partner",
    "emp.levels.t":"Choose your alliance level.",
    "emp.how.ey":"How it works",
    "emp.how.t":"From intent to impact, in four steps.",
    "emp.how.1.t":"Diagnosis",
    "emp.how.1.p":"We discuss your CSR goal and your budget.",
    "emp.how.2.t":"Gift design",
    "emp.how.2.p":"We structure the donation and the tax benefit to fit you.",
    "emp.how.3.t":"Field execution",
    "emp.how.3.p":"We take your gift to the communities through the HUB SOCIAL routes.",
    "emp.how.4.t":"Verifiable report",
    "emp.how.4.p":"You receive a record, photographic evidence and an impact report.",
    "emp.grat.t":"Your brand, in the Gratitude Program network.",
    "emp.grat.p":"As a partner company you can join the Gratitude Program and reach our community of members with benefits — gaining customers while you give.",
    "emp.grat.btn":"See the Gratitude Program",
    "grat.you.ey":"For everyone",
    "grat.you.t":"Two sides of the same gratitude.",
    "grat.you.mem.t":"If you're a member",
    "grat.you.mem.p":"With your digital credential you access exclusive discounts at partner businesses, from the very first tier.",
    "grat.you.biz.t":"If you're a business",
    "grat.you.biz.p":"You join at no cost, gain visibility as a purpose-driven brand and reach a community that values those who give.",
    "grat.cats.ey":"Categories",
    "grat.cats.t":"Benefits in what you live every day.",
    "grat.c1":"Dining",
    "grat.c2":"Fashion",
    "grat.c3":"Beauty",
    "grat.c4":"Wellness",
    "grat.c5":"Dental",
    "grat.steps.ey":"How it works",
    "grat.steps.t":"Three steps to start receiving.",
    "grat.s1.t":"Donate",
    "grat.s1.p":"Make your gift and become an active member.",
    "grat.s2.t":"Get your credential",
    "grat.s2.p":"Your digital member credential arrives.",
    "grat.s3.t":"Show it and enjoy",
    "grat.s3.p":"Present it at partner businesses and access the benefits.",
    "grat.cta.t":"Start receiving.",
    "grat.cta.mem":"Become a member",
    "grat.cta.biz":"Become a partner business",
    "imp.lead":"We're a young, transparent foundation: instead of inflated figures, we show you what we can actually prove — the field work, the routes where we operate, and how we document every delivery.",
    "imp.pr1.t":"Real photographs",
    "imp.pr1.p":"Every image is from our work in the field. No stock photos, no staging.",
    "imp.pr2.t":"Routes on the ground",
    "imp.pr2.p":"We operate in La Guajira, the Sierra Nevada and Medellín's comunas. See where we reach.",
    "imp.pr3.t":"A record per delivery",
    "imp.pr3.p":"Every delivered donation is documented with a record and a photo report for the donor.",
    "imp.ev.ey":"The evidence",
    "imp.ev.t":"See it for yourself.",
    "imp.soon.t":"We're documenting the first stories.",
    "imp.soon.p":"As the Social Hub grows, this space will fill with real stories from the field — nothing invented. Follow us so you don't miss them.",
    "start.ey":"Where do I start?",
    "start.t":"There's a path for you.",
    "start.don.t":"I'm a donor",
    "start.don.p":"Pick an amount, donate with a tax benefit and receive reports on your impact.",
    "start.don.btn":"I want to donate →",
    "start.emp.t":"I'm a company",
    "start.emp.p":"Turn your CSR into measurable, traceable impact, with tax benefits.",
    "start.emp.btn":"Partner my company →",
    "start.fund.t":"I'm a foundation",
    "start.fund.p":"Join the HUB SOCIAL and receive donations and tools, at no cost.",
    "start.fund.btn":"Apply to the Hub →",
    "start.vol.t":"I want to help",
    "start.vol.p":"Add your time or talent to the team building all of this.",
    "start.vol.btn":"Write to us →",
    "calc.impact":"Your impact",
    "calc.impact.note":"Approximate equivalence, based on data from the Hub's foundations.",
    "origen.imgalt":"Give&Grow field work in La Guajira",
    "origen.tl.ey":"The journey",
    "origen.tl.t":"From walking the territory to founding a network.",
    "origen.ms1.t":"Years in the field",
    "origen.ms1.p":"Nearly four years of field work in La Guajira, the Sierra Nevada and Medellín's comunas, where trust is earned by showing up.",
    "origen.ms2.t":"April 2025 · Give&Grow is born",
    "origen.ms2.p":"The experience becomes formal: incorporated as a nonprofit (ESAL) in Medellín.",
    "origen.ms3.t":"May 2025 · Official registration",
    "origen.ms3.p":"Registered with the Chamber of Commerce, under the Special Tax Regime.",
    "origen.ms4.t":"Today · The HUB SOCIAL",
    "origen.ms4.p":"We run the Social Hub and are building ImpactOS to multiply impact with traceability.",
    "origen.cta.btn":"See the HUB SOCIAL",
    "fund.proc.ey":"The process",
    "fund.proc.t":"From application to membership.",
    "fund.s1.t":"You apply",
    "fund.s1.p":"You fill out the form with your foundation's information. It takes 10–15 minutes.",
    "fund.s2.t":"We review",
    "fund.s2.p":"We study your information and verify your field work.",
    "fund.s3.t":"Context visit",
    "fund.s3.p":"We meet on the ground to understand your operation and your real needs.",
    "fund.s4.t":"Cooperation agreement",
    "fund.s4.p":"We formalize the alliance with a clear agreement — free and transparent.",
    "fund.s5.t":"You join the Hub",
    "fund.s5.p":"Your foundation enters the network and begins receiving donations, tools and support.",
    "fund.free.t":"No cost. No opaque intermediaries.",
    "fund.free.p":"Joining the HUB SOCIAL is and will always be free. We only ask one thing in return: traceability, that every bit of support reaches those who need it, documented.",
    "hub.aliadas.ey":"Allied foundations",
    "hub.aliadas.t":"The first on the wall.",
    "hub.aliadas.lead":"The Heroes Wall starts here: real, verified foundations working on the ground. This is the first.",
    "ndf.chip.sector":"Children & youth",
    "ndf.chip.loc":"Medellín · Manrique, La Honda",
    "ndf.chip.since":"Since 2020",
    "ndf.desc":"Provides wellbeing and education to children and youth in Medellín's most vulnerable communities. Currently in the process of formal constitution.",
    "ndf.prog1":"Chefs del Futuro · ~100 kids/day",
    "ndf.prog2":"Borboletas · 30 kids · 3×/wk",
    "ndf.web":"ninosdelfuturo.com →",
    "ndf.ig":"@ninosdelfuturo →",
    "ndf.logo.alt":"Fundación Niños del Futuro logo",
  }
};

var lang = "es";
function t(k){ return (I18N[lang] && I18N[lang][k]) || (I18N.es[k]) || k; }

var currentRoute = "inicio";
var ROUTE_META = {
  inicio:{t:{es:"Give&Grow International — Dar para crecer, crecer para dar más",en:"Give&Grow International — Give to grow, grow to give more"},d:{es:"Conectamos generosidad con necesidad en Colombia, con trazabilidad completa. Fundación sin ánimo de lucro en Medellín.",en:"We connect generosity with need in Colombia, with full traceability. A nonprofit foundation based in Medellín."}},
  origen:{t:{es:"Nuestro origen · Give&Grow International",en:"Our origin · Give&Grow International"},d:{es:"Cómo nació Give&Grow: del trabajo de campo en La Guajira, la Sierra Nevada y las comunas de Medellín a una fundación con propósito.",en:"How Give&Grow began: from field work in La Guajira, the Sierra Nevada and Medellín's comunas to a foundation with purpose."}},
  hub:{t:{es:"HUB SOCIAL · Give&Grow International",en:"Social Hub · Give&Grow International"},d:{es:"El centro operativo donde se encuentran alianzas, donaciones e impacto. En Medellín.",en:"The operations center where alliances, donations and impact meet. In Medellín."}},
  empresas:{t:{es:"Empresas y RSE · Give&Grow International",en:"Companies & CSR · Give&Grow International"},d:{es:"Convierte la responsabilidad social de tu empresa en impacto medible y trazable, con beneficios tributarios.",en:"Turn your company's social responsibility into measurable, traceable impact, with tax benefits."}},
  fundaciones:{t:{es:"Para fundaciones · Give&Grow International",en:"For foundations · Give&Grow International"},d:{es:"Suma tu fundación al HUB SOCIAL: recibe herramientas y donaciones de forma gratuita, transparente y trazable.",en:"Bring your foundation to the Social Hub: receive tools and donations for free, transparently and traceably."}},
  gratitud:{t:{es:"Programa de Gratitud · Give&Grow International",en:"Gratitude Program · Give&Grow International"},d:{es:"Beneficios y reconocimientos para quienes hacen posible el impacto: donantes, aliados y empresas.",en:"Benefits and recognition for those who make impact possible: donors, allies and companies."}},
  impacto:{t:{es:"Impacto y evidencia · Give&Grow International",en:"Impact & evidence · Give&Grow International"},d:{es:"Evidencia real del trabajo en terreno: fotografías, trazabilidad y resultados de las comunidades que acompañamos.",en:"Real evidence from the field: photos, traceability and results from the communities we support."}},
  alma:{t:{es:"ALMA, asistente con IA · Give&Grow International",en:"ALMA, AI assistant · Give&Grow International"},d:{es:"Conversa con ALMA, la asistente con inteligencia artificial de Give&Grow. Resuelve tus dudas sobre donar, aliarte o aplicar.",en:"Chat with ALMA, Give&Grow's AI assistant. Get answers about donating, partnering or applying."}},
  donar:{t:{es:"Donar · Give&Grow International",en:"Donate · Give&Grow International"},d:{es:"Haz tu donación a Give&Grow con trazabilidad completa y beneficio tributario. Cada aporte transforma una vida.",en:"Donate to Give&Grow with full traceability and a tax benefit. Every gift transforms a life."}},
  transparencia:{t:{es:"Transparencia · Give&Grow International",en:"Transparency · Give&Grow International"},d:{es:"Registro oficial, gobernanza, estados financieros y documentos públicos de Fundación Give&Grow International.",en:"Official registration, governance, financial statements and public documents of Give&Grow International."}},
  contacto:{t:{es:"Contacto · Give&Grow International",en:"Contact · Give&Grow International"},d:{es:"Escríbenos para donar, aliar tu empresa o sumar tu fundación al HUB SOCIAL. Medellín, Colombia.",en:"Reach out to donate, partner your company or join your foundation to the Social Hub. Medellín, Colombia."}},
  membresias:{t:{es:"Membresías · Give&Grow International",en:"Memberships · Give&Grow International"},d:{es:"Hazte miembro de Give&Grow: dona de forma recurrente, crece de Semilla a Bosque y accede a beneficios desde el primer nivel.",en:"Become a Give&Grow member: give monthly, grow from Seed to Forest and unlock benefits from the very first tier."}},
  faq:{t:{es:"Preguntas frecuentes · Give&Grow International",en:"FAQ · Give&Grow International"},d:{es:"Respuestas a las preguntas más comunes sobre donaciones, beneficios tributarios, alianzas y el modelo de Give&Grow.",en:"Answers to common questions about donations, tax benefits, partnerships and the Give&Grow model."}}
};
function setMetaTag(attr,key,val){ var el=document.querySelector("meta["+attr+"='"+key+"']"); if(el) el.setAttribute("content",val); }
function applyRouteMeta(id){
  var m = ROUTE_META[id] || ROUTE_META.inicio;
  var ti = m.t[lang]||m.t.es, de = m.d[lang]||m.d.es;
  document.title = ti;
  setMetaTag("name","description",de);
  setMetaTag("property","og:title",ti);
  setMetaTag("property","og:description",de);
  setMetaTag("property","og:url","https://www.thegiveandgrowproject.org/#"+id);
  setMetaTag("property","og:locale", lang==="en"?"en_US":"es_CO");
}

function renderPobChips(){
  var el=document.getElementById("hub-pob"); if(!el) return;
  var items=(t("hub.pob.list")||"").split(" - ");
  el.innerHTML = items.map(function(x){ return '<span class="eco-chip">'+x.trim().replace(/</g,"&lt;")+'</span>'; }).join("");
}
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
  renderPobChips();
  applyRouteMeta(currentRoute);
  calcUpdate();
}

/* ---------- SPA routing ---------- */
function go(id, fromPop){
  var pages = document.querySelectorAll(".page");
  for (var i=0;i<pages.length;i++) pages[i].classList.remove("active");
  var target = document.getElementById("page-"+id);
  if (!target){ id = "inicio"; target = document.getElementById("page-inicio"); }
  target.classList.add("active");
  currentRoute = id;
  if (location.hash !== "#"+id) history[fromPop ? "replaceState" : "pushState"](null,"","#"+id);
  applyRouteMeta(id);
  window.scrollTo(0,0);
  closeDrawer();
  initReveal();
  animateCounters();
  return false;
}

/* ---------- nav scroll + drawer ---------- */
function onScroll(){
  var n = document.getElementById("nav");
  if (!n) return;
  n.classList.toggle("sol", window.scrollY > 30);
}
function toggleDrawer(){ var d=document.getElementById("nav-mobile"); var open=d.classList.toggle("open"); var b=document.querySelector(".burger"); if(b) b.setAttribute("aria-expanded", open?"true":"false"); }
function closeDrawer(){ var d=document.getElementById("nav-mobile"); if(d) d.classList.remove("open"); var b=document.querySelector(".burger"); if(b) b.setAttribute("aria-expanded","false"); }

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
  {min:1,  svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-7"/><path d="M12 14c-.6-3-3.2-4.6-6.3-4 .3 3 2.6 4.8 6.3 4z"/></svg>', es:"Semilla", en:"Seed"},
  {min:25, svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 15c-.6-2.6-3-4-6-3.4.3 2.7 2.6 4.2 6 3.4z"/><path d="M12 13c.6-2.6 3-4 6-3.4-.3 2.7-2.6 4.2-6 3.4z"/></svg>', es:"Retoño",  en:"Sprout"},
  {min:50, svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22v-6"/><circle cx="12" cy="9.5" r="6"/></svg>', es:"Árbol",   en:"Tree"},
  {min:100,svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 22v-3M17 22v-3M12 22v-4"/><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><circle cx="12" cy="9" r="4.5"/></svg>', es:"Bosque",  en:"Forest"}
];
/* Equivalencias de impacto: se llenan con costos REALES de las fundaciones del Hub.
   Cada item: {es, esPl, en, enPl, cop} (singular/plural + costo COP de UNA unidad). Vacío = línea oculta.
   A futuro: con >1 unidad con costo defendible, añadir un selector de tipo de impacto (comida, resguardo, refugio, etc.). */
var IMPACT_UNITS = [
  { es:"plato de comida", esPl:"platos de comida", en:"plate of food", enPl:"plates of food", cop:4000 }
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
  var fu=document.getElementById("freq-u"); if(fu) fu.classList.toggle("on", f==="u");
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

  var isOnce = (calc.freq === "u");
  var arow=document.getElementById("calc-annual-row"); if(arow) arow.style.display = isOnce ? "none" : "";
  var mblock=document.getElementById("calc-member"); if(mblock) mblock.style.display = isOnce ? "none" : "";

  var usdMonthly = (calc.freq==="m") ? cop/USD_RATE : (cop/12)/USD_RATE;
  var tier = TIERS[0];
  for (var i=0;i<TIERS.length;i++){ if (usdMonthly >= TIERS[i].min) tier = TIERS[i]; }
  var mic=document.getElementById("m-ic"); if(mic) mic.innerHTML = tier.svg;
  var irow=document.getElementById("co-impact-row"), iout=document.getElementById("co-impact"), inote=document.getElementById("calc-impact-note");
  if (irow && iout){
    if (IMPACT_UNITS.length){
      var u=IMPACT_UNITS[0], n=Math.floor(cop / u.cop);
      if (n>=1){
        var uLabel = (lang==="en") ? (n===1 ? u.en : (u.enPl||u.en)) : (n===1 ? u.es : (u.esPl||u.es));
        iout.textContent = "\u2248 "+n+" "+uLabel; irow.style.display=""; if(inote) inote.style.display="";
      }
      else { irow.style.display="none"; if(inote) inote.style.display="none"; }
    } else { irow.style.display="none"; if(inote) inote.style.display="none"; }
  }
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
var IMG_BASE = "/img/";
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
    L.marker([6.2088, -75.5648]).addTo(map).bindPopup("HUB SOCIAL - Medellín");
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
/* Historias: estado honesto hasta tener contenido real */
function initBlog(){
  var grid = document.getElementById("blog-grid");
  if (!grid || grid.dataset.done) return;
  grid.dataset.done = "1";
  var card = document.createElement("div");
  card.className = "card rv";
  card.style.textAlign = "center";
  var h = document.createElement("h3"); h.textContent = t("imp.soon.t");
  var p = document.createElement("p"); p.className = "mu"; p.style.marginTop = "8px"; p.textContent = t("imp.soon.p");
  card.appendChild(h); card.appendChild(p);
  grid.appendChild(card);
  initReveal();
}

/* ---------- FAQ ---------- */
function toggleFaq(btn){
  var item = btn.parentElement;
  var ans = item.querySelector(".faq-a");
  var open = item.classList.toggle("open");
  ans.style.maxHeight = open ? (ans.scrollHeight + "px") : "0";
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}

/* ---------- ALMA chat ---------- */
var ALMA_SYS = `Eres ALMA (Asistente de Labor Misional y Alianzas), la IA de Fundación Give&Grow International. Respondes de forma clara, cálida y concisa. Máximo 3 párrafos por respuesta. No uses listas extensas. Responde en el idioma del usuario.

GIVE&GROW: Fundación colombiana ESAL (NIT 901.948.930-2, RTE Código 04 DIAN). Fundada el 19 de mayo de 2025 en Medellín. Fundador: Juan Sebastián Navarro Osorio, casi 4 años de trabajo en zonas de difícil acceso (La Guajira, Sierra Nevada, Medellín). Tagline: "Dar para crecer, crecer para dar más". Web: www.thegiveandgrowproject.org. Contacto: sebas@thegiveandgrowproject.org / +57 315 330 5028.

MISIÓN: Conectar generosidad con necesidad de forma estratégica y con trazabilidad completa. No reemplazamos fundaciones, las amplificamos.

IMPACTOS Y ALMA: ImpactOS es el sistema operativo de Give&Grow (la plataforma digital del ecosistema). ALMA es su interfaz inteligente. Give&Grow es el ecosistema completo. ALMA es a Give&Grow lo que Siri es al iPhone.

HUB SOCIAL: Centro operativo en Medellín. 5 rutas: R1 Alianzas con Fundaciones, R2 Gestión de Donaciones, R3 Social Grow, R4 Impact Journey, R5 Conexión Laboral. Proceso: visita de contexto, onboarding, gestión de necesidades, entrega con acta, reporte fotográfico al donante.

DONACIONES: Transferencia a Bancolombia Cuenta de Ahorros 31000009221 (NIT 901.948.930-2). Enviar comprobante a contabilidad@thegiveandgrowproject.org. El donante recibe en 24h confirmación, credencial digital y certificado tributario, más reportes fotográficos mensuales.

BENEFICIO TRIBUTARIO: 25% de descuento sobre el impuesto de renta a cargo (Art. 257 ET). Ejemplo: 4.000.000 COP donados = 1.000.000 COP menos de impuesto.

MEMBRESÍAS: Semilla, Retoño, Árbol y Bosque (niveles crecientes de aporte mensual), Temporal (donación única) y Honor (por invitación).

PROGRAMA DE GRATITUD: Red de empresas aliadas con descuentos exclusivos para todos los miembros activos. Categorías: gastronomía, moda, belleza, bienestar, odontología.

RSE EMPRESARIAL: 3 formas de aliarse según el alcance: Aliado Semilla, Impact Partner (incluye Impact Journey para el equipo) y Alianza Estratégica (co-creación y reportes GRI). El aporte se define a la medida de cada empresa; invita a escribir para una propuesta personalizada.

POBLACIONES (8): niñez en riesgo, comunidades indígenas, comunidades campesinas, personas en situación de calle, adultos mayores, animales en maltrato, personas en rehabilitación, personas privadas de la libertad.

Más de 25 fundaciones preaprobadas. Compartamos con Colombia es aliada formal.`;

var almaHistory = [];
function almaFmt(text){
  var s = String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  // links [label](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, function(m,l,u){ return '<a href="'+u+'" target="_blank" rel="noopener">'+l+'</a>'; });
  // bare http(s) urls
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function(m,pre,u){ return pre+'<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>'; });
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  var lines = s.split(/\n/), out = [], i = 0;
  function inline(t){ return t; }
  while (i < lines.length){
    if (/^\s*[-*]\s+/.test(lines[i])){
      var ul = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])){ ul.push("<li>"+lines[i].replace(/^\s*[-*]\s+/,"")+"</li>"); i++; }
      out.push("<ul>"+ul.join("")+"</ul>"); continue;
    }
    if (/^\s*\d+\.\s+/.test(lines[i])){
      var ol = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])){ ol.push("<li>"+lines[i].replace(/^\s*\d+\.\s+/,"")+"</li>"); i++; }
      out.push("<ol>"+ol.join("")+"</ol>"); continue;
    }
    if (/^\s*$/.test(lines[i])){ i++; continue; }
    var para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])){ para.push(lines[i]); i++; }
    out.push("<p>"+para.join("<br>")+"</p>");
  }
  return out.join("");
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
var almaBusy = false;
function almaSetBusy(b){
  almaBusy = b;
  var inp = document.getElementById("alma-input"), btn = document.getElementById("alma-send");
  if (inp) inp.disabled = b;
  if (btn){ btn.disabled = b; btn.style.opacity = b ? "0.6" : ""; }
}
function almaAsk(t){ var i=document.getElementById("alma-input"); if(!i) return; i.value=(t||"").trim(); almaSend(); }
function almaSend(){
  if (almaBusy) return;
  var input = document.getElementById("alma-input");
  var text = (input.value||"").trim();
  if (!text) return;
  input.value = "";
  almaPush("you", almaFmt(text));
  almaHistory.push({role:"user", content:text});
  var thinking = almaPush("bot", '<span class="alma-typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>');
  almaSetBusy(true);
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
  })
  .then(function(){ almaSetBusy(false); var inp = document.getElementById("alma-input"); if (inp) inp.focus(); });
}

/* ---------- init ---------- */
function init(){
  // language
  setLang("es");
  // routing from hash
  var hash = location.hash.replace("#","") || "inicio";
  go(hash, true);
  window.addEventListener("popstate", function(){ var h = location.hash.replace("#","")||"inicio"; go(h, true); });
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
    if (e.key === "Escape"){ var dm=document.getElementById("nav-mobile"); if(dm && dm.classList.contains("open")){ closeDrawer(); return; } }
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
