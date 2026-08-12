/* ===== Give&Grow International - app.js (rebuild v4) ===== */
"use strict";

/* ---------- I18N ---------- */
var I18N = {
  es: {
    "nav.impactos":"ImpactOS",
    "impactos.ey":"La plataforma",
    "impactos.t":"ImpactOS: el registro detrás de cada aporte.",
    "impactos.lead":"No es una promesa a futuro. Es la capa que convierte una intención de donar en un registro con destino, evidencia y certificado — y que ya está operando en este sitio.",
    "impactos.why.t":"Por qué existe",
    "impactos.why.p":"El problema del sector no es la falta de generosidad: es que casi nadie sostiene el registro. Sin un sistema, cada donación es un favor irrepetible — imposible de auditar, de repetir y de contar con precisión. ImpactOS existe para que dar deje de depender de la memoria de alguien.",
    "impactos.os.t":"Qué es",
    "impactos.os.p":"La capa que reúne en un solo lugar el registro de la red, el cálculo del impacto, la trazabilidad en terreno y los certificados. En español suena a impactos; en inglés significa Impact Operating System.",
    "impactos.using.t":"Ya lo estás usando",
    "impactos.using.p":"No hace falta imaginarlo. Casi todo lo que viste en este sitio sale de ImpactOS:",
    "impactos.live.t":"El HUB SOCIAL",
    "impactos.live.p":"El módulo en terreno: recibe, clasifica y redistribuye las donaciones, y produce el acta y la foto de cada entrega. Todo lo que este sitio puede probar sale de ahí.",
    "impactos.live.link":"Conoce el HUB SOCIAL",
    "impactos.u1.t":"El registro de la red",
    "impactos.u1.p":"El mapa y el muro de aliadas se dibujan desde una sola fuente verificada: quién entró, en qué zona trabaja y con qué consentimiento se publica su material.",
    "impactos.u1.link":"Ver el mapa de la red",
    "impactos.u2.t":"El cálculo del impacto",
    "impactos.u2.p":"La calculadora no estima al aire: usa unidades documentadas por las propias fundaciones. Un plato de comida en Niños del Futuro cuesta $4.000, y de ahí sale la equivalencia que ves.",
    "impactos.u2.link":"Probar la calculadora",
    "impactos.u3.t":"El destino, desde el primer clic",
    "impactos.u3.p":"Cuando entras a donar desde la ficha de una fundación, el registro nace dirigido a ella. No es un campo que alguien llena después: queda en el aporte desde el comienzo.",
    "impactos.u4.t":"ALMA",
    "impactos.u4.p":"La interfaz que responde en lenguaje natural sobre la red, las membresías y el beneficio tributario, leyendo los mismos datos verificados.",
    "impactos.u4.link":"Conversar con ALMA",
    "impactos.rec.t":"Anatomía de un registro",
    "impactos.rec.p":"Esto es lo que ImpactOS guarda de una donación. La primera parte la armas tú con el sitio; la segunda la produce el HUB SOCIAL en terreno.",
    "impactos.rec.a":"Lo que armas con el sitio",
    "impactos.rec.b":"Lo que produce el HUB en terreno",
    "impactos.rec.r1.k":"Monto y moneda",
    "impactos.rec.r1.v":"$200.000 COP",
    "impactos.rec.r2.k":"Frecuencia",
    "impactos.rec.r2.v":"Mensual, anual o único",
    "impactos.rec.r3.k":"Destino",
    "impactos.rec.r3.v":"Dirigida a una fundación o al fondo general",
    "impactos.rec.r4.k":"Proyecto",
    "impactos.rec.r4.v":"Chefs del Futuro",
    "impactos.rec.r5.k":"Equivalencia verificada",
    "impactos.rec.r5.v":"≈ 50 platos de comida al mes",
    "impactos.rec.r6.k":"Beneficio tributario",
    "impactos.rec.r6.v":"25% sobre el impuesto a cargo (Art. 257 ET)",
    "impactos.rec.r7.k":"Acta de recepción",
    "impactos.rec.r7.v":"Con foto de lo recibido",
    "impactos.rec.r8.k":"Acta de entrega",
    "impactos.rec.r8.v":"Firmada por quien recibe",
    "impactos.rec.r9.k":"Reporte fotográfico",
    "impactos.rec.r9.v":"Mensual, al donante",
    "impactos.rec.r10.k":"Certificado de donación",
    "impactos.rec.r10.v":"Revisado y firmado, no automático",
    "impactos.rec.note":"Los valores son un ejemplo; la estructura es la real.",
    "impactos.jor.t":"Anatomía de una jornada",
    "impactos.jor.p":"El registro no es solo de donaciones. Una jornada de voluntariado deja su propio rastro, con la misma estructura: lo que se acuerda antes de pisar terreno, y lo que queda documentado al cerrar.",
    "impactos.jor.a":"Lo que se acuerda antes",
    "impactos.jor.b":"Lo que queda al cerrar",
    "impactos.jor.r1.k":"Fundación anfitriona",
    "impactos.jor.r1.v":"La que acompaña a esa comunidad",
    "impactos.jor.r2.k":"Población acompañada",
    "impactos.jor.r2.v":"Del portafolio del HUB",
    "impactos.jor.r3.k":"Nivel de participación",
    "impactos.jor.r3.v":"Con el HUB, con Give&Grow o mixto",
    "impactos.jor.r4.k":"Verificaciones",
    "impactos.jor.r4.v":"La nuestra y la de la fundación",
    "impactos.jor.r5.k":"Registro de jornada",
    "impactos.jor.r5.v":"Asistentes, horas y actividad",
    "impactos.jor.r6.k":"Acta de entrega",
    "impactos.jor.r6.v":"Si la jornada entregó algo",
    "impactos.jor.r7.k":"Reflexión del voluntario",
    "impactos.jor.r7.v":"Anónima y agregada",
    "impactos.jor.r8.k":"Material fotográfico",
    "impactos.jor.r8.v":"Solo con consentimiento registrado",
    "impactos.jor.r9.k":"Reporte a la empresa",
    "impactos.jor.r9.v":"Redactado en clave de contribución",
    "impactos.jor.note":"Es el mismo principio del registro de una donación: si no quedó documentado, no ocurrió.",
    "impactos.jor.link":"Cómo medimos lo que pasa en una jornada",
    "impactos.next.t":"Hacia dónde va",
    "impactos.next.p":"Hay más módulos en diseño. No los nombramos todavía: un módulo anunciado no es un módulo entregado, y aquí solo publicamos lo que podemos demostrar. Cuando uno empiece a operar, aparecerá en esta página con su primera evidencia.",
    "med.ey":"Medición",
    "med.t":"Hasta dónde podemos afirmar.",
    "med.lead":"El trabajo en territorio es de la fundación aliada; nosotros lo amplificamos, lo registramos y lo reportamos. Esta página dice con qué respaldo hablamos — y dónde termina lo que podemos probar.",
    "med.contrib.t":"Contribución, no atribución",
    "med.contrib.p":"Give&Grow no causa el impacto por sí sola: la fundación hace el trabajo en su comunidad. Por eso todo reporte se redacta en clave de contribución. Es la forma técnicamente correcta y es lo que ya dice el lema: no reemplazamos a las fundaciones, las amplificamos.",
    "med.contrib.yk":"Así lo decimos",
    "med.contrib.yv":"Tu aporte contribuyó a que la fundación entregara N platos, con acta y foto.",
    "med.contrib.nk":"Así no",
    "med.contrib.nv":"Give&Grow alimentó a N niños.",
    "med.contrib.note":"La diferencia parece de redacción y no lo es: en la primera frase el mérito queda donde se hizo el trabajo, y el aporte queda verificable.",
    "med.esc.t":"Los tres peldaños",
    "med.esc.p":"Medir impacto tiene grados, y confundirlos es el error más común del sector. Estos son los tres, con el estado real de cada uno.",
    "med.e1.t":"Costo por unidad verificada",
    "med.e1.s":"Opera hoy",
    "med.e1.p":"Cuánto cuesta una unidad real de servicio, documentada por la fundación que la presta. Un plato de comida en Niños del Futuro cuesta $4.000, y de ahí sale la equivalencia que muestra la calculadora. Mide lo entregado.",
    "med.e2.t":"Outcomes observados",
    "med.e2.s":"En construcción",
    "med.e2.p":"Qué cambió en las personas, más allá de lo que se entregó. Los instrumentos de MIRA lo registran de forma agregada y anónima. Sin un profesional en el equipo observamos, no diagnosticamos: no emitimos resultados individuales ni conclusiones clínicas.",
    "med.e3.t":"Retorno social (SROI)",
    "med.e3.s":"No existe",
    "med.e3.p":"No lo publicamos, y no es prudencia decorativa: un SROI no es un cálculo, es un estudio. Exige proxies financieros, línea base, consulta a los grupos de interés y cuatro descuentos técnicos —peso muerto, atribución, desplazamiento y decaimiento—. Sin eso, un ratio de retorno social se desarma en la primera reunión, y con él se cae todo lo demás que sí es cierto.",
    "med.esc.note":"El primer peldaño mide lo entregado; el tercero mediría el valor del cambio producido. No son lo mismo. La materia prima ya existe: ImpactOS registra destino, unidad, acta, entrega y reporte. Lo que falta es la capa de resultados y el rigor metodológico, no los datos.",
    "med.pub.t":"Cómo publicamos un número",
    "med.pub.p":"Estas reglas gobiernan cualquier cifra de este sitio y de cualquier reporte que firmemos.",
    "med.pub.1":"Siempre agregado y anónimo: nunca un caso individual identificable.",
    "med.pub.2":"Con consentimiento registrado para cualquier material de la comunidad — foto, testimonio o diario.",
    "med.pub.3":"Con fecha de corte visible: un número sin fecha no es evidencia.",
    "med.pub.4":"Con la fuente declarada: qué instrumento lo produjo, sea acta, registro de jornada u observación.",
    "med.pub.5":"Las cifras de terceros se marcan como reportadas, nunca como propias.",
    "med.pub.6":"Preferimos la recencia al acumulado: cuántas jornadas y hace cuánto fue la última evidencia dice más que un total sin auditar.",
    "med.pub.7":"Sin ratios de retorno social mientras no exista el estudio que los sostenga.",
    "med.rep.ey":"Lo que recibe tu equipo",
    "med.rep.t":"El reporte para la empresa aliada",
    "med.rep.p":"Cuando un equipo participa en una jornada, esto es lo que recibe. La estructura es la real; los campos se llenan con lo que esa jornada haya producido, y nada más.",
    "med.rep.ttl":"Reporte de jornada",
    "med.rep.meta":"Con fecha de corte y número de registro",
    "med.rep.g1":"Lo que ocurrió",
    "med.rep.g1a":"Actividad realizada, con rol activo de la comunidad",
    "med.rep.g1b":"Participantes de la empresa y horas efectivas",
    "med.rep.g2":"Lo que se entregó · contribución verificable",
    "med.rep.g2a":"Unidades entregadas — soporte: acta de entrega",
    "med.rep.g2b":"Capacidad transferida — soporte: registro de aporte",
    "med.rep.g3":"Lo que se observó · agregado y anónimo",
    "med.rep.g3a":"En el equipo de la empresa: síntesis de la reflexión de cierre",
    "med.rep.g3b":"En los participantes: síntesis agregada de la observación",
    "med.rep.g4":"Trazabilidad",
    "med.rep.g4a":"Número de registro en ImpactOS",
    "med.rep.g4b":"Evidencia fotográfica, según el consentimiento otorgado",
    "med.rep.note":"Cada reporte incluye su nota metodológica: describe la contribución de la jornada, el trabajo en territorio es de la fundación aliada, y no constituye un cálculo de retorno social.",
    "med.map.ey":"Para el reporte de tu empresa",
    "med.map.t":"Cómo se traduce a los marcos que ya usa tu empresa",
    "med.map.p":"Ninguna empresa va a adoptar un marco nuevo: ya reporta en ODS, GRI o ESG. Por eso nuestro núcleo de indicadores viene con una capa de traducción.",
    "med.map.h1":"Nuestro indicador",
    "med.map.h2":"ODS",
    "med.map.h3":"GRI (referencia)",
    "med.map.h4":"ESG",
    "med.map.r1a":"Unidades de alimentación entregadas",
    "med.map.r1b":"2 · Hambre cero",
    "med.map.r1c":"413 Comunidades locales",
    "med.map.r1d":"Social",
    "med.map.r2a":"Formación y capacidades",
    "med.map.r2b":"4 · Educación de calidad",
    "med.map.r2c":"404 Formación",
    "med.map.r2d":"Social",
    "med.map.r3a":"Horas de voluntariado corporativo",
    "med.map.r3b":"17 · Alianzas",
    "med.map.r3c":"413 Comunidades locales",
    "med.map.r3d":"Social",
    "med.map.r4a":"Trazabilidad y certificación",
    "med.map.r4b":"16 · Instituciones sólidas",
    "med.map.r4c":"2 Gobernanza",
    "med.map.r4d":"Gobernanza",
    "med.map.r5a":"Alianzas con fundaciones verificadas",
    "med.map.r5b":"17 · Alianzas",
    "med.map.r5c":"2-6 Cadena de valor",
    "med.map.r5d":"Social y gobernanza",
    "med.map.note":"El mapeo se ofrece como referencia para que la empresa integre lo nuestro a su propio reporte. No auditamos ese reporte ni certificamos su cumplimiento.",
    "med.unlock.ey":"Lo que falta",
    "med.unlock.t":"El segundo peldaño no necesita presupuesto",
    "med.unlock.p":"Necesita un profesional. Un psicólogo voluntario podría validar los instrumentos de observación y definir hasta dónde se puede afirmar sin sobre-interpretar. El programa de voluntariado ya tiene el canal para recibirlo, sin pisar territorio si no quiere.",
    "med.unlock.cta":"Aportar mi profesión",
    "med.link":"Cómo medimos lo que pasa en una jornada",
    "med.link.os":"Ver el registro detrás de cada aporte",
    "alma.panel.sub":"Asistente de Labor Misional y Alianzas",
    "alma.close":"Cerrar ALMA",
    "alma.note":"Respuestas generadas con inteligencia artificial. Para datos oficiales, consulta Transparencia.",
    "nav.donar":"Donar",
    "nav.empresas":"Empresas",
    "nav.fundaciones":"Fundaciones",
    "nav.hub":"HUB SOCIAL",
    "nav.gratitud":"Programa de Gratitud",
    "nav.impacto":"Evidencia",
    "nav.origen":"Origen",
    "nav.d.empresas":"RSE, alianzas y empresas aliadas",
    "nav.d.gratitud":"Beneficios de comercios para los miembros",
    "nav.d.aliados":"El formulario para sumar tu empresa",
    "nav.d.membres":"Los cuatro niveles y sus beneficios",
    "nav.d.calc":"Simula tu aporte y tu beneficio tributario",
    "nav.d.track":"Sigue tu donación con su número de guía",
    "nav.d.origen":"Cómo y por qué nació la fundación",
    "nav.d.impacto":"Fotos, mapa e historias verificables",
    "nav.d.impactos":"El sistema que registra cada aporte",
    "nav.medicion":"Cómo medimos",
    "nav.d.medicion":"Hasta dónde podemos afirmar, y con qué respaldo",
    "nav.d.transp":"Registros oficiales y documentos públicos",
    "nav.d.faq":"Respuestas a las dudas más comunes",
    "nav.d.contacto":"Escríbenos o pasa por el Hub",
    "nav.transp":"Transparencia",
    "nav.contacto":"Contacto",
    "nav.faq":"FAQ",
    "hero.eyebrow":"Colombia · ESAL · NIT 901.948.930-2",
    "hero.title":"Dar para crecer, crecer para dar más.",
    "hero.lead":"Conectamos generosidad con necesidad de forma estratégica y sostenible. No reemplazamos a las fundaciones, las amplificamos. Y aquí, quien da también crece.",
    "path.donar.t":"Quiero donar",
    "path.donar.s":"Como persona natural",
    "path.emp.t":"RSE empresarial",
    "path.emp.s":"Para mi empresa",
    "path.fund.t":"Somos fundación",
    "path.fund.s":"Unirme al Hub",
    "stat.rutas":"Rutas del modelo",
    "stat.pobl":"Poblaciones que buscamos alcanzar",
    "stat.traz":"Trazabilidad",
    "stat.fund":"Año de fundación",
    "hub.aliadas.soon.t":"Más fundaciones en camino",
    "hub.aliadas.soon.p":"Cada aliada entra una a una, con verificación y convenio. Estamos sumando con evidencia, no con promesas.",
    "home.hub.ey":"Nuestro valor diferencial",
    "home.hub.t":"El HUB SOCIAL: tu donación con nombre y evidencia",
    "home.hub.p":"No somos otra fundación pidiendo donaciones. Somos el puente que conecta tu generosidad con fundaciones de base verificadas — y te devuelve la prueba de lo que pasó. Cada aporte se rastrea de principio a fin.",
    "home.hub.s1t":"Tú das","home.hub.s1p":"Eliges a dónde va tu aporte, con total claridad.",
    "home.hub.s2t":"El HUB conecta","home.hub.s2p":"Verificamos y canalizamos a una fundación de base real.",
    "home.hub.s3t":"La fundación entrega","home.hub.s3p":"El apoyo llega a la comunidad, con acta y registro.",
    "home.hub.s4t":"Recibes la evidencia","home.hub.s4p":"Foto, factura y trazabilidad de vuelta. No promesas.",
    "home.hub.btn":"Conoce cómo funciona el HUB",
    "model.ey":"El modelo",
    "model.t":"El sector social opera fragmentado. Somos el puente.",
    "model.p":"Potenciamos fundaciones en campo, conectamos donantes con causas verificadas y creamos un ecosistema donde dar tiene beneficios reales para quien contribuye.",
    "model.btn":"Ver el HUB SOCIAL",
    "feat.hub.t":"HUB SOCIAL",
    "feat.hub.p":"Centro operativo. Cinco rutas que conectan alianzas, donaciones e impacto medible.",
    "feat.hub.tag":"Activo hoy",
    "feat.grat.t":"Programa de Gratitud",
    "feat.grat.p":"Red de empresas aliadas con descuentos exclusivos para todos los miembros activos.",
    "feat.grat.tag":"Nuevo",
    "feat.tax.t":"Beneficio tributario",
    "feat.tax.p":"Descuento del 25% sobre el impuesto de renta a cargo (Art. 257 ET) por cada donación vía sistema financiero, en los términos y límites que contempla la ley.",
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
    "origen.ey":"Nuestro origen",
    "origen.t":"Todo empezó con una tonelada de comida.",
    "origen.p1":"Tras semanas de gestión, una campaña alcanzó su meta: una tonelada de alimento para entregar a una fundación. Pero al llegar, la fundación no tenía cómo almacenar ni repartir todo ese alimento. Casi la mitad se perdió. Ver esa comida desperdiciarse —comida que a pocas cuadras alguien necesitaba— dejó una pregunta que no soltó al fundador: ¿cómo cierro la brecha entre los recursos y la necesidad, con lo que tengo a la mano?",
    "origen.p2":"Esa pregunta se volvió método. Give&Grow International nace de casi cuatro años de experiencia de campo de Juan Sebastián Navarro Osorio en La Guajira, la Sierra Nevada y las comunas de Medellín, y se constituye por documento privado el 11 de abril de 2025, con registro en la Cámara de Comercio de Medellín el 19 de mayo de 2025, como Entidad Sin Ánimo de Lucro (ESAL) bajo el Régimen Tributario Especial. El propósito: restaurar la confianza en el acto de dar, con trazabilidad y sin intermediarios opacos.",
    "e404.t":"Esta página no existe (todavía)",
    "e404.p":"El enlace que seguiste no lleva a ningún lugar de nuestro ecosistema. Pero cada camino aquí lleva a algo que sí importa.",
    "e404.home":"Volver al inicio","e404.hub":"Conocer el HUB",
    "live.donaciones":"Donaciones registradas",
    "live.entregas":"Entregas con evidencia",
    "live.trazable":"Cada una, rastreable",
    "live.note":"Números reales, actualizados desde nuestro registro. Empezamos con lo que podemos probar.",
    "track.cta.t":"¿Ya donaste? Sigue tu donación",
    "track.cta.p":"Con tu número de guía puedes ver en qué punto va tu aporte, hasta la evidencia de entrega.",
    "track.cta.btn":"Rastrear mi donación",
    "ally.ey":"Alianza empresarial",
    "ally.t":"Quiero ser aliado",
    "ally.lead":"Tu empresa puede apoyar el impacto de la forma que elija — sin costo, sin exclusividad, y con reconocimiento. Cuéntanos y te enviaremos el Convenio Marco de Alianza para revisar y firmar.",
    "ally.s.empresa":"Datos de la empresa",
    "ally.f.razon":"Razón social o nombre del emprendimiento *",
    "ally.f.nit":"NIT o documento",
    "ally.f.rep":"Representante legal",
    "ally.f.cedula":"Cédula del representante",
    "ally.f.contacto":"Contacto (nombre y cargo)",
    "ally.f.correo":"Correo *",
    "ally.f.tel":"Teléfono",
    "ally.f.ciudad":"Ciudad",
    "ally.f.dir":"Dirección",
    "ally.f.web":"Sitio web",
    "ally.f.instagram":"Instagram",
    "ally.f.sector":"Sector o industria",
    "ally.sector.ph":"Selecciona…",
    "ally.sector.gastro":"Gastronomía",
    "ally.sector.moda":"Moda",
    "ally.sector.belleza":"Belleza y bienestar",
    "ally.sector.salud":"Salud y odontología",
    "ally.sector.serv":"Servicios profesionales",
    "ally.sector.comercio":"Comercio y retail",
    "ally.sector.otro":"Otro",
    "ally.f.aporta":"En una frase, ¿qué aporta tu empresa?",
    "ally.f.aporta.ph":"Ej. Padrinazgo de 200 platos al mes",
    "ally.f.desc":"Descripción del negocio (en tus propias palabras)",
    "ally.s.mods":"¿Cómo quieres apoyar? (elige una o varias)",
    "ally.m.don.t":"Donación",
    "ally.m.don.p":"En dinero o en especie, con certificado.",
    "ally.m.rse.t":"RSE",
    "ally.m.rse.p":"Canaliza tu responsabilidad social con impacto medible.",
    "ally.m.grat.t":"Programa de Gratitud",
    "ally.m.grat.p":"Ofrece un beneficio a la comunidad de la fundación.",
    "ally.m.serv.t":"Servicios",
    "ally.m.serv.p":"Gratuitos o con beneficio para población vulnerable.",
    "ally.m.vol.t":"Voluntariado corporativo",
    "ally.m.vol.p":"Tus colaboradores participan en jornadas diseñadas, con protocolo de cuidado.",
    "ally.m.dif.t":"Difusión",
    "ally.m.dif.p":"Das a conocer la labor en tus canales.",
    "ally.s.ficha":"Ficha del Beneficio (Programa de Gratitud)",
    "ally.f.ben":"¿Qué beneficio ofreces?",
    "ally.f.nivel":"¿Desde qué nivel de membresía?",
    "ally.f.redime":"¿Cómo se redime?",
    "ally.f.cond":"Condiciones o vigencia",
    "ally.s.serv":"Servicio para población vulnerable",
    "ally.f.servdet":"Describe el servicio",
    "ally.s.aut":"Autorizaciones (requeridas)",
    "ally.a.marca":"Autorizo mostrar públicamente el nombre, logo y redes de mi empresa para difundir la alianza.",
    "ally.a.datos":"Autorizo el tratamiento de los datos conforme a la Ley 1581 de 2012.",
    "ally.a.licitud":"Declaro que la información es veraz y que los recursos y la actividad son de origen lícito.",
    "ally.submit":"Enviar solicitud",
    "ally.legal":"Enviar esta solicitud no constituye la alianza. La alianza se perfecciona con la firma del Convenio Marco, que te enviaremos a tu correo.",
    "ally.sending":"Enviando tu solicitud…",
    "ally.ok":"¡Recibimos tu solicitud! Te enviamos un correo de confirmación y pronto recibirás el Convenio Marco para firmar.",
    "ally.err.aut":"Para continuar, marca las tres autorizaciones requeridas.",
    "ally.err.mod":"Marca al menos una forma de apoyar.",
    "ally.err.ben":"Cuéntanos qué beneficio ofreces para el Programa de Gratitud.",
    "ally.err.serv":"Describe el servicio que ofreces a la población vulnerable.",
    "ally.err.send":"No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos a contabilidad@thegiveandgrowproject.org.",
    "rep.ey":"Ya transferí",
    "rep.t":"Repórtanos tu transferencia",
    "rep.lead":"Una transferencia no nos avisa sola. Repórtala aquí y te damos un número de guía al instante: con él sigues tu aporte, y cuando la verifiquemos contra el extracto te llega el recibo — y el certificado, si lo pediste.",
    "rep.monto":"Monto transferido (COP)",
    "rep.fecha":"Fecha de la transferencia",
    "rep.ref":"Número del comprobante (opcional, ayuda mucho)",
    "rep.ref.ph":"El número que aparece en tu comprobante o extracto",
    "rep.dest":"¿A dónde va?",
    "rep.dest.fondo":"Donde más se necesite (fondo general)",
    "rep.dest.brigada":"Brigada de atención a emergencia · 5 sectores",
    "rep.nombre":"Nombre o razón social",
    "rep.email":"Correo",
    "rep.cert":"Quiero certificado de donación",
    "rep.datos":"Autorizo el tratamiento de mis datos para registrar y verificar este aporte, conforme a la Política de Privacidad.",
    "rep.btn":"Reportar mi transferencia",
    "rep.sending":"Registrando…",
    "rep.err":"No pudimos registrarlo. Intenta de nuevo o escríbenos.",
    "rep.err.monto":"Escribe el monto que transferiste.",
    "rep.err.fecha":"Falta la fecha de la transferencia.",
    "rep.err.nombre":"Falta tu nombre.",
    "rep.err.email":"Ese correo no parece válido.",
    "rep.err.datos":"Necesitamos tu autorización para tratar los datos.",
    "rep.ok.t":"Listo. Tu número de guía es",
    "rep.ok.p":"Guárdalo: con él sigues tu aporte en el rastreo. Todavía no está confirmado — verificamos cada transferencia contra el extracto antes de registrarla como recibida.",
    "rep.sube":"Sube tu comprobante (opcional)",
    "rep.sube.p":"Imagen o PDF, hasta 5 MB. Con el comprobante la verificación es inmediata; sin él hay que buscarla a mano en el extracto.",
    "rep.sube.ok":"Comprobante recibido. Gracias.",
    "rep.sube.err":"No pudimos subir el archivo.",
    "rep.link":"¿Ya transferiste? Repórtalo aquí",
    "track.ey":"Trazabilidad real",
    "track.t":"Rastrea tu donación",
    "track.lead":"Cada donación tiene un número de guía único. Escríbelo y sigue su recorrido, de principio a fin.",
    "track.ph":"GG-2026-000001",
    "track.aria":"Número de guía de tu donación",
    "calc.slider.aria":"Ajusta el monto de tu donación",
    "calc.manual.aria":"Escribe el monto de tu donación",
    "track.btn":"Rastrear",
    "track.noguide":"No tengo mi guía",
    "track.loading":"Buscando tu donación…",
    "track.err.load":"No pudimos cargar la información en este momento. Intenta de nuevo en un momento.",
    "track.nf.t":"No encontramos esa guía",
    "track.nf.p":"No hay ninguna donación con la guía {guia}. Revisa que esté bien escrita (formato GG-AAAA-000000) o solicita que te la reenviemos.",
    "track.since":"Registrada el",
    "track.type.dinero":"Donación en dinero",
    "track.type.especie":"Donación en especie",
    "track.mode.fondo":"Fondo general",
    "track.mode.dirigida":"Donación dirigida",
    "track.delivered.t":"Entregada con evidencia",
    "track.foot":"Cada cambio de estado queda registrado. Cuando tu donación se entregue, aquí verás el acta y el reporte.",
    "track.ng.t":"Te reenviamos tu guía",
    "track.ng.p":"Escribe el correo con el que hiciste tu donación y te enviaremos tu número de guía para que puedas rastrearla.",
    "track.ng.btn":"Solicitar mi guía",
    "track.ng.invalid":"Escribe un correo válido, por favor.",
    "track.ng.sent":"Abrimos tu correo con la solicitud lista para enviar. Te responderemos con tu guía.",
    "track.ng.mailsubj":"Solicitud de guía de donación",
    "track.ng.mailbody":"Hola, hice una donación con el correo {email} y quiero solicitar mi número de guía para rastrearla. Gracias.",
    "a11y.skip":"Saltar al contenido",
    "hub.intro.ey":"El HUB SOCIAL",
    "hub.intro.t":"¿Qué es un HUB?",
    "hub.intro.p1":"Un HUB es un punto de encuentro: un lugar donde se conectan personas, recursos y capacidades que por separado no se encontrarían. No reemplaza a quienes ya trabajan; los articula para que su esfuerzo llegue más lejos.",
    "hub.intro.t2":"Entonces, ¿qué es el HUB SOCIAL de Give&Grow?",
    "hub.intro.p2":"Es nuestro motor operativo en terreno: el puente que conecta la generosidad de donantes y empresas con fundaciones de base verificadas, de forma trazable y sostenible. Aquí, quien da también crece, y cada aporte llega con evidencia: acta, foto y factura.",
    "hub.found.ey":"Fundaciones del HUB",
    "hub.found.t":"Quiénes forman la red hoy",
    "hub.found.p":"Empezamos con una fundación aliada y una red en proceso de vinculación formal. Cada una entra una a una, con verificación y convenio — sin nombres ni cifras infladas.",
    "hub.aporta.ey":"Aliadas que aportan",
    "hub.aporta.t":"Fundaciones que fortalecen el Hub",
    "hub.aporta.p":"No todas las aliadas entran a recibir. Algunas fundaciones suman capacidades, servicios y conocimiento que hacen más fuerte al HUB SOCIAL y a Give&Grow — y así llegan mejor a las comunidades.",
    "hub.aporta.empty":"Estamos formalizando las primeras aliadas que aportan al Hub. Aquí verás qué le entrega cada una — con evidencia, no promesas.",
    "net.type.foundation.aporta":"Aliada que aporta",
    "hub.routes.ey":"Cómo operamos",
    "hub.t":"Cinco rutas. Un solo propósito.",
    "hub.lead":"El centro operativo donde alianzas, donaciones e impacto se encuentran.",
    "hub.r1.t":"R1 - Alianzas con Fundaciones",
    "hub.r1.p":"Fortalecemos a fundaciones verificadas con logística y visibilidad, sin reemplazar su labor. Ejemplo real: Fundación Niños del Futuro, en Manrique (Medellín), con Chefs del Futuro y Borboletas.",
    "hub.r2.t":"R2 - Gestión de Donaciones",
    "hub.r2.p":"Donaciones en especie y monetarias con trazabilidad completa: acta, foto y reporte. Ejemplo real: en NDF un plato de comida cuesta $4.000 y tu aporte se traduce en platos entregados, con evidencia.",
    "hub.r3.t":"R3 - Social Grow",
    "hub.r3.p":"Fortalecer las capacidades de las propias fundaciones aliadas: esa línea la estamos construyendo. La formación que ya ocurre en la red la hacen ellas — nuestro papel es canalizar recursos, documentarla y darle visibilidad.",
    "hub.form.ey":"Formación",
    "hub.form.t":"La red ya forma",
    "hub.form.p":"Give&Grow no dicta estos programas: los diseñan y los sostienen las fundaciones aliadas, que conocen a su gente. Nuestro papel es canalizar recursos, documentar lo que ocurre y darle visibilidad. El crédito y el mérito son suyos.",
    "hub.form.mira":"Todos comparten algo con MIRA: no se quedan en enseñar una técnica. Buscan que la persona descubra que es capaz — y eso es lo que le amplía la mirada sobre su propio futuro.",
    "hub.form.link":"Conocer la fundación",

    "hub.r4.t":"R4 - Impact Journey",
    "hub.r4.p":"Experiencias que llevan a donantes y equipos aliados al campo, con comunidades reales y un reporte de impacto. Ya hicimos las primeras jornadas con donantes y aliados; estamos profundizando el modelo antes de abrirlo a equipos de empresa.",
    "hub.r5.t":"R5 - Conexión Laboral",
    "hub.r5.p":"Puente hacia el empleo para poblaciones vulnerables. Fase futura. Ejemplo: acompañamiento de 12 a 18 meses a una persona saliendo de reclusión, conectada con formación (R3) y con las empresas aliadas de la red.",
    "hub.pob.t":"Las poblaciones que queremos alcanzar",
    "hub.pob.note":"Nuestra misión apunta a impactar todo tipo de población vulnerable a través de las fundaciones que se suman al HUB. Estas son las que hoy guían nuestro objeto social; la cobertura real crece con cada aliada que entra con trabajo y evidencia.",
    "hub.pob.list":"Niñez en riesgo - Comunidades indígenas - Comunidades campesinas - Personas en situación de calle - Adultos mayores - Animales en maltrato - Personas en rehabilitación - Personas privadas de la libertad",
    "emp.ey":"RSE empresarial",
    "emp.t":"Tu empresa, con propósito y trazabilidad.",
    "emp.lead":"Tres formas de aliarte. Cada una con beneficio tributario y reporte verificable.",
    "emp.aliadas.ey":"Red de empresas aliadas",
    "emp.aliadas.t":"Empresas que crecen dando",
    "emp.aliadas.lead":"Cada alianza entra con convenio firmado. Aquí verás las empresas que ya suman al impacto — con trazabilidad y reconocimiento.",
    "emp.aliadas.empty":"Estamos sumando las primeras empresas aliadas. Muy pronto verás aquí quiénes ya crecen dando — con evidencia, no promesas.",
    "emp.aliadas.cta":"Quiero aliar mi empresa",
    "emp.card.aporta":"Aporta",
    "emp.card.recibe":"Recibe",
    "emp.mod.padrinazgo":"Padrinazgo de Impacto",
    "emp.mod.journey":"Impact Journey",
    "emp.mod.alianza":"Alianza a medida",
    "emp.mod.gratitud":"Programa de Gratitud",
    "emp.p1.t":"Padrinazgo de Impacto",
    "emp.p1.p":"Defines un presupuesto y, con la Calculadora de Impacto, lo traduces en unidades reales y verificables. Recibes certificado de donación y reporte de impacto con evidencia.",
    "emp.p2.t":"Impact Journey",
    "emp.p2.p":"Voluntariado corporativo en doble vía (Ruta 4): tu equipo vive la realidad de las comunidades que apoya, y la comunidad también gana. Ya hicimos las primeras jornadas con donantes y aliados; ahora estamos abriendo el formato a equipos de empresa — escríbenos para diseñar la primera.",
    "emp.p3.t":"Alianza a medida",
    "emp.p3.p":"Un canal abierto para co-crear juntos programas, campañas o formas de cooperación ajustadas a la realidad de tu empresa.",
    "nav.voluntariado":"Voluntariado e Impact Journey",
    "nav.d.voluntariado":"Cómo participar en terreno, en tres niveles",
    "vol.ey":"Voluntariado",
    "vol.t":"Aquí nadie viene a mirar.",
    "vol.lead":"Buscamos que quien llega amplíe su mirada, y que la fundación quede con algo que antes no tenía. Las dos cosas, en la misma jornada.",
    "vol.niv.ey":"Cómo participar",
    "vol.niv.t":"Hay tres maneras de estar",
    "vol.niv.p":"El nivel no lo define tu oficio: lo define si pisas el territorio. Puedes aportar solo desde la estructura, solo en terreno, o partir tu tiempo entre las dos.",
    "vol.n1.t":"Con el HUB SOCIAL",
    "vol.n1.p":"En terreno, junto a una fundación aliada y su equipo. Ellos conocen a su comunidad: definen cuándo una visita suma y qué espacios se comparten.",
    "vol.n2.t":"Con Give&Grow",
    "vol.n2.p":"Tu oficio fortalece la estructura que sostiene la red — derecho, contabilidad, desarrollo, diseño, formación. Ocurre fuera del territorio.",
    "vol.n3.t":"Mixto · HUB y Give&Grow",
    "vol.n3.p":"Combinas las dos, en la proporción que tú definas. Un diseñador que trabaja en la web y también va a una jornada; alguien de comunicaciones que documenta lo que pasa.",
    "vol.mira.ey":"El método",
    "vol.mira.t":"MIRA: dos miradas que se amplían",
    "vol.mira.p":"Le llamamos MIRA porque de eso se trata: ampliar la mirada. Y porque la sigla nombra sus cuatro fases — Marco, Inmersión, Reflexión y Anclaje.",
    "vol.mira.obj":"Su nombre técnico lo precisa: metodología de ampliación del campo perceptual a través de experiencias significativas.",
    "vol.mira.def.t":"Qué significa ampliar la mirada",
    "vol.mira.def.p":"El campo perceptual es todo lo que una persona alcanza a ver como posible — para sí misma y para su entorno. Cuando alguien crece creyendo que ciertas cosas «no son para él», ese límite muchas veces no es de capacidad: es de percepción. Y lo mismo pasa al otro lado: quien nunca ha estado en un barrio no alcanza a ver lo que allí ya funciona.",
    "vol.mira.def.p2":"MIRA trabaja justo ahí. No da un discurso: diseña una experiencia donde la persona hace algo que no creía posible, y después la acompaña a ponerlo en palabras. Lo que se amplía no es la información que tiene: es lo que alcanza a ver como posible.",
    "vol.mira.sigla.t":"Las cuatro fases, letra por letra",
    "vol.f1.q":"Abre el campo. Un campo en estado de defensa no admite percepción nueva: primero se acuerda un espacio seguro y se plantea un reto que rompe la expectativa.",
    "vol.f2.q":"Lo tensiona. La experiencia introduce algo que el campo actual no puede explicar. Esa incomodidad es la que obliga a ampliar — por eso el reto tiene que ser exigente, aunque alcanzable.",
    "vol.f3.q":"Lo consolida. La vivencia se vuelve percepción cuando se pone en palabras. Sin esta fase la experiencia se olvida y el campo se cierra otra vez.",
    "vol.f4.q":"Lo fija. Un compromiso pequeño y realizable lleva la mirada ampliada a la vida cotidiana, para que no se quede en el día que pasó.",
    "vol.mira.why.t":"Por qué cuatro y no una",
    "vol.mira.why.p":"Porque quitar cualquiera rompe la cadena. Sin Marco no hay apertura. Sin Inmersión no hay nada nuevo que explicar. Sin Reflexión no hay significado, solo una anécdota. Y sin Anclaje no hay transferencia: la jornada se queda en el día que pasó. Eso es lo que separa a MIRA de una jornada bonita.",
    "vol.mira.teo":"No es una idea nueva: se apoya en la psicología del campo perceptual (Combs y Snygg), en la autoeficacia de Bandura y en el ciclo de aprendizaje experiencial de Kolb. Lo propio nuestro es aplicarla en doble vía.",
    "vol.mira.dv.t":"La misma jornada, dos miradas",
    "vol.mira.vol":"Quien llega",
    "vol.mira.par":"Quien participa",
    "vol.f1":"Marco",
    "vol.f1.v":"Vienes a aprender de quien sabe algo que tú no sabes.",
    "vol.f1.p":"«Vas a resolver algo que no habías intentado.»",
    "vol.f2":"Inmersión",
    "vol.f2.v":"Trabajas al lado, no por encima.",
    "vol.f2.p":"Rol protagónico en el reto, no de espectador.",
    "vol.f3":"Reflexión",
    "vol.f3.v":"«¿Qué creía antes de llegar que hoy ya no creo?»",
    "vol.f3.p":"«¿Qué descubrí en mí que no sabía que tenía?»",
    "vol.f4":"Anclaje",
    "vol.f4.v":"Qué vas a aportar de vuelta.",
    "vol.f4.p":"Un compromiso pequeño en su propio entorno.",
    "vol.mira.cierre":"Dos miradas que se amplían la una hacia la otra. Eso es dar para crecer, y crecer para dar más.",
    "vol.cuid.ey":"Lo primero",
    "vol.cuid.t":"Primero, el cuidado",
    "vol.cuid.p":"Trabajamos con niñas, niños y jóvenes. Por eso el cuidado no es una cláusula al final: está en el diseño.",
    "vol.cuid.1":"Dos verificaciones antes de pisar terreno: la nuestra y la de la fundación que acompaña a esa comunidad.",
    "vol.cuid.2":"Nunca a solas: cada actividad ocurre acompañada por el equipo de la fundación.",
    "vol.cuid.3":"El consentimiento va primero que la cámara. Las fotos las deciden la fundación y las familias, nunca quien visita.",
    "vol.cuid.4":"Si la fundación considera que no es el momento, esperamos. El ritmo lo pone la comunidad.",
    "vol.port.ey":"Dónde puedes estar",
    "vol.port.t":"Una red, muchas realidades",
    "vol.port.p":"Un solo acuerdo con Give&Grow abre varias experiencias distintas. Ninguna fundación sola puede ofrecer eso.",
    "vol.port.note":"Así está diseñado el modelo. Cada experiencia se abre cuando hay una fundación aliada verificada para esa población — y la red crece una alianza a la vez.",
    "vol.hoy.ey":"Dónde estamos hoy",
    "vol.hoy.t":"Contado sin adornos",
    "vol.hoy.p":"Ya hicimos las primeras jornadas con donantes y aliados. Con equipos de empresa estamos abriendo el formato: si tu equipo quiere ser el primero, conversemos. Nada de esto se cobra.",
    "vol.cta":"Quiero participar",
    "vf.ey":"Sumarte",
    "vf.t":"Cuéntanos quién eres",
    "vf.lead":"No hay mínimo de horas ni compromiso obligado. Lo que sí hay es una conversación antes de empezar: queremos conocerte y encontrar juntos dónde encajas mejor.",
    "vf.nombre":"Nombre completo",
    "vf.email":"Correo",
    "vf.tel":"Teléfono o WhatsApp (opcional)",
    "vf.ciudad":"Ciudad (opcional)",
    "vf.nivel.lbl":"¿Cómo quieres participar?",
    "vf.nivel.help":"El nivel no lo define tu oficio: lo define si pisas el territorio. Un diseñador puede aportar solo en la estructura, solo en terreno, o partir su tiempo entre las dos.",
    "vf.nivel.hub":"Con el HUB SOCIAL — en terreno, junto a una fundación aliada",
    "vf.nivel.est":"Con Give&Grow — en la estructura, sin pisar territorio",
    "vf.nivel.mix":"Mixto — parte estructura, parte terreno",
    "vf.oficio":"Tu oficio o área",
    "vf.oficio.ph":"Derecho, contabilidad, salud, desarrollo, docencia, comunicación…",
    "vf.disp":"Disponibilidad (opcional)",
    "vf.disp.ph":"Un sábado al mes, dos horas a la semana, por proyecto…",
    "vf.captura":"Voy a fotografiar o grabar",
    "vf.captura.help":"Marcarlo no es un problema, es lo que activa el protocolo de imagen. El consentimiento va primero que la cámara, y lo deciden la fundación y las familias — nunca quien visita.",
    "vf.msg":"¿Algo que quieras contarnos? (opcional)",
    "vf.msg.ph":"Qué te mueve, qué te gustaría hacer, qué dudas tienes.",
    "vf.datos":"Autorizo el tratamiento de mis datos para que Give&Grow me contacte sobre voluntariado, conforme a la Ley 1581 de 2012 y a su Política de Privacidad.",
    "vf.terreno.aviso":"Como estarías en terreno, antes de cualquier jornada pasan dos verificaciones —la nuestra y la de la fundación que acompaña a esa comunidad— y una sesión de Marco. La fundación tiene la última palabra sobre cuándo una visita suma: no es un filtro, es la anfitriona.",
    "vf.submit":"Enviar mis datos",
    "vf.sending":"Enviando…",
    "vf.ok":"Listo. Te escribimos pronto al correo que dejaste, y ahí te contamos los siguientes pasos.",
    "vf.err.nombre":"Nos falta tu nombre.",
    "vf.err.email":"Revisa el correo: parece que tiene algo raro.",
    "vf.err.nivel":"Elige cómo quieres participar.",
    "vf.err.oficio":"Cuéntanos tu oficio o área.",
    "vf.err.datos":"Necesitamos tu autorización para guardar tus datos y poder escribirte.",
    "vf.err.send":"No pudimos enviar tus datos. Vuelve a intentarlo, o escríbenos a sebas@thegiveandgrowproject.org.",
    "vf.nada":"Nada de esto se cobra, en ninguna dirección.",
    "vf.origen.brig":"Vienes de la brigada del terremoto. Te marcamos «en la estructura» porque es lo que se puede sumar a tiempo: el acopio de Medellín, del 24 al 28 de agosto. Puedes cambiarlo si prefieres el programa de todo el año.",
    "ff.ey":"Aplicar al HUB",
    "ff.t":"Cuéntanos quién es tu fundación",
    "ff.lead":"Esto es la aplicación, no la vinculación: con lo que escribas aquí revisamos si encajamos, y si encajamos vamos a conocerte a tu territorio. Solo te pedimos texto — el logo, las fotos y las cifras de costos se ven después, cuando ya nos conozcamos.",
    "ff.s.id":"Quiénes son",
    "ff.nombre":"Nombre oficial de la fundación",
    "ff.nombre.help":"Tal como debe aparecer publicado si algún día publicamos su perfil.",
    "ff.sigla":"Nombre corto o sigla (opcional)",
    "ff.lider":"Quién lidera la fundación",
    "ff.cargo":"Su cargo (opcional)",
    "ff.cargo.ph":"Directora y fundadora, representante legal…",
    "ff.anio":"¿Desde qué año trabajan? (opcional)",
    "ff.pers.lbl":"¿Tiene personería jurídica?",
    "ff.pers.help":"Cualquier respuesta sirve para aplicar. Esto no define si entran: define cómo describimos a la organización si algún día publicamos su perfil.",
    "ff.pers.nit":"Sí, con NIT",
    "ff.pers.tramite":"En trámite",
    "ff.pers.base":"No — es un proyecto comunitario de base",
    "ff.zona":"Barrio o sector y ciudad donde trabajan",
    "ff.zona.ph":"Ej. La Honda, Manrique, Medellín",
    "ff.zona.help":"El sector, no la dirección exacta. En el mapa de la red el pin va a nivel de barrio, nunca a la puerta.",
    "ff.ciudad":"Ciudad (opcional)",
    "ff.email":"Correo de contacto",
    "ff.tel":"Teléfono o WhatsApp (opcional)",
    "ff.tel.help":"Los datos de contacto son para coordinar entre nosotros. No se publican en el sitio.",
    "ff.s.hist":"Qué hacen y por qué",
    "ff.historia":"La historia de la fundación, en un párrafo",
    "ff.historia.ph":"Cómo nació, quién la lidera, a quién sirve y qué la hace distinta.",
    "ff.mision":"La misión, en una o dos frases",
    "ff.s.pob":"A quién llegan",
    "ff.pob.lbl":"¿A quiénes atiende la fundación?",
    "ff.pob.ninos":"Niños y niñas",
    "ff.pob.adolescentes":"Adolescentes",
    "ff.pob.jovenes":"Jóvenes",
    "ff.pob.madres":"Madres cabeza de familia",
    "ff.pob.mayores":"Adultos mayores",
    "ff.pob.familias":"Familias",
    "ff.pob.migrante":"Población migrante",
    "ff.pob.discapacidad":"Personas con discapacidad",
    "ff.pob.otra":"Otra",
    "ff.pob.otra.lbl":"¿Cuál?",
    "ff.atiende":"¿A cuántas personas atienden de forma regular?",
    "ff.atiende.help":"El número real, aunque sea aproximado. Si es estimado lo publicamos con «≈»: preferimos un número honesto a uno redondo.",
    "ff.conteo":"¿Cómo llevan esa cuenta? (opcional)",
    "ff.conteo.ph":"Planillas de asistencia, registro digital, listados por programa, conteo aproximado…",
    "ff.conteo.help":"Esto decide si la cifra se publica exacta o con «≈». No es una prueba: es lo que nos permite no inflar su trabajo.",
    "ff.s.prog":"Un programa",
    "ff.prog.help":"El que mejor represente su labor diaria. Los demás los vemos cuando nos conozcamos.",
    "ff.prog":"Nombre del programa (opcional)",
    "ff.prog.ph":"Ej. Chefs del Futuro",
    "ff.prog.desc":"¿Qué hace y a cuántas personas llega? (opcional)",
    "ff.prog.desc.ph":"Con números reales y frecuencia. Ej. cerca de 100 niños reciben almuerzo cada día, de lunes a viernes.",
    "ff.evid":"¿Qué evidencia tienen de que funciona? (opcional)",
    "ff.evid.ph":"Registro fotográfico, planillas de asistencia, facturas, testimonios, informes…",
    "ff.s.red":"Dónde encontrarlos",
    "ff.web":"Página web (opcional)",
    "ff.instagram":"Instagram (opcional)",
    "ff.s.aut":"Antes de enviar",
    "ff.datos":"Autorizo el tratamiento de estos datos para que Give&Grow nos contacte sobre la aplicación al HUB SOCIAL, conforme a la Ley 1581 de 2012 y a su Política de Privacidad.",
    "ff.veraz":"Declaro que la información es veraz, que las cifras corresponden a la realidad de la fundación y que estoy facultado(a) para aplicar en su nombre.",
    "ff.despues":"Todavía no pedimos logo, fotos ni soportes de costos. Eso viene después de la visita de contexto, junto con las autorizaciones de derechos de imagen — la imagen de los menores está protegida por la Ley 1098 y no publicamos nada sin consentimiento escrito.",
    "ff.submit":"Enviar la aplicación",
    "ff.sending":"Enviando…",
    "ff.ok":"Recibimos su aplicación. Le llega un correo de confirmación y una persona de Give&Grow le escribe para seguir la conversación.",
    "ff.legal":"Aplicar no es entrar. Lo que sigue es la revisión, la visita de contexto y, si encajamos, el convenio de cooperación — gratuito, como todo lo demás.",
    "ff.err.nombre":"Nos falta el nombre de la fundación.",
    "ff.err.email":"Revisa el correo: parece que tiene algo raro.",
    "ff.err.lider":"Cuéntanos quién lidera la fundación.",
    "ff.err.pers":"Elige una opción de personería jurídica. Cualquiera sirve.",
    "ff.err.zona":"Dinos el barrio o sector y la ciudad donde trabajan.",
    "ff.err.historia":"Cuéntanos la historia de la fundación, aunque sea en pocas líneas.",
    "ff.err.mision":"Nos falta la misión.",
    "ff.err.pob":"Marca al menos una población que atiendan.",
    "ff.err.atiende":"Dinos a cuántas personas llegan, aunque sea aproximado.",
    "ff.err.datos":"Necesitamos la autorización de datos para poder escribirles.",
    "ff.err.veraz":"Necesitamos la declaración de veracidad para recibir la aplicación.",
    "ff.err.send":"No pudimos enviar la aplicación. Vuelve a intentarlo, o escríbenos a sebas@thegiveandgrowproject.org.",
    "vol.link":"Ver el programa de voluntariado",
    "fund.ey":"Para fundaciones",
    "fund.t":"Aplica al HUB SOCIAL.",
    "fund.lead":"Más de 25 fundaciones preaprobadas en nuestra red de espera: su vinculación formal se confirma una a una, con verificación y evidencia.",
    "fund.req.t":"Qué buscamos",
    "fund.req.p":"Fundaciones legalmente constituidas, con trabajo verificable en campo y disposición a la trazabilidad.",
    "fund.give.t":"Aliadas que aportan",
    "fund.give.p":"Un modelo novedoso: algunas fundaciones contribuyen servicios al Hub en lugar de solo recibir.",
    "fund.proto.t":"Protocolo de cumplimiento",
    "fund.proto.p":"Faltas leves van a revisión de comité con tres oportunidades; faltas gravísimas, como el mal uso de fondos, implican expulsión inmediata y acción legal.",
    "fund.btn":"Quiero aplicar",
    "grat.ey":"Programa de Gratitud",
    "grat.t":"Quien da, también recibe.",
    "grat.lead":"Una red de empresas aliadas que ofrecen beneficios voluntarios a los miembros activos, desde el nivel Retoño.",
    "imp.ey":"Impacto",
    "imp.t":"Evidencia, no promesas.",
    "imp.tab.gal":"Galería",
    "imp.tab.map":"Mapa",
    "imp.tab.blog":"Historias",
    "alma.placeholder":"Escribe tu pregunta...",
    "hero.imgalt":"Padre e hijo juegan con un balón entregado en jornada, en su comunidad wayuu de la Alta Guajira",
    "banner.ey":"La Guajira · Enero 2025",
    "banner.quote":"Esto también es evidencia.",
    "banner.link":"Ver más evidencia",
    "banner.imgalt":"Niña wayuu a contraluz durante una jornada al atardecer en la Alta Guajira",
    "hero.tour":"¿Primera vez aquí? Haz el recorrido completo",
    "hub.cta.t":"El Hub crece con cada aliado.",
    "hub.cta.p":"Si diriges una fundación, este puente es para ti. Y si quieres fortalecer la red, tu aporte la hace crecer.",
    "hub.cta.b1":"Quiero aplicar al Hub",
    "hub.cta.b2":"Quiero donar",
    "imp.cta.t":"La evidencia crece contigo.",
    "imp.cta.p":"Cada aporte se convierte en un dato verificable más: un plato, un kit, una jornada con acta y foto.",
    "imp.cta.b1":"Donar ahora",
    "imp.cta.b2":"Ver membresías",
    "faq.cta2.t":"¿Quedó alguna pregunta?",
    "faq.cta2.p":"ALMA te responde al instante, o escríbenos directamente: una persona real te contesta.",
    "faq.cta2.b1":"Hablar con ALMA",
    "faq.cta2.b2":"Ir a contacto",
    "don.cta.t":"¿Dudas antes de dar el paso?",
    "don.cta.p":"Es normal. Pregunta lo que necesites: para eso están ALMA y nuestro equipo.",
    "don.cta.b1":"Hablar con ALMA",
    "don.cta.b2":"Escribirnos",
    "alma.fab":"Habla con ALMA, nuestra asistente",
    "journey.t":"El recorrido",
    "journey.next":"Siguiente",
    "journey.done":"Recorrido completo. Gracias por conocernos de principio a fin.",
    "nav.inicio":"Inicio",
    "theme.auto":"Tema: automático según la hora. Clic para modo claro",
    "theme.light":"Tema: claro. Clic para modo oscuro",
    "theme.dark":"Tema: oscuro. Clic para modo automático",
    "alma.send":"Enviar",
    "alma.hello":"Hola, soy ALMA. Puedo contarte cómo donar, los beneficios tributarios, las membresías o cómo aplica tu fundación al Hub. ¿En qué te ayudo?",
    "donar.ey":"Donar",
    "donar.t":"Tu donación, con destino claro.",
    "donar.lead":"Calcula tu impacto y tu beneficio tributario, luego elige cómo aportar.",
    "calc.tipo.lbl":"¿Aportas como persona o empresa?",
    "calc.tab.ind":"Persona",
    "calc.tab.emp":"Empresa",
    "calc.tax":"Beneficio tributario (25%)",
    "calc.tax.legal":"El descuento del 25% (Art. 257 ET) aplica según los términos, requisitos y límites que contempla la ley; su procedencia depende de la situación tributaria de cada donante.",
    "calc.net":"Costo neto de tu donación",
    "calc.annual":"Equivalente anual",
    "calc.freq.m":"Mensual",
    "calc.freq.a":"Anual",
    "calc.freq.u":"Único",
    "pay.now.ey":"Pago en línea",
    "pay.now.t":"Tarjeta o Botón Bancolombia",
    "pay.now.p":"Sales a Wompi, la pasarela de pagos de Bancolombia, y vuelves con tu número de guía. Nosotros nunca vemos ni guardamos los datos de tu medio de pago.",
    "pay.now.btn":"Continuar al pago",
    "pay.now.wait":"Preparando tu pago…",
    "pay.now.err":"No pudimos abrir la pasarela. Vuelve a intentarlo, o aporta por transferencia con los datos de abajo.",
    "pay.now.rec":"Elegiste un aporte {frec}. Por ahora procesamos este primer aporte y dejamos registrada tu intención: cuando habilitemos el débito automático te escribimos para activarlo, sin que tengas que empezar de nuevo.",
    "pay.now.rec.m":"mensual",
    "pay.now.rec.a":"anual",
    "pay.other":"Otras formas de aportar",
    "pay.other.p":"Si prefieres no pagar en línea, o si tu aporte no es dinero.",
    "pay.other.money":"Transferencia o PayPal",
    "give.extra.t":"Más allá del dinero",
    "give.extra.p":"Más allá del aporte monetario, puedes sumar de otras formas. Cuéntanos cuál te interesa y te contactamos.",
    "give.extra.c1":"Voluntariado",
    "give.extra.c2":"Donación en especie",
    "give.extra.c3":"Conexiones y alianzas",
    "give.extra.c4":"Difusión",
    "give.extra.c5":"Servicios pro-bono",
    "give.extra.btn":"Conversemos",
    "gracias.ey":"Tu aporte",
    "gracias.t":"Estamos confirmando tu pago.",
    "gracias.lead":"Ningún medio de pago confirma al instante, así que preferimos decirte la verdad en vez de darte las gracias por algo que todavía no está confirmado. Esta página se actualiza sola.",
    "gracias.guia":"Número de guía",
    "gracias.estado":"Estado",
    "gracias.monto":"Monto",
    "gracias.destino":"Destino",
    "gracias.fondo":"Fondo general",
    "gracias.e.confirmando":"Confirmando",
    "gracias.e.aprobada":"Confirmado",
    "gracias.e.rechazada":"Rechazado",
    "gracias.e.error":"Con problema",
    "gracias.ok.t":"Confirmado. Gracias.",
    "gracias.ok.p":"Tu aporte quedó registrado con su número de guía. Con ese número puedes seguir su recorrido en cualquier momento, y ahí aparecerá el acta cuando se entregue.",
    "gracias.no.t":"El pago no se completó.",
    "gracias.no.p":"No se hizo ningún cobro. Puedes intentarlo de nuevo, o aportar por transferencia; si algo quedó raro, escríbenos con tu número de guía y lo revisamos.",
    "gracias.slow":"La confirmación está tardando más de lo normal. No cierres esta página con prisa: guarda tu número de guía y consúltalo en «Rastrea tu donación» en unos minutos. Si el cobro se hizo, aparecerá.",
    "gracias.save":"Guarda tu número de guía. Es el mismo con el que puedes rastrear tu aporte de principio a fin.",
    "gracias.track":"Rastrear mi aporte",
    "gracias.home":"Volver al inicio",
    "gracias.lost.t":"No encontramos esa transacción.",
    "gracias.lost.p":"Puede que el enlace haya perdido su identificador. Si hiciste un aporte, busca tu número de guía en el correo de confirmación y consúltalo en «Rastrea tu donación».",
    "pay.tab.banco":"Bancolombia",
    "pay.tab.paypal":"PayPal",
    "pay.banco.note":"Transfiere y envía el comprobante a contabilidad@thegiveandgrowproject.org. Te confirmamos la recepción y, si lo pediste, te expedimos el certificado de donación firmado.",
    "pay.bank":"Banco",
    "pay.acc":"Cuenta de Ahorros",
    "pay.holder":"Titular",
    "pay.nit":"NIT",
    "copy":"Copiar",
    "copied":"Copiado",
    "pay.paypal.note":"Para donaciones internacionales en USD. Escríbenos y te enviamos el enlace de PayPal.",
    "transp.ey":"Transparencia",
    "transp.sello.rte":"Régimen Tributario Especial",
    "transp.pie":"thegiveandgrowproject.org · contabilidad@thegiveandgrowproject.org · Fundación Give&Grow International, Medellín, Colombia",
    "transp.impreso":"Impreso el",
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
    "transp.trace.p":"Recibo con número de guía al confirmarse el pago, certificado de donación revisado y firmado, y acta de entrega con fotos publicada en el rastreo de tu aporte.",
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
    "faq.a1":"En la calculadora eliges tu monto y continúas al pago: pagas con tarjeta o con el Botón Bancolombia a través de Wompi, la pasarela de Bancolombia, y vuelves con tu número de guía para seguir tu aporte. Si prefieres transferir, la cuenta de ahorros Bancolombia es la 31000009221 a nombre de Fundación Give&Grow International (NIT 901.948.930-2); envía el comprobante a contabilidad@thegiveandgrowproject.org.",
    "faq.q2":"¿Qué es el Programa de Gratitud?",
    "faq.a2":"Es una red de empresas aliadas que ofrecen descuentos exclusivos a todos los miembros activos, desde el nivel Retoño. Las empresas ganan visibilidad como negocios con propósito y los miembros acceden a beneficios en comercios aliados a medida que se suman.",
    "faq.q3":"¿Cómo funciona el beneficio tributario?",
    "faq.a3":"Por cada donación realizada a través del sistema financiero accedes a un descuento del 25% sobre el impuesto de renta a cargo (Art. 257 ET). Por ejemplo, $4.000.000 COP donados equivalen a $1.000.000 COP menos en tu impuesto.",
    "faq.q4":"¿Puedo ser voluntario?",
    "faq.a4":"Sí. Puedes aportar desde tu oficio —salud, derecho, contabilidad, comunicación, desarrollo, docencia y más— en terreno junto a una fundación aliada, en la estructura del Hub, o combinando las dos. Cuéntanos tu área y tu disponibilidad.",
    "faq.q5":"¿Mi fundación puede aplicar al Hub?",
    "faq.a5":"Sí. Buscamos fundaciones legalmente constituidas, con trabajo verificable en campo y disposición a la trazabilidad. Algunas aliadas contribuyen servicios al Hub en lugar de solo recibir.",
    "faq.q6":"¿Qué hace único al HUB SOCIAL?",
    "grat.cats.note":"Estamos sumando comercios aliados; estas son las categorías que priorizamos. Los beneficios concretos se anuncian a medida que se confirman.",
    "grat.biz.ey":"Comercios aliados",
    "grat.biz.t":"Quiénes ya ofrecen beneficios",
    "grat.biz.lead":"Cada comercio entra con convenio firmado, uno a uno. Aquí verás los beneficios reales, con condiciones claras.",
    "grat.biz.empty":"Estamos sumando los primeros comercios aliados. Muy pronto verás aquí sus beneficios — con evidencia, no promesas.",
    "grat.biz.cta":"¿Tienes un negocio? Alíate",
    "grat.card.nivel":"Desde nivel",
    "grat.card.redime":"Cómo redimir",
    "grat.card.cond":"Condiciones",
    "grat.card.more":"Ver más",
    "com.back":"Volver al Programa de Gratitud",
    "com.aliado":"Comercio aliado",
    "com.benefit.t":"Beneficio para miembros",
    "com.gal.t":"Su trabajo",
    "com.cta.t":"Disfruta este beneficio",
    "com.cta.p":"Este beneficio es para los miembros de Give&Grow. Hazte miembro y accede a esta y otras alianzas.",
    "com.cta.btn":"Quiero ser miembro",
    "faq.q7":"¿Puedo hacer un aporte único en lugar de mensual?",
    "faq.a7":"Sí. En la calculadora puedes elegir Único para una donación puntual, o Mensual/Anual si prefieres un aporte recurrente. En todos los casos recibes tu certificado de donación y el beneficio tributario del Art. 257 ET.",
    "faq.q8":"¿Puedo donar desde el exterior?",
    "faq.a8":"Sí. Para donantes internacionales habilitamos PayPal; escríbenos y te compartimos el enlace. Ten en cuenta que el descuento del Art. 257 ET aplica a contribuyentes del impuesto de renta en Colombia.",
    "faq.q9":"¿Cómo sé a dónde fue mi aporte?",
    "faq.a9":"Con evidencia, no promesas. Cada aporte sigue nuestra trazabilidad: acta de recepción con foto, acta de entrega firmada por quien recibe, reporte fotográfico y certificado de donación. Te contamos a dónde llegó y a quién ayudó.",
    "faq.q10":"¿Qué son ImpactOS y ALMA?",
    "faq.a10":"ImpactOS es el sistema con el que damos trazabilidad y visibilidad al impacto del Hub. ALMA es la asistente que responde tus dudas sobre la fundación aquí en el sitio. Ambos están en construcción y crecen con la red.",
    "ndf.badge":"Proyecto comunitario de base",
    "faq.cta.emp":"Explora las alianzas empresariales →",
    "faq.cta.fund":"Vincula tu fundación al Hub →",
    "map.visit":"Ver sitio web",
    "map.leg.f":"Fundaciones aliadas",
    "map.leg.c":"Empresas aliadas",
    "map.leg.hub":"HUB SOCIAL",
    "map.f.all":"Toda la red",
    "map.sum":"Hoy la red reúne {f}, {c} y {h}. Crece una alianza a la vez.",
    "map.noun.f.one":"fundación aliada","map.noun.f.many":"fundaciones aliadas",
    "map.noun.c.one":"empresa aliada","map.noun.c.many":"empresas aliadas",
    "map.noun.h.one":"HUB","map.noun.h.many":"HUB",
    "map.biz":"Ver beneficio",
    "com.maps":"Cómo llegar",
    "map.area.med":"Medellín · centro operativo",
    "net.hub":"Conoce una por una a las fundaciones que forman la red",
    "nav.g.nosotros":"Nosotros","nav.cta":"Donar",
    "ficha.back":"Volver al Hub",
    "ficha.lider":"Dirige",
    "ficha.prog.t":"Programas en marcha",
    "ficha.imp.t":"Tu aporte aquí, en concreto",
    "ficha.imp.calc":"Con {a} aquí logras aproximadamente {x}.",
    "ficha.imp.min":"Elige un monto para ver el impacto equivalente.",
    "ficha.hub.t":"Cómo la fortalece el Hub",
    "ficha.web":"Ver sitio web",
    "ficha.cta.t":"Dona con destino a esta fundación.",
    "ficha.cta.p":"Puedes dirigir tu aporte a esta fundación al donar, con trazabilidad completa de principio a fin.",
    "ficha.cta.btn":"Donar ahora",
    "hero.impact":"{a} al mes se convierten en {x} — con acta y foto.",
    "map.area.ndf":"Manrique · La Honda, Medellín",
    "transp.funds.ey":"A dónde va tu aporte",
    "transp.funds.t":"Tu aporte, con destino claro.",
    "transp.funds.p":"Somos una fundación joven y transparente: hoy buena parte del apoyo llega en especie (Ruta 2), y el destino de cada aporte se respalda con actas, fotos y reportes. Estos son nuestros principios y nuestro compromiso.",
    "transp.funds.model.t":"Fondo común, con opción de dirigir",
    "transp.funds.model.p":"Por defecto tu aporte va a un fondo común que asignamos a la necesidad más urgente. Si lo prefieres, puedes dirigirlo a una fundación o ruta específica.",
    "transp.funds.commit.t":"Nuestro compromiso",
    "transp.funds.a":"La mayor parte de cada aporte va directo a la misión: fundaciones, comunidades y logística de entrega.",
    "transp.funds.b":"Una parte acotada sostiene la operación del Hub: bodega, transporte, verificación y trazabilidad.",
    "transp.funds.c":"La administración se mantiene al mínimo indispensable.",
    "transp.funds.note":"Estamos definiendo el marco exacto de asignación —qué proporción va a la misión, a la operación y a la administración— junto con nuestra Revisora Fiscal y el consejo. Publicaremos las cifras precisas solo cuando estén validadas: evidencia, no promesas.",
    "pay.how.ey":"Pago seguro",
    "pay.how.t":"Cómo pagar tu membresía, paso a paso.",
    "pay.how.p":"Tu seguridad primero. Así funciona el pago en línea hoy, y así funcionará el débito automático cuando lo habilitemos.",
    "pay.how.s1.t":"Elige tu nivel y monto",
    "pay.how.s1.p":"Usa la calculadora para ver tu aporte, tu beneficio tributario y tu nivel. Puedes elegir mensual, anual o único.",
    "pay.how.s2.t":"Paga por un canal seguro",
    "pay.how.s2.p":"Hoy: pagas en línea con tarjeta o con el Botón Bancolombia a través de Wompi, la pasarela de Bancolombia, y vuelves con tu número de guía. También puedes transferir y enviar el comprobante. El débito automático para membresías llega después.",
    "pay.how.s3.t":"Recibe tu recibo, y después tu certificado",
    "pay.how.s3.p":"El recibo con tu número de guía te llega apenas se confirma el pago, automático. El certificado de donación (Art. 257 ET) es distinto: lo revisamos y lo firman el Representante Legal y la Revisora Fiscal, así que no es inmediato.",
    "pay.how.sec.t":"Consejos de seguridad",
    "pay.how.sec.p":"Nunca compartas tus claves con nadie y verifica que la página tenga candado (https). Give&Grow no pide contraseñas por WhatsApp ni correo. Puedes pausar o cancelar tu débito cuando quieras.",
    "faq.a6":"El HUB SOCIAL no es solo un canal para donar: es un centro operativo con cinco rutas que conectan alianzas, donaciones e impacto medible. Tres cosas nos diferencian. Primero, trazabilidad real: tu aporte tiene número de guía, recibo automático, certificado de donación firmado y acta de entrega con fotos que puedes ver en el rastreo. Segundo, evidencia, no promesas: somos una fundación joven y transparente que muestra lo que puede probar, sin cifras infladas, y trabajamos con fundaciones aliadas verificadas en territorio. Tercero, reciprocidad: quien da también crece — los miembros acceden a los beneficios del Programa de Gratitud y las empresas ganan visibilidad como negocios con propósito. Es lo que resume nuestro lema: «Dar para crecer, crecer para dar más».",
    "foot.tagline":"Dar para crecer, crecer para dar más.",
    "foot.explore":"Explorar",
    "foot.legal":"Entidad",
    "foot.privacy":"Privacidad y datos",
    "foot.rights":"Todos los derechos reservados.",
    "priv.ey":"Legal",
    "priv.t":"Política de Privacidad y Tratamiento de Datos",
    "priv.lead":"Cómo protegemos y tratamos tus datos personales, conforme a la Ley 1581 de 2012 y el GDPR — y cómo puedes ejercer tus derechos.",
    "ally.a.datos.link":"Ver Política de Privacidad",
    "emp.cta.t":"Hablemos de tu alianza",
    "emp.cta.p":"Diseñamos el aporte a la medida de tu empresa, con beneficio tributario y reportes verificables. Cuéntanos tu objetivo y construimos la ruta juntos.",
    "emp.cta.btn":"Quiero conversar",
    "alma.chip1":"¿Cómo dono?",
    "alma.c.donar1":"¿Qué métodos de pago hay?",
    "alma.c.track":"¿Cómo rastreo mi donación?",
    "alma.c.membresia":"¿Qué membresías hay?",
    "alma.c.padrinazgo":"¿Qué es el Padrinazgo de Impacto?",
    "alma.c.rse":"Opciones de RSE para mi empresa",
    "alma.c.gratitud":"¿Qué es el Programa de Gratitud?",
    "alma.c.hub1":"¿Cómo funciona el HUB?",
    "alma.c.rutas":"¿Cuáles son las 5 rutas?",
    "alma.c.evidencia":"¿Cómo garantizan la trazabilidad?",
    "alma.chip2":"Beneficio tributario",
    "alma.chip3":"¿Cómo puede ayudar mi empresa?",
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
    "nav.membres":"Membresías",
    "membres.ey":"Membresías",
    "membres.t":"Crece con cada aporte.",
    "membres.lead":"Hacerte miembro es donar de forma recurrente y crecer con la fundación. Cada nivel suma beneficios a los del anterior, con montos sugeridos y la opción de dar otro valor.",
    "membres.tiers.ey":"Tu recorrido",
    "membres.tiers.t":"De semilla a bosque.",
    "membres.t1.t":"Semilla",
    "membres.t1.p":"El primer paso: empiezas a sembrar impacto cada mes.",
    "membres.t2.t":"Retoño",
    "membres.t2.p":"Tu aporte crece y sostiene programas con más alcance.",
    "membres.t3.t":"Árbol",
    "membres.t3.p":"Un compromiso firme que sostiene proyectos completos.",
    "membres.t4.t":"Bosque",
    "membres.t4.p":"El nivel más alto: tu generosidad multiplica toda la red.",
    "membres.t1.price":"$20.000","membres.t1.priceu":"/ mes · ≈US$5",
    "membres.t1.b1":"Boletín de impacto con historias reales",
    "membres.t1.b2":"Certificado tributario (Art. 257 ET)",
    "membres.t1.b3":"Reconocimiento en web y redes",
    "membres.t2.price":"$50.000","membres.t2.priceu":"/ mes · ≈US$15","membres.t2.more":"Todo lo de Semilla, y además:",
    "membres.t2.b1":"Acceso al Programa de Gratitud",
    "membres.t2.b2":"Certificado de agradecimiento personalizado",
    "membres.t2.b3":"Contenido especial de voluntariado e impacto",
    "membres.t3.price":"$120.000","membres.t3.priceu":"/ mes · ≈US$35","membres.t3.more":"Todo lo de Retoño, y además:",
    "membres.t3.b1":"Invitación a eventos y sesiones en vivo",
    "membres.t3.b2":"Acceso prioritario a Impact Journey",
    "membres.t3.b3":"Certificado de impacto personalizado",
    "membres.t4.price":"$250.000+","membres.t4.priceu":"/ mes · ≈US$75+","membres.t4.more":"Todo lo de Árbol, y además:",
    "membres.t4.b1":"Reportes de impacto detallados",
    "membres.t4.b2":"Reunión con el equipo directivo",
    "membres.t4.b3":"Membresía honorífica y liderazgo en la comunidad",
    "membres.cancel":"Puedes pausar o cancelar tu membresía cuando quieras escribiendo a contabilidad@thegiveandgrowproject.org o desde tu pasarela de pago. Aplica al siguiente ciclo, sin penalidades; el certificado tributario cubre lo donado hasta la fecha.",
    "membres.extra.ey":"Otras formas",
    "membres.extra.t":"No todo es mensual.",
    "membres.temp.t":"Temporal",
    "membres.temp.p":"Una donación única, sin compromiso recurrente. Igual recibes tu certificado y el beneficio tributario.",
    "membres.honor.t":"Honor",
    "membres.honor.p":"Un reconocimiento por invitación, para aliados y personas que dejan una huella excepcional en el ecosistema.",
    "membres.ben.ey":"Lo que recibes",
    "membres.ben.t":"Beneficios que crecen contigo.",
    "membres.ben.1.t":"Programa de Gratitud",
    "membres.ben.1.p":"Beneficios que empresas aliadas ofrecen de forma voluntaria, en gratitud por el impacto. Disponible desde el nivel Retoño; estamos sumando aliados.",
    "membres.ben.2.t":"Certificado y carnet",
    "membres.ben.2.p":"Tu certificado de donación para el beneficio tributario y tu carnet digital de miembro, que se renueva con cada aporte.",
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
    "emp.grat.btn2":"Ver comercios aliados",
    "grat.you.ey":"Para todos",
    "grat.you.t":"Dos caras de la misma gratitud.",
    "grat.you.mem.t":"Si eres miembro",
    "grat.you.mem.p":"Con tu carnet digital accedes a beneficios en comercios aliados, desde el nivel Retoño.",
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
    "grat.s2.t":"Recibe tu carnet",
    "grat.s2.p":"Te llega tu carnet digital: una página que dice si tu membresía está vigente en el momento en que se abre.",
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
    "imp.pr3.p":"Cada entrega queda documentada con su acta firmada y sus fotos, y aparece en el rastreo de quien aportó a ese destino.",
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
    "brig.ev.ey":"Evidencia",
    "brig.ev.t":"Cada entrega, con su acta.",
    "brig.ev.p":"El documento que vale es el acta en papel que firma quien recibe. Aquí publicamos su foto y lo que dice. Si no quedó documentado, para nosotros no ocurrió.",
    "brig.ev.vacio":"Todavía no hay entregas publicadas. La brigada no ha salido: cuando lo haga, cada jornada aparece aquí con su acta firmada y sus fotos, no antes.",
    "brig.ev.familias":"familias",
    "brig.ev.con":"Con",
    "brig.ev.recibio":"Recibió",
    "ev.error":"No pudimos cargar las entregas en este momento.",
    "track.fuente.sitio":"Donación hecha por el sitio",
    "track.fuente.libro":"Registro del libro de donaciones",
    "track.ev.vacio":"Todavía no hay entregas publicadas para este destino. Cuando la haya, aparece aquí con su acta firmada.",
    "track.rp.t":"Estamos verificando tu transferencia",
    "track.rp.p":"Recibimos el reporte de la guía {guia}. Contrastamos cada transferencia contra el extracto del banco antes de registrarla como recibida — apenas lo hagamos, tu recibo te llega automáticamente y esta página cambia sola.",
    "track.sc.t":"Esa guía existe, pero su pago no está confirmado",
    "track.sc.p":"Generamos la guía {guia} cuando empezaste el pago, y la pasarela no nos confirmó que se completara. Si crees que sí pagaste, escríbenos con el comprobante a contabilidad@thegiveandgrowproject.org y lo revisamos.",
    "track.ev.t":"Entregas de tu destino",
    "track.ev.p":"Tu aporte se suma al fondo de este destino. Estas son las entregas que ese fondo hizo posibles — no te atribuimos una en particular, porque el dinero se reúne y las jornadas se pagan entre varios aportes.",
    "brig.ey":"Brigada de atención a emergencia",
    "brig.t":"Terremoto del 10 de agosto. Cinco territorios, del 24 al 28.",
    "brig.lead":"Un sismo de magnitud 7,4 con epicentro en el Chocó golpeó el occidente del país. Del 24 al 28 de agosto entregamos en cinco territorios, junto a las fundaciones que ya trabajan en cada uno. Hasta el 24 necesitamos cuatro cosas: dinero, insumos, manos y contactos.",
    "brig.est.rango":"Del 24 al 28 de agosto de 2026",
    "brig.est.antes":"Faltan {n} días.",
    "brig.est.antes1":"Falta 1 día.",
    "brig.est.hoy":"Empieza hoy.",
    "brig.est.curso":"En curso: día {n} de cinco.",
    "brig.est.despues":"Las cinco jornadas terminaron.",
    "brig.est.p":"Todo lo que llegue antes del 24 viaja con la brigada. Lo que llegue después va a la siguiente jornada — no se devuelve y no se pierde.",
    "brig.est.p.despues":"Cada entrega se publica aquí con su acta firmada. Lo que llegue ahora va a la siguiente jornada.",
    "brig.nec4.cap":"Qué necesitamos, en concreto",
    "brig.n1.t":"Dinero",
    "brig.n1.d":"Transferencia a la cuenta de la Fundación, o en línea con número de guía para seguir tu aporte hasta el acta.",
    "brig.n2.t":"Insumos",
    "brig.n2.d":"Escríbenos antes de comprar: te decimos qué falta hoy y en qué presentación sirve.",
    "brig.n3.t":"Manos",
    "brig.n3.d":"En Medellín, recibiendo, clasificando y empacando lo que llega al acopio.",
    "brig.n4.t":"Contactos",
    "brig.n4.d":"Una bodega, un camión que suba a la zona cafetera, una empresa que preste su sede.",
    "brig.hechos.cap":"El sismo",
    "brig.h1.k":"Magnitud",
    "brig.h1.v":"7,4",
    "brig.h2.k":"Fecha y hora",
    "brig.h2.v":"10 de agosto de 2026, 7:34 a. m.",
    "brig.h3.k":"Epicentro",
    "brig.h3.v":"San José del Palmar, Chocó",
    "brig.h4.k":"Profundidad",
    "brig.h4.v":"103 km",
    "brig.h5.k":"Fuente",
    "brig.h5.v":"Servicio Geológico Colombiano",
    "brig.h6.k":"Estado",
    "brig.h6.v":"Desastre nacional declarado",
    "brig.hechos.nota":"Las cifras de víctimas y damnificados cambian hora a hora y las publica la UNGRD. No las repetimos aquí: sería publicar un número que mañana es falso.",
    "brig.plan.ey":"Qué vamos a hacer",
    "brig.plan.t":"Siete personas, cinco sectores, más de cien familias en cada uno.",
    "brig.plan.p":"La recolección se hace en centros de acopio de empresas y amigos. De ahí sale la carga con el equipo, por carretera, el 24 de agosto.",
    "brig.sec.cap":"Los cinco sectores",
    "brig.sec.meta":"Más de 100 familias",
    "brig.sec.zona":"zona por confirmar",
    "brig.sec.nota":"Las zonas exactas y los puntos de entrega se fijan con el Consejo Municipal de Gestión del Riesgo de cada ciudad y con la fundación aliada del territorio. Las cantidades están calculadas para 100 familias por sector y se ajustan contra el listado oficial de necesidades antes de comprar.",
    "brig.hub.ey":"Cómo entregamos",
    "brig.hub.t":"No llegamos a repartir por nuestra cuenta.",
    "brig.hub.p":"Entregamos junto a fundaciones que ya trabajan en cada territorio y que conocen a las familias: ellas ponen el criterio y la relación, nosotros la logística, los insumos y el registro. Es la misma modalidad HUB con la que operamos todo el año, aplicada a una emergencia.",
    "brig.nec.ey":"Qué se necesita",
    "brig.nec.t":"La lista es pública.",
    "brig.nec.p":"El inventario completo tiene más de cien ítems en trece categorías, veinticuatro de ellos críticos. Esto es lo que agrupan, y por qué.",
    "brig.c1.t":"Agua segura",
    "brig.c1.r":"Sin tapa, el agua se recontamina en horas.",
    "brig.c1.d":"Pastillas potabilizadoras, baldes herméticos, filtros por gravedad y manejo de residuos.",
    "brig.c2.t":"Comida que no necesita cocina",
    "brig.c2.r":"El abre fácil es obligatorio: en emergencia no hay abrelatas.",
    "brig.c2.d":"Enlatados de proteína, granos listos, sales de rehidratación oral y menaje desechable.",
    "brig.c3.t":"Higiene y dignidad",
    "brig.c3.r":"Hay necesidades íntimas que nadie pide en voz alta.",
    "brig.c3.d":"Jabón, papel higiénico, kits completos de higiene menstrual y ropa interior nueva.",
    "brig.c4.t":"Pañales, de bebé y de adulto",
    "brig.c4.r":"Se olvida siempre, y su ausencia humilla.",
    "brig.c4.d":"Primera infancia y adulto mayor: pañales por talla, pañitos y crema antipañalitis.",
    "brig.c5.t":"Dormir sin piso frío",
    "brig.c5.r":"Dormir en el piso de un coliseo es la queja número uno.",
    "brig.c5.d":"Colchonetas aislantes, cobijas de clima de montaña, lonas impermeables y ponchos.",
    "brig.c6.t":"Luz y carga de celular",
    "brig.c6.r":"Hablar con la familia no es lujo: es necesidad humanitaria.",
    "brig.c6.d":"Lámparas solares, linternas, pilas y multitomas que vuelven un enchufe un punto de carga comunitario.",
    "brig.c7.t":"Lo que sostiene a la brigada",
    "brig.c7.r":"La brigada nunca consume lo que es de las familias.",
    "brig.c7.d":"Casco, botas, mascarillas certificadas, carné institucional y las actas de entrega.",
    "brig.dar.ey":"Cómo aportar",
    "brig.dar.t":"En dinero o en especie. Las dos cuentan.",
    "brig.dar.dinero.k":"En dinero · transferencia",
    "brig.dar.dinero.v":"Bancolombia · Ahorros 31000009221",
    "brig.dar.dinero.p":"Fundación Give&Grow International, NIT 901.948.930-2. Envía el comprobante a contabilidad@thegiveandgrowproject.org y te confirmamos.",
    "brig.dar.linea.k":"En dinero · en línea",
    "brig.dar.linea.p":"Tarjeta o botón Bancolombia. Vuelves con un número de guía para seguir tu aporte hasta la evidencia de entrega.",
    "brig.dar.linea.btn":"Aportar a la brigada",
    "brig.dar.qr.k":"En dinero · pago directo (QR de la campaña)",
    "brig.dar.qr.v":"checkout.wompi.co/l/c5Ym2E",
    "brig.dar.qr.p":"El enlace y el QR impreso de la brigada llevan a la misma cuenta, en la misma pasarela. Es más directo, pero no genera número de guía: no vas a poder rastrear tu aporte, y si necesitas certificado tributario tienes que escribirnos con el comprobante. Si estás aquí, el botón de arriba te deja mejor acompañado.",
    "brig.dar.especie.k":"En especie · centros de acopio",
    "brig.dar.especie.v":"WhatsApp 315 330 5028",
    "brig.dar.especie.p":"Escríbenos antes de comprar: te decimos qué falta hoy, en qué presentación sirve y a qué centro de acopio llevarlo. Comprar sin coordinar suele terminar en insumos que no se pueden entregar.",
    "brig.dar.especie.gg":"Give&Grow · Medellín",
    "brig.dar.especie.nat":"Nativos · aliado principal",
    "brig.dar.especie.v2":"WhatsApp 312 302 3790",
    "brig.dar.cert.t":"Certificado de donación",
    "brig.dar.cert.p":"Somos una entidad sin ánimo de lucro vigente en el Régimen Tributario Especial. Tu donación da derecho a un descuento del 25% del valor donado sobre el impuesto de renta (Art. 257 del Estatuto Tributario), sujeto al límite del Art. 258. Su procedencia depende de tu situación tributaria: consúltalo con tu asesor. Lo expedimos firmado por el Representante Legal y la Revisora Fiscal.",
    "of.t":"O déjanos los datos y te escribimos",
    "of.p":"Si prefieres no escribir por WhatsApp. Lo importante es lo mismo: cuéntanos antes de comprar.",
    "of.cat":"¿De qué categoría?",
    "of.cat.agua":"Agua segura",
    "of.cat.alimento":"Comida que no necesita cocina",
    "of.cat.higiene":"Higiene y dignidad",
    "of.cat.panales":"Pañales, de bebé y de adulto",
    "of.cat.descanso":"Dormir sin piso frío",
    "of.cat.energia":"Luz y carga de celular",
    "of.cat.brigada":"Lo que sostiene a la brigada",
    "of.cat.otra":"Otra cosa",
    "of.detalle":"¿Qué exactamente?",
    "of.detalle.ph":"Colchonetas de espuma, atún en lata con abre fácil, pañales talla M…",
    "of.cantidad":"¿Cuánto? (opcional)",
    "of.cantidad.ph":"50 unidades, 3 cajas, un bulto…",
    "of.disponible":"¿Cuándo y cómo lo entregas? (opcional)",
    "of.disponible.ph":"Esta semana, puedo llevarlo al acopio; o necesito que lo recojan.",
    "of.quien":"Aportas como",
    "of.quien.persona":"Persona",
    "of.quien.empresa":"Empresa",
    "of.nombre":"Nombre o razón social",
    "of.email":"Correo",
    "of.tel":"Teléfono o WhatsApp (opcional)",
    "of.ciudad":"Ciudad (opcional)",
    "of.datos":"Autorizo el tratamiento de mis datos para coordinar este aporte, conforme a la Política de Privacidad.",
    "of.btn":"Enviar el ofrecimiento",
    "of.sending":"Enviando…",
    "of.ok":"Recibido. Te escribimos para confirmarte qué falta hoy — no compres nada todavía.",
    "of.err":"No pudimos enviarlo. Intenta de nuevo o escríbenos por WhatsApp.",
    "of.err.nombre":"Falta tu nombre.",
    "of.err.email":"Ese correo no parece válido.",
    "of.err.cat":"Elige una categoría.",
    "of.err.detalle":"Cuéntanos qué ofreces.",
    "of.err.datos":"Necesitamos tu autorización para tratar los datos.",
    "brig.no.ey":"Reglas de la brigada",
    "brig.no.t":"Lo que no vamos a hacer.",
    "brig.no1.t":"No entramos sin coordinación.",
    "brig.no1.d":"Nada se despliega sin el aval del Consejo Municipal de Gestión del Riesgo y de la fundación del territorio.",
    "brig.no2.t":"La brigada no consume lo de las familias.",
    "brig.no2.d":"Su alimentación, alojamiento y equipo se presupuestan aparte y se reportan aparte.",
    "brig.no3.t":"No prometemos cifras que no tenemos.",
    "brig.no3.d":"El inventario está en cotización. Cuando haya costos verificados, se publican.",
    "brig.mc.ey":"Sumarse",
    "brig.mc.t":"También hacen falta manos y contactos.",
    "brig.mc.p":"No todo se resuelve con plata. Dos cosas que necesitamos y que casi nadie ofrece, porque casi nadie las pide.",
    "brig.mc.manos.t":"Manos en la estructura",
    "brig.mc.manos.p":"El equipo que viaja ya está cerrado en siete personas: ir a terreno exige doble verificación —la nuestra y la de la fundación del territorio— y una sesión de Marco, y eso no cabe en los días que quedan. Lo que sí necesitamos es gente en Medellín para recibir, clasificar y empacar lo que llega al acopio. En el formulario, elige «Con Give&Grow — en la estructura».",
    "brig.mc.manos.btn":"Ofrecer mi tiempo",
    "brig.mc.cont.t":"Contactos que abren puertas",
    "brig.mc.cont.p":"Lo más útil que puedes mandarnos si no vas a donar, y es gratis: una bodega o parqueadero en Medellín donde clasificar; un camión o furgón que suba a Cali, Pereira, Manizales, Armenia o Chocó entre el 24 y el 28; una empresa que preste su sede como centro de acopio; o una fundación que ya trabaje en alguno de los cinco territorios.",
    "brig.mc.cont.btn":"Escribir por WhatsApp",
    "brig.cierre":"Sin acta firmada, para nosotros no ocurrió.",
    "brig.aviso.strong":"Terremoto del 10 de agosto",
    "brig.aviso.txt":"Brigada del 24 al 28 de agosto en cinco territorios. Qué necesitamos",
    "calc.brigada.unico":"Aporte único: la brigada es una operación puntual, no una membresía.",
    "calc.brigada.nota":"Todavía no publicamos equivalencias en pesos para esta campaña: el inventario está en cotización. Tu aporte compra insumos de la lista pública, y cada entrega queda con acta firmada.",
    "calc.dest.emergencia":"Emergencia abierta",
    "brigada.opcion":"Brigada de atención a emergencia · 5 sectores",
    "calc.dest.lbl":"¿A dónde va tu aporte?",
    "calc.note.lbl":"Deja un mensaje o dedicatoria (opcional)",
    "calc.note.ph":"Tu mensaje viajará con tu donación y aparecerá en tu recibo.",
    "calc.impact":"Tu impacto",
    "calc.impact.note":"Equivalencia aproximada, según datos de las fundaciones del Hub.",
    "origen.imgalt":"El fundador con la comunidad de niños y niñas en una jornada en La Guajira",
    "origen.tl.ey":"El recorrido",
    "origen.tl.t":"De caminar el territorio a fundar una red.",
    "origen.ms1.t":"Años en terreno",
    "origen.ms1.p":"Casi cuatro años de trabajo de campo en La Guajira, la Sierra Nevada y las comunas de Medellín, donde la confianza se gana caminando.",
    "origen.ms2.t":"Abril 2025 · Nace Give&Grow",
    "origen.ms2.p":"La experiencia se formaliza: se constituye como Entidad Sin Ánimo de Lucro en Medellín.",
    "origen.ms3.t":"19 mayo 2025 · Registro en Cámara",
    "origen.ms3.p":"Queda inscrita ante la Cámara de Comercio de Medellín, bajo el Régimen Tributario Especial. En 2025 arranca el primer período operativo.",
    "origen.ms4.t":"2026 · Primera aliada e Impact Journey",
    "origen.ms4.p":"Sumamos la primera fundación aliada al Muro de Héroes y activamos Impact Journey, mientras construimos ImpactOS para dar trazabilidad al impacto.",
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
    "ndf.chip.sector":"Niñez y adolescencia",
    "ndf.chip.loc":"Medellín · Manrique, La Honda",
    "ndf.chip.since":"Desde 2020",
    "ndf.desc":"Brinda bienestar y educación a niños y jóvenes de las comunidades más vulnerables de Medellín. Proyecto en proceso de constitución.",
    "ndf.prog1":"Chefs del Futuro · ~100 niños/día",
    "ndf.prog2":"Borboletas · 30 niños · 3×/sem",
    "ndf.web":"ninosdelfuturo.com →",
    "ndf.ig":"@ninosdelfuturo →",
    "ndf.logo.alt":"Logo de Fundación Niños del Futuro",
    "ficha.gal.t":"Galería",
    "ficha.gal.empty":"Galería en preparación: publicaremos fotografías reales del trabajo en campo, con autorización expresa de la fundación.",
    "ficha.gal.open":"Ampliar fotografía",
    "ficha.gal.close":"Cerrar",
    "ficha.gal.prev":"Fotografía anterior",
    "ficha.gal.next":"Fotografía siguiente",
    "ficha.share":"Compartir ficha",
    "ficha.share.copied":"Enlace copiado",
  }
};

var lang = "es";
function t(k){ return (I18N[lang] && I18N[lang][k]) || (I18N.es[k]) || k; }

var currentRoute = "inicio";
var ROUTE_META = {
  inicio:{t:{es:"Give&Grow International — Dar para crecer, crecer para dar más",en:"Give&Grow International — Give to grow, grow to give more"},d:{es:"Conectamos generosidad con necesidad en Colombia, con trazabilidad completa. Fundación sin ánimo de lucro en Medellín.",en:"We connect generosity with need in Colombia, with full traceability. A nonprofit foundation based in Medellín."}},
  e404:{t:{es:"Página no encontrada · Give&Grow International",en:"Page not found · Give&Grow International"},d:{es:"El enlace que seguiste no lleva a ningún lugar de nuestro ecosistema.",en:"The link you followed doesn't lead anywhere in our ecosystem."}},
  origen:{t:{es:"Nuestro origen · Give&Grow International",en:"Our origin · Give&Grow International"},d:{es:"Cómo nació Give&Grow: del trabajo de campo en La Guajira, la Sierra Nevada y las comunas de Medellín a una fundación con propósito.",en:"How Give&Grow began: from field work in La Guajira, the Sierra Nevada and Medellín's comunas to a foundation with purpose."}},
  hub:{t:{es:"HUB SOCIAL · Give&Grow International",en:"Social Hub · Give&Grow International"},d:{es:"El centro operativo donde se encuentran alianzas, donaciones e impacto. En Medellín.",en:"The operations center where alliances, donations and impact meet. In Medellín."}},
  empresas:{t:{es:"Empresas y RSE · Give&Grow International",en:"Companies & CSR · Give&Grow International"},d:{es:"Convierte la responsabilidad social de tu empresa en impacto medible y trazable, con beneficios tributarios.",en:"Turn your company's social responsibility into measurable, traceable impact, with tax benefits."}},
  fundaciones:{t:{es:"Para fundaciones · Give&Grow International",en:"For foundations · Give&Grow International"},d:{es:"Suma tu fundación al HUB SOCIAL: recibe herramientas y donaciones de forma gratuita, transparente y trazable.",en:"Bring your foundation to the Social Hub: receive tools and donations for free, transparently and traceably."}},
  gratitud:{t:{es:"Programa de Gratitud · Give&Grow International",en:"Gratitude Program · Give&Grow International"},d:{es:"Beneficios y reconocimientos para quienes hacen posible el impacto: donantes, aliados y empresas.",en:"Benefits and recognition for those who make impact possible: donors, allies and companies."}},
  impacto:{t:{es:"Impacto y evidencia · Give&Grow International",en:"Impact & evidence · Give&Grow International"},d:{es:"Evidencia real del trabajo en terreno: fotografías, trazabilidad y resultados de las comunidades que acompañamos.",en:"Real evidence from the field: photos, traceability and results from the communities we support."}},
  impactos:{t:{es:"ImpactOS · Give&Grow International",en:"ImpactOS · Give&Grow International"},d:{es:"Qué es ImpactOS, la plataforma del ecosistema Give&Grow, y qué módulo está operando hoy: el HUB SOCIAL.",en:"What ImpactOS is, the platform behind the Give&Grow ecosystem, and which module runs today: the HUB SOCIAL."}},
  brigada:{t:{es:"Brigada de atención a emergencia · Give&Grow International",en:"Emergency response brigade · Give&Grow International"},d:{es:"Terremoto del 10 de agosto de 2026. Brigada de Give&Grow a Cali, Pereira, Manizales, Armenia y Chocó: qué se necesita y cómo aportar, en dinero o en especie.",en:"The 10 August 2026 earthquake. Give&Grow's brigade to Cali, Pereira, Manizales, Armenia and Chocó: what is needed and how to give, in money or in kind."}},
  reportar:{t:{es:"Reportar una transferencia · Give&Grow International",en:"Report a transfer · Give&Grow International"},d:{es:"¿Ya transferiste a la cuenta de la Fundación? Repórtalo y recibe tu número de guía para seguir tu aporte.",en:"Already transferred to the Foundation's account? Report it and get your tracking number to follow your gift."}},
  donar:{t:{es:"Donar · Give&Grow International",en:"Donate · Give&Grow International"},d:{es:"Haz tu donación a Give&Grow con trazabilidad completa y beneficio tributario. Cada aporte transforma una vida.",en:"Donate to Give&Grow with full traceability and a tax benefit. Every gift transforms a life."}},
  medicion:{t:{es:"Cómo medimos · Give&Grow International",en:"How we measure · Give&Grow International"},d:{es:"Contribución y no atribución, los tres peldaños de la medición, cómo publicamos un número y el reporte de jornada para la empresa aliada.",en:"Contribution rather than attribution, the three rungs of measurement, how we publish a figure, and the journey report for partner companies."}},
  transparencia:{t:{es:"Transparencia · Give&Grow International",en:"Transparency · Give&Grow International"},d:{es:"Registro oficial, gobernanza, estados financieros y documentos públicos de Fundación Give&Grow International.",en:"Official registration, governance, financial statements and public documents of Give&Grow International."}},
  contacto:{t:{es:"Contacto · Give&Grow International",en:"Contact · Give&Grow International"},d:{es:"Escríbenos para donar, aliar tu empresa o sumar tu fundación al HUB SOCIAL. Medellín, Colombia.",en:"Reach out to donate, partner your company or join your foundation to the Social Hub. Medellín, Colombia."}},
  membresias:{t:{es:"Membresías · Give&Grow International",en:"Memberships · Give&Grow International"},d:{es:"Hazte miembro de Give&Grow: dona de forma recurrente, crece de Semilla a Bosque y suma beneficios en cada nivel.",en:"Become a Give&Grow member: give monthly, grow from Seed to Forest and add benefits at each tier."}},
  voluntariado:{t:{es:"Voluntariado e Impact Journey · Give&Grow International",en:"Volunteering & Impact Journey · Give&Grow International"},d:{es:"Tres maneras de participar, el método MIRA en doble vía y cómo cuidamos a las comunidades. Voluntariado corporativo y pro-bono.",en:"Three ways to take part, the two-way MIRA method, and how we care for communities. Corporate and pro-bono volunteering."}},
  faq:{t:{es:"Preguntas frecuentes · Give&Grow International",en:"FAQ · Give&Grow International"},d:{es:"Respuestas a las preguntas más comunes sobre donaciones, beneficios tributarios, alianzas y el modelo de Give&Grow.",en:"Answers to common questions about donations, tax benefits, partnerships and the Give&Grow model."}},
  privacidad:{t:{es:"Política de Privacidad y Tratamiento de Datos · Give&Grow International",en:"Privacy & Data Protection Policy · Give&Grow International"},d:{es:"Cómo Give&Grow protege y trata tus datos personales, conforme a la Ley 1581 de 2012 y el GDPR. Tus derechos y cómo ejercerlos.",en:"How Give&Grow protects and processes your personal data, under Colombia's Law 1581/2012 and the GDPR. Your rights and how to exercise them."}}
};
function setMetaTag(attr,key,val){ var el=document.querySelector("meta["+attr+"='"+key+"']"); if(el) el.setAttribute("content",val); }
var OG_IMG_DEFAULT = "https://www.thegiveandgrowproject.org/img/og.jpg";
function applyRouteMeta(id){
  if (id.indexOf("fundacion/")===0){
    var pid = id.split("/")[1];
    if (PARTNERS_DATA){
      for (var i=0;i<PARTNERS_DATA.length;i++){
        if (PARTNERS_DATA[i].id===pid){ applyFichaMeta(PARTNERS_DATA[i]); return; }
      }
    }
    return; /* renderFicha la aplica cuando cargan los datos */
  }
  var m = ROUTE_META[id] || ROUTE_META.inicio;
  var ti = m.t[lang]||m.t.es, de = m.d[lang]||m.d.es;
  document.title = ti;
  setMetaTag("name","description",de);
  setMetaTag("property","og:title",ti);
  setMetaTag("property","og:description",de);
  setMetaTag("property","og:url","https://www.thegiveandgrowproject.org/#"+id);
  setMetaTag("property","og:locale", lang==="en"?"en_US":"es_CO");
  setMetaTag("property","og:image", OG_IMG_DEFAULT);
  setMetaTag("name","twitter:image", OG_IMG_DEFAULT);
  setMetaTag("name","twitter:title",ti);
  setMetaTag("name","twitter:description",de);
  // la vista 404 del SPA se sirve con 200 (fallback SPA): no indexarla
  setMetaTag("name","robots", id==="e404" ? "noindex, follow" : "index, follow");
}
function applyFichaMeta(p){
  var pr = p.profile || {};
  var ti = p.name + " · Give&Grow International";
  var de = pr.about ? (pr.about[lang]||pr.about.es||"") : "";
  if (de.length > 155) de = de.slice(0,152).replace(/\s+\S*$/,"") + "…";
  var img = (p.logo && canShowLogo(p)) ? ("https://www.thegiveandgrowproject.org"+p.logo) : OG_IMG_DEFAULT;
  document.title = ti;
  setMetaTag("name","description",de);
  setMetaTag("property","og:title",ti);
  setMetaTag("property","og:description",de);
  setMetaTag("property","og:url","https://www.thegiveandgrowproject.org/f/"+p.id);
  setMetaTag("property","og:locale", lang==="en"?"en_US":"es_CO");
  setMetaTag("property","og:image", img);
  setMetaTag("name","twitter:image", img);
  setMetaTag("name","twitter:title",ti);
  setMetaTag("name","twitter:description",de);
  setMetaTag("name","robots","index, follow");
}
function shareFicha(pid){
  var url = "https://www.thegiveandgrowproject.org/f/"+pid;
  if (navigator.share){ navigator.share({url:url}).catch(function(){}); return false; }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){
      var b = document.getElementById("ficha-share");
      if (b){ var o = b.textContent; b.textContent = t("ficha.share.copied"); setTimeout(function(){ b.textContent = o; },1800); }
    });
  }
  return false;
}

/* "La red ya forma" (#hub): agrupa los programas con formativo:true de TODAS las
   aliadas. Siempre con el nombre de la fundación que lo ejecuta — el crédito es suyo;
   Give&Grow canaliza, documenta y da visibilidad, no dicta el programa. */
function renderFormacion(){
  var el = document.getElementById("formacion-grid"); if (!el) return;
  loadPartners().then(function(list){
    var html = "";
    for (var i=0;i<list.length;i++){
      var p = list[i]; if (p.type !== "foundation") continue;
      var progs = (p.profile && p.profile.programs) || [];
      for (var k=0;k<progs.length;k++){
        var g = progs[k]; if (g.formativo !== true) continue;
        var desc = (g.desc && (g.desc[lang]||g.desc.es)) || "";
        html += '<a class="card form-card" href="#fundacion/'+encodeURIComponent(p.id)+'">'
              + '<h3>'+escapeHtml(g.name)+'</h3>'
              + '<span class="form-fund">'+escapeHtml(p.name)+'</span>'
              + '<p>'+escapeHtml(desc)+'</p>'
              + '<span class="card-link">'+escapeHtml(t("hub.form.link"))+' <span aria-hidden="true">&rarr;</span></span></a>';
      }
    }
    el.innerHTML = html;
  });
}
/* Chips de poblaciones. Fuente única: hub.pob.list — se pintan en #hub y en
   #voluntariado (allí como portafolio de experiencias), así nunca divergen. */
function renderPobChips(){
  var items=(t("hub.pob.list")||"").split(" - ");
  var html = items.map(function(x){ return '<span class="eco-chip">'+x.trim().replace(/</g,"&lt;")+'</span>'; }).join("");
  ["hub-pob","vol-pob"].forEach(function(id){
    var el=document.getElementById(id); if(el) el.innerHTML = html;
  });
}
/* ============ Brigada: en qué momento estamos ============
   La página tiene que decir la verdad el 12 de agosto, el 26 y el 3 de
   septiembre, sin que nadie entre a editarla. Un «faltan 12 días» escrito a
   mano se vuelve mentira el día siguiente, y un contador que no contempla el
   después acabaría diciendo «faltan -6 días».

   Tres fases, y la del medio importa tanto como las otras: mientras la brigada
   está en terreno, la página debe decir que está en terreno.

   Colombia es UTC-5 todo el año —no hay horario de verano—, así que la fecha
   local se saca con una resta fija y no con la zona del navegador: si no, un
   donante en Madrid vería el cambio de día seis horas antes que la brigada. */
var BRIGADA_DESDE = "2026-08-24", BRIGADA_HASTA = "2026-08-28", BRIGADA_DIAS = 5;

function diaBogota(){
  return new Date(Date.now() - 5*3600*1000).toISOString().slice(0,10);
}
function brigadaFase(){
  var hoy = diaBogota();
  var dia = function(s){ return Date.parse(s + "T00:00:00Z"); };
  if (hoy < BRIGADA_DESDE){
    return { fase:"antes", n: Math.round((dia(BRIGADA_DESDE) - dia(hoy)) / 86400000) };
  }
  if (hoy > BRIGADA_HASTA) return { fase:"despues" };
  return { fase:"curso", n: Math.round((dia(hoy) - dia(BRIGADA_DESDE)) / 86400000) + 1 };
}
function pintarBrigadaEstado(){
  var cifra = document.getElementById("brig-cifra");
  var nota  = document.getElementById("brig-est-p");
  if (!cifra) return;
  var f = brigadaFase();
  var txt = f.fase === "despues" ? t("brig.est.despues")
          : f.fase === "curso"   ? t("brig.est.curso").replace("{n}", String(f.n))
          : f.n === 0            ? t("brig.est.hoy")
          : f.n === 1            ? t("brig.est.antes1")
          :                        t("brig.est.antes").replace("{n}", String(f.n));
  cifra.textContent = txt;
  /* El aviso de abajo cambia con la fase: antes promete que lo que llegue
     viaja; después ya no puede prometer eso. */
  if (nota) nota.textContent = f.fase === "despues" ? t("brig.est.p.despues") : t("brig.est.p");
}

/* La hoja imprime SU PROPIA fecha. Una copia de hace tres meses circulando como
   si fuera actual es el problema que esto evita: la fecha en el papel la delata
   sola. Se pone al entrar a Transparencia y otra vez justo antes de imprimir,
   porque una pestaña puede quedar abierta días. */
function pintarFechaImpresion(){
  var el = document.getElementById("transp-fecha");
  if (!el) return;
  var d = new Date();
  var meses = lang === "en"
    ? ["January","February","March","April","May","June","July","August","September","October","November","December"]
    : ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  el.textContent = lang === "en"
    ? meses[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear()
    : d.getDate() + " de " + meses[d.getMonth()] + " de " + d.getFullYear();
}
if (window.addEventListener) window.addEventListener("beforeprint", pintarFechaImpresion);

function postLang(l){
  applyLang(l); renderHeroImpact(); renderAliadas(); renderAportantes(); renderFormacion(); renderEmpresas(); renderPrivacy();
  /* Va DESPUÉS de applyLang: el repintado de data-i18n devuelve el rango
     estático a su sitio y hay que volver a poner la fase encima. */
  pintarBrigadaEstado();
  pintarFechaImpresion();
  try{ buildProjectSelect(); calcUpdate(); }catch(e){}
  if (currentRoute.indexOf("fundacion/")===0) renderFicha(currentRoute.split("/")[1]);
  if (currentRoute.indexOf("comercio/")===0) renderComercio(currentRoute.split("/")[1]);
  if (currentRoute==="gratitud") renderGratitudComercios();
  document.querySelectorAll(".faq-a").forEach(function(a){ if(a.parentElement.classList.contains("open")) a.style.maxHeight = a.scrollHeight + "px"; });
}
var I18N_LOADING = null;
function ensureLang(next){
  if (next !== "en" || I18N.en) return Promise.resolve();
  if (!I18N_LOADING){
    I18N_LOADING = fetch("/i18n/en.json")
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(j){ I18N.en = j; })
      .catch(function(){ I18N_LOADING = null; });
  }
  return I18N_LOADING;
}
function setLang(l){
  var next = (l === "en") ? "en" : "es";
  ensureLang(next).then(function(){
    if (next === "en" && !I18N.en) return;
    var vt = document.startViewTransition && window.matchMedia &&
             !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
             typeof lang !== "undefined" && lang && lang !== next;
    if (vt){
      try {
        var tr = document.startViewTransition(function(){ postLang(l); });
        // Si una transición previa sigue activa, esta la aborta y su promesa
        // rechaza con InvalidStateError: lo absorbemos (no es un fallo real).
        if (tr && tr.finished && tr.finished.catch) tr.finished.catch(function(){});
      } catch(e){ postLang(l); }
    }
    else { postLang(l); }
  });
}
function applyLang(l){
  lang = (l === "en") ? "en" : "es";
  document.documentElement.lang = lang;
  var nodes = document.querySelectorAll("[data-i18n]");
  for (var i=0;i<nodes.length;i++){
    var k = nodes[i].getAttribute("data-i18n");
    var val = t(k);
    if (nodes[i].hasAttribute("data-i18n-attr")){
      // admite varios atributos separados por coma (p.ej. "placeholder,aria-label")
      nodes[i].getAttribute("data-i18n-attr").split(",").forEach(function(a){
        a = a.trim(); if (a) nodes[i].setAttribute(a, val);
      });
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
function isSpaRoute(id){
  if (!id) return false;
  if (id.indexOf("fundacion/")===0 || id.indexOf("comercio/")===0) return true;
  return !!document.getElementById("page-"+id);
}
/* Despachador de acciones por delegación (CSP fase 2): reemplaza los on* inline.
   Atributos: data-act (click), data-input, data-change, data-submit, data-enter.
   Valor = "fn(args)" donde args admite 'literal', numero, this, this.value, event.
   Solo funciones de la whitelist ACT_FNS pueden invocarse (sin eval). */
function allyServ(){ setTimeout(allyToggleServ, 0); }
function allyGrat(){ setTimeout(allyToggleGrat, 0); }
function focusActivePage(){ var p=document.querySelector(".page.active"); if(p){ p.setAttribute("tabindex","-1"); p.focus(); } }
var ACT_FNS = {
  themeCycle:themeCycle, setLang:setLang, setCalcMode:setCalcMode, setCur:setCur, setFreq:setFreq,
  payMethod:payMethod, accTab:accTab, setQuick:setQuick, lbStep:lbStep, toggleFaq:toggleFaq,
  toggleDrop:toggleDrop, closeLightbox:closeLightbox, almaSend:almaSend, formSend:formSend,
  copyAccount:copyAccount, goComercios:goComercios, toggleDrawer:toggleDrawer, trackSearch:trackSearch,
  trackNoGuide:trackNoGuide, trackNoGuideSend:trackNoGuideSend, skipToContent:skipToContent,
  onSlider:onSlider, onManual:onManual, onNote:onNote, setProject:setProject, donarA:donarA,
  donarBrigada:donarBrigada, allySubmit:allySubmit,
  irAPagar:irAPagar, volSubmit:volSubmit, volNivel:volNivel, ofSubmit:ofSubmit, repSubmit:repSubmit,
  fundSubmit:fundSubmit, fundOtra:fundOtra, irAFormFund:irAFormFund,
  irAVoluntariadoBrigada:irAVoluntariadoBrigada,
  allyServ:allyServ, allyGrat:allyGrat, focusActivePage:focusActivePage,
  openLightbox:openLightbox, fichaImpCalc:fichaImpCalc, shareFicha:shareFicha, closeGalLb:closeGalLb,
  stepLightbox:stepLightbox, almaAsk:almaAsk, openComercioLb:openComercioLb, almaPanel:almaPanel
};
function runAct(spec, el, ev){
  var m = /^(\w+)\((.*)\)$/.exec((spec||"").trim());
  if (!m) return;
  var fn = ACT_FNS[m[1]];
  if (!fn) return;
  var raw = m[2].trim();
  var args = raw==="" ? [] : raw.split(",").map(function(a){
    a=a.trim();
    if (a==="this") return el;
    if (a==="this.value") return el.value;
    if (a==="this.textContent") return el.textContent;
    if (a==="event") return ev;
    // Sin esto, "false" llegaba como cadena — que es verdadera. Cualquier
    // data-act con un booleano hacía lo contrario de lo que decía.
    if (a==="true") return true;
    if (a==="false") return false;
    if (/^-?\d+$/.test(a)) return parseInt(a,10);
    return a.replace(/^['"]|['"]$/g,"");
  });
  return fn.apply(null, args);
}
// El 404 no se publica en el HTML: vive en <template id="tpl-e404"> y se monta la
// primera vez que una ruta inexistente lo necesita. Ver el comentario en index.html.
function ensureE404(){
  var el = document.getElementById("page-e404");
  if (el) return el;
  var tpl = document.getElementById("tpl-e404");
  if (!tpl || !tpl.content || !tpl.content.firstElementChild) return null;
  el = tpl.content.firstElementChild.cloneNode(true);
  document.body.insertBefore(el, tpl);
  // Hidratar al idioma vigente; a partir de aquí applyLang() ya lo alcanza solo.
  var ns = el.querySelectorAll("[data-i18n]");
  for (var i=0;i<ns.length;i++){
    var n = ns[i], v = t(n.getAttribute("data-i18n"));
    if (n.hasAttribute("data-i18n-attr")) n.getAttribute("data-i18n-attr").split(",").forEach(function(a){ a=a.trim(); if(a) n.setAttribute(a,v); });
    else n.textContent = v;
  }
  return el;
}
function go(id, fromPop){
  // #alma quedó como alias: ALMA ya no es una página sino un panel. Los enlaces
  // viejos aterrizan en #impactos y abren el panel, así ninguno queda roto.
  var abrirAlma = (id === "alma");
  if (abrirAlma) id = "impactos";
  var pages = document.querySelectorAll(".page");
  for (var i=0;i<pages.length;i++) pages[i].classList.remove("active");
  var target = document.getElementById("page-"+id);
  if (!target && id.indexOf("fundacion/")===0){
    target = document.getElementById("page-ficha");
    if (target) renderFicha(id.split("/")[1]);
  }
  if (!target && id.indexOf("comercio/")===0){
    target = document.getElementById("page-comercio");
    if (target) renderComercio(id.split("/")[1]);
  }
  if (!target){ id = "e404"; target = ensureE404(); }
  if (!target){ id = "inicio"; target = document.getElementById("page-inicio"); }
  target.classList.add("active");
  currentRoute = id;
  if (location.hash !== "#"+id) history[fromPop ? "replaceState" : "pushState"](null,"","#"+id);
  applyRouteMeta(id);
  renderJourney(id);
  if (id==="impacto") initGallery();
  if (id==="brigada"){ pintarEntregas("brig-entregas", BRIGADA_DESTINO, true); pintarBrigadaEstado(); }
  if (id==="transparencia") pintarFechaImpresion();

  window.scrollTo(0,0);
  if (!fromPop) focusActivePage();
  closeDrawer();
  initReveal();
  animateCounters();
  if (id==="inicio") updateLiveStats();
  if (id==="gratitud") renderGratitudComercios();
  if (abrirAlma) almaPanel(true);
  return false;
}

/* ---------- nav scroll + drawer ---------- */
function onScroll(){
  var n = document.getElementById("nav");
  if (!n) return;
  n.classList.toggle("sol", window.scrollY > 30);
}
function toggleDrawer(){ var d=document.getElementById("nav-mobile"); var open=d.classList.toggle("open"); document.body.classList.toggle("menu-open", open); var b=document.querySelector(".burger"); if(b) b.setAttribute("aria-expanded", open?"true":"false"); }
function toggleDrop(btn){
  var drop=btn.parentNode; var isOpen=drop.classList.contains("open");
  document.querySelectorAll(".ndrop.open").forEach(function(d){ d.classList.remove("open"); var t=d.querySelector(".ndrop-t"); if(t) t.setAttribute("aria-expanded","false"); });
  if(!isOpen){ drop.classList.add("open"); btn.setAttribute("aria-expanded","true"); }
  return false;
}
document.addEventListener("click", function(e){
  if(!e.target.closest(".ndrop")) document.querySelectorAll(".ndrop.open").forEach(function(d){ d.classList.remove("open"); var t=d.querySelector(".ndrop-t"); if(t) t.setAttribute("aria-expanded","false"); });
});
document.addEventListener("keydown", function(e){
  if(e.key==="Escape") document.querySelectorAll(".ndrop.open").forEach(function(d){ d.classList.remove("open"); var t=d.querySelector(".ndrop-t"); if(t) t.setAttribute("aria-expanded","false"); });
});
function closeDrawer(){ var d=document.getElementById("nav-mobile"); if(d) d.classList.remove("open"); document.body.classList.remove("menu-open"); var b=document.querySelector(".burger"); if(b) b.setAttribute("aria-expanded","false"); }

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
var calc = { cur:"COP", freq:"m", val:200000, mode:"ind", partnerId:"", projectId:"general", note:"" };
var USD_RATE = 4200;
var TIERS = [
  {min:0,  svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-7"/><path d="M12 14c-.6-3-3.2-4.6-6.3-4 .3 3 2.6 4.8 6.3 4z"/></svg>', es:"Semilla", en:"Seed"},
  {min:50000, svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 15c-.6-2.6-3-4-6-3.4.3 2.7 2.6 4.2 6 3.4z"/><path d="M12 13c.6-2.6 3-4 6-3.4-.3 2.7-2.6 4.2-6 3.4z"/></svg>', es:"Retoño",  en:"Sprout"},
  {min:120000, svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22v-6"/><circle cx="12" cy="9.5" r="6"/></svg>', es:"Árbol",   en:"Tree"},
  {min:250000, svg:'<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 22v-3M17 22v-3M12 22v-4"/><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><circle cx="12" cy="9" r="4.5"/></svg>', es:"Bosque",  en:"Forest"}
];
/* Equivalencias de impacto: se llenan con costos REALES de las fundaciones del Hub.
   Cada item: {es, esPl, en, enPl, cop} (singular/plural + costo COP de UNA unidad). Vacío = línea oculta.
   A futuro: con >1 unidad con costo defendible, añadir un selector de tipo de impacto (comida, resguardo, refugio, etc.). */
var IMPACT_UNITS = [
  { id:"ndf-plato", partner:"Fundación Niños del Futuro", cop:4000,
    es:"plato de comida", esPl:"platos de comida", en:"plate of food", enPl:"plates of food" }
  /* Futuro: { id:"x-kit", partner:"...", cop:NNNN, es:"kit escolar", esPl:"kits escolares", en:"school kit", enPl:"school kits" } */
];
function activeImpactUnit(){
  if (!IMPACT_UNITS.length) return null;
  // Si hay un proyecto elegido con unidad propia, esa manda.
  if (calc.projectId && calc.projectId !== "general"){
    for (var i=0;i<IMPACT_UNITS.length;i++){ if (IMPACT_UNITS[i].id===calc.projectId) return IMPACT_UNITS[i]; }
    /* Destino dirigido SIN costo propio: no hay equivalencia y no se presta la
       de otra fundación. Antes caía al primer ítem con costo, así que elegir la
       brigada mostraba «≈ 50 platos de comida» de Niños del Futuro: una cifra
       falsa sobre plata que va a comprar colchonetas y pañales. */
    return null;
  }
  // "Donde más se necesite" (fondo): usa la primera unidad como equivalencia de referencia.
  return IMPACT_UNITS[0];
}
function setImpactUnit(id){ calc.projectId = id; calcUpdate(); }

/* ---------- campaña abierta: Brigada de atención a emergencia ----------
   No es un proyecto de una fundación aliada, es una operación propia, así que no
   sale de partners.json y vive aquí, en un solo lugar.

   `destino` viaja en el campo `destino_id` del aporte, que hasta hoy solo
   guardaba ids de fundación. El prefijo `brigada-` reserva ese espacio de
   nombres para campañas propias y deja la consulta trivial:
   `WHERE destino_id LIKE 'brigada-%'`. Se prefirió esto a una columna nueva
   porque una migración más es otro despliegue que puede salir sin ella — y la
   emergencia fue ayer. */
var BRIGADA = {
  id: "brigada-emergencia",
  destino: "brigada-emergencia-2026-08"
};
function esBrigada(id){ return id === BRIGADA.id; }

/* Construye el selector fundación → proyecto a partir de partners.json.
   Cada <option> lleva el id de la unidad de impacto (o 'general' para el fondo). */
function buildProjectSelect(){
  var sel = document.getElementById("calc-project");
  if (!sel) return;
  var partners = (PARTNERS_DATA || PARTNERS_FALLBACK).filter(function(p){ return p.type==="foundation" && p.impactUnits && p.impactUnits.length; });
  /* La brigada va de primera y en su propio grupo: es lo urgente, y mezclarla
     entre los programas de las fundaciones la escondería. `general` sigue siendo
     el valor por defecto — más abajo se fija con sel.value. */
  var html = '<optgroup label="'+escapeHtml(t("calc.dest.emergencia"))+'">' +
             '<option value="'+BRIGADA.id+'" data-partner="">'+escapeHtml(t("brigada.opcion"))+'</option>' +
             '</optgroup>';
  html += '<option value="general" data-partner="">'+(lang==="en"?"Where it's needed most (general fund)":"Donde más se necesite (fondo general)")+'</option>';
  for (var i=0;i<partners.length;i++){
    var p = partners[i];
    html += '<optgroup label="'+escapeHtml(p.name)+'">';
    for (var k=0;k<p.impactUnits.length;k++){
      var u = p.impactUnits[k];
      var label = u.project ? u.project : (u[lang]||u.es);
      html += '<option value="'+escapeHtml(u.id)+'" data-partner="'+escapeHtml(p.id)+'">'+escapeHtml(label)+'</option>';
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  sel.value = calc.projectId || "general";
}
function setProject(unitId){
  calc.projectId = unitId;
  var sel = document.getElementById("calc-project");
  if (sel){ var opt = sel.options[sel.selectedIndex]; calc.partnerId = opt ? (opt.getAttribute("data-partner")||"") : ""; }
  /* setFreq ya llama a calcUpdate; llamarlo dos veces solo repinta de más. */
  if (esBrigada(unitId) && calc.freq !== "u"){ setFreq("u"); return; }
  calcUpdate();
}
/* CTA de la ficha: abre la calculadora con el proyecto de ESA fundación ya elegido,
   para que el donante no tenga que volver a buscarla en el selector. */
function donarA(unitId){
  go("donar");
  loadPartners().then(function(){
    try { buildProjectSelect(); } catch(e){}
    var sel = document.getElementById("calc-project");
    if (!sel || !unitId) return;
    sel.value = unitId;
    if (sel.value !== unitId) return;   // la unidad ya no existe: se queda en el fondo general
    setProject(unitId);
    var dest = document.querySelector("#page-donar .calc-dest");
    if (dest && dest.scrollIntoView) dest.scrollIntoView({block:"center"});
  });
}
/* Nombre legible del destino elegido, tal como debe leerse en el recibo y en el
   certificado. Sale del <option> visible, que ya está en el idioma correcto. */
function etiquetaDestino(){
  if (!calc.projectId || calc.projectId === "general") return null;
  var sel = document.getElementById("calc-project");
  if (sel){
    for (var i=0;i<sel.options.length;i++){
      if (sel.options[i].value === calc.projectId) return sel.options[i].text;
    }
  }
  return esBrigada(calc.projectId) ? t("brigada.opcion") : calc.projectId;
}

/* Abre la calculadora con la brigada ya elegida. Es el destino del enlace
   corto #brigada, que es lo que se comparte en redes y en WhatsApp. */
function donarBrigada(){
  go("donar");
  loadPartners().then(function(){
    try { buildProjectSelect(); } catch(e){}
    var sel = document.getElementById("calc-project");
    if (!sel) return;
    sel.value = BRIGADA.id;
    setProject(BRIGADA.id);
    var dest = document.querySelector("#page-donar .calc-dest");
    if (dest && dest.scrollIntoView) dest.scrollIntoView({block:"center"});
  });
}

function onNote(v){
  calc.note = String(v).slice(0,280);
  setText("calc-msg-count", calc.note.length);
}

/* Borrador de donación: reúne todo lo que el donante eligió en la calculadora.
   Es la fuente única que consumirán (a) el motor de recibos y (b) el registro
   en base de datos, el día que el gateway de pago quede confirmado y conectado.
   Modo: 'dirigida' si eligió un proyecto; 'fondo' si eligió "donde más se necesite". */
function buildDonationDraft(){
  var u = activeImpactUnit();
  var dirigida = !!(calc.projectId && calc.projectId !== "general");
  var monthlyCop = (calc.freq==="a") ? calc.val/12 : calc.val;
  return {
    montoCOP: calc.val,
    moneda: calc.cur,
    frecuencia: calc.freq,                 // m | a | u
    modo: dirigida ? "dirigida" : "fondo",
    partnerId: dirigida ? (calc.partnerId||"") : "",
    proyecto: dirigida ? (u && (u.project || u.es)) : "",
    unidadId: dirigida ? calc.projectId : "",
    nota: calc.note || "",
    beneficioTributarioCOP: Math.round(calc.val*0.25),
    nivel: (function(){ var tt=TIERS[0]; for(var i=0;i<TIERS.length;i++){ if(monthlyCop>=TIERS[i].min) tt=TIERS[i]; } return tt.es; })()
  };
}
/* Disponible para el futuro flujo de pago/recibo sin reescribir la captura. */
window.ggDonationDraft = buildDonationDraft;
/* ---------- pago en línea (Wompi) ----------
   El navegador NO firma nada: manda la intención al Worker, que asigna la guía,
   guarda el aporte, calcula la firma con el secreto de integridad y devuelve la
   URL. Aquí solo se navega. Por eso el secreto nunca sale del servidor y la CSP
   no necesita una sola excepción: una navegación no la gobierna `form-action`. */
function irAPagar(){
  var btn = document.getElementById("pay-go");
  var msg = document.getElementById("pay-msg");
  if (!btn || btn.disabled) return;

  var monto = Math.round(Number(calc.val) || 0);   // calc.val siempre está en COP
  if (!(monto >= 5000 && monto <= 20000000)){
    if (msg){ msg.style.display=""; msg.className="pay-now-msg err"; msg.textContent = t("pay.now.err"); }
    return;
  }

  btn.disabled = true;
  if (msg){ msg.style.display=""; msg.className="pay-now-msg"; msg.textContent = t("pay.now.wait"); }

  var frecMap = { m:"mensual", a:"anual", u:"unico" };
  /* La brigada es una donación DIRIGIDA aunque no tenga fundación detrás: sin
     esto caía en `fondo` y el aporte se habría contado como fondo general. */
  var brig = esBrigada(calc.projectId);
  var cuerpo = {
    monto: monto,
    frecuencia: frecMap[calc.freq] || "unico",
    modo: (brig || calc.partnerId) ? "dirigida" : "fondo",
    destino: brig ? BRIGADA.destino : (calc.partnerId || null),
    /* `proyecto` es DESCRIPTIVO: es lo que el donante lee en su recibo y lo que
       cita el certificado. Antes viajaba el id de la unidad, así que el recibo
       decía «ndf-plato» en vez del nombre del programa. */
    proyecto: etiquetaDestino(),
    nota: calc.note || null,
    idioma: (typeof lang !== "undefined" && lang === "en") ? "en" : "es"
  };

  fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo)
  }).then(function(r){ return r.ok ? r.json() : r.json().then(function(j){ throw new Error(j.error||"http_"+r.status); }); })
    .then(function(d){
      if (!d || !d.url) throw new Error("sin_url");
      /* La guía queda guardada por si el retorno llega sin identificador. */
      try { sessionStorage.setItem("gg_guia", d.guia); } catch(e){}
      window.location.href = d.url;
    })
    .catch(function(){
      btn.disabled = false;
      if (msg){ msg.style.display=""; msg.className="pay-now-msg err"; msg.textContent = t("pay.now.err"); }
    });
}

/* Aviso honesto cuando se elige mensual o anual: hoy se cobra una vez y la
   intención queda registrada. No prometemos un débito automático que no existe. */
function payRecNote(){
  var n = document.getElementById("pay-rec-note");
  if (!n) return;
  if (calc.freq === "u"){ n.style.display = "none"; n.textContent = ""; return; }
  var etiqueta = t(calc.freq === "a" ? "pay.now.rec.a" : "pay.now.rec.m");
  n.textContent = t("pay.now.rec").replace("{frec}", etiqueta);
  n.style.display = "";
}

/* ---------- retorno del checkout: /gracias ----------
   Wompi vuelve con SU id, no con nuestra guía. El Worker traduce uno en otra y
   devuelve NUESTRO estado, que es el que trae el webhook. */
var GRACIAS = { id:null, guia:null, intentos:0, timer:null };

function graciasArranca(){
  var q = new URLSearchParams(location.search);
  GRACIAS.id = q.get("id");
  try { GRACIAS.guia = sessionStorage.getItem("gg_guia"); } catch(e){}
  GRACIAS.intentos = 0;
  graciasConsulta();
}

function graciasConsulta(){
  var url = GRACIAS.id ? ("/api/gracias?id=" + encodeURIComponent(GRACIAS.id))
          : GRACIAS.guia ? ("/api/aporte/" + encodeURIComponent(GRACIAS.guia)) : null;
  if (!url){ graciasPerdida(); return; }

  fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if (!d){ graciasPerdida(); return; }
    graciasPinta(d);
    var cerrado = ["aprobada","rechazada","error","en_distribucion","entregada"].indexOf(d.estado) >= 0;
    GRACIAS.intentos++;
    /* Diez intentos cada 3 s ≈ 30 s. Pasado eso no se insiste: se le dice al
       donante qué hacer con su guía en vez de dejarlo mirando una rueda. */
    if (!cerrado && GRACIAS.intentos < 10){
      GRACIAS.timer = setTimeout(graciasConsulta, 3000);
    } else if (!cerrado){
      var nota = document.getElementById("gracias-nota");
      if (nota){ nota.style.display=""; nota.textContent = t("gracias.slow"); }
    }
  }).catch(function(){ graciasPerdida(); });
}

function graciasPinta(d){
  var led = document.getElementById("gracias-ledger");
  if (led) led.style.display = "";
  var set = function(id, txt){ var e=document.getElementById(id); if(e) e.textContent = txt; };

  set("gr-guia", d.guia || "—");
  set("gr-monto", (d.moneda === "COP" ? fmtCOP((d.monto_centavos||0)/100) : fmtUSD((d.monto_centavos||0)/100)) + " " + (d.moneda||""));

  var destino = t("gracias.fondo");
  if (d.modo === "dirigida" && d.destino){
    var lista = PARTNERS_DATA || PARTNERS_FALLBACK || [];
    var p = lista.filter(function(x){ return x.id === d.destino; })[0];
    destino = p ? p.name : d.destino;
  }
  set("gr-destino", destino);

  var etiqueta = { aprobada:"gracias.e.aprobada", rechazada:"gracias.e.rechazada", error:"gracias.e.error" }[d.estado] || "gracias.e.confirmando";
  var pill = { aprobada:"is-on", rechazada:"is-none", error:"is-none" }[d.estado] || "is-wip";
  var ee = document.getElementById("gr-estado");
  if (ee){
    ee.textContent = "";
    var s = document.createElement("span");
    s.className = "med-step-s " + pill;
    s.textContent = t(etiqueta);
    ee.appendChild(s);
  }

  var tt = document.getElementById("gracias-t");
  var pp = document.getElementById("gracias-p");
  /* Los tres caminos se escriben SIEMPRE, incluido el de confirmando. Si el
     último se omite, el render deja de depender solo de los datos y empieza a
     depender de lo que se pintó antes: basta una consulta que vuelva a
     "pendiente" para que el título siga diciendo "Confirmado". */
  if (d.estado === "aprobada" || d.estado === "en_distribucion" || d.estado === "entregada"){
    if (tt) tt.textContent = t("gracias.ok.t");
    if (pp) pp.textContent = t("gracias.ok.p");
  } else if (d.estado === "rechazada" || d.estado === "error"){
    if (tt) tt.textContent = t("gracias.no.t");
    if (pp) pp.textContent = t("gracias.no.p");
  } else {
    if (tt) tt.textContent = t("gracias.t");
    if (pp) pp.textContent = t("gracias.lead");
  }
}

function graciasPerdida(){
  var tt = document.getElementById("gracias-t");
  var pp = document.getElementById("gracias-p");
  if (tt) tt.textContent = t("gracias.lost.t");
  if (pp) pp.textContent = t("gracias.lost.p");
}

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
  var ti=document.getElementById("ctab-ind"), te=document.getElementById("ctab-emp");
  ti.classList.toggle("on", m==="ind"); ti.setAttribute("aria-pressed", m==="ind");
  te.classList.toggle("on", m==="emp"); te.setAttribute("aria-pressed", m==="emp");
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

  /* --- estado de campaña -------------------------------------------------
     La brigada es una operación puntual, no una membresía. Ofrecer «mensual»
     sería cobrarle a alguien todos los meses por una emergencia de agosto, y
     mostrarle un nivel de membresía le insinuaría beneficios del Programa de
     Gratitud — que además es justo lo que el certificado declara que NO hay.
     Así que la campaña fuerza aporte único y esconde el selector. */
  var campana = esBrigada(calc.projectId);
  var fq = document.getElementById("calc-freq");
  if (fq) fq.style.display = campana ? "none" : "";
  var cnota = document.getElementById("calc-campana-nota");
  if (cnota){
    cnota.style.display = campana ? "" : "none";
    if (campana) cnota.textContent = t("calc.brigada.unico");
  }

  var isOnce = (calc.freq === "u");
  var arow=document.getElementById("calc-annual-row"); if(arow) arow.style.display = isOnce ? "none" : "";
  var mblock=document.getElementById("calc-member"); if(mblock) mblock.style.display = isOnce ? "none" : "";

  var monthlyCop = (calc.freq==="a") ? cop/12 : cop;
  var usdMonthly = monthlyCop/USD_RATE;
  var tier = TIERS[0];
  for (var i=0;i<TIERS.length;i++){ if (monthlyCop >= TIERS[i].min) tier = TIERS[i]; }
  var mic=document.getElementById("m-ic"); if(mic) mic.innerHTML = tier.svg;
  var irow=document.getElementById("co-impact-row"), iout=document.getElementById("co-impact"), inote=document.getElementById("calc-impact-note");
  if (irow && iout){
    var u = activeImpactUnit();
    if (u){
      var n = Math.floor(cop / u.cop);
      var uSingular = (lang==="en") ? u.en : u.es;
      var uLabel = (lang==="en") ? (n===1 ? u.en : (u.enPl||u.en)) : (n===1 ? u.es : (u.esPl||u.es));
      var dirigida = (calc.projectId && calc.projectId!=="general");
      if (n>=1){
        // Alcanza al menos una unidad: conteo normal.
        var perLbl = (calc.freq==="m") ? (lang==="en"?" per month":" al mes")
                   : (calc.freq==="a") ? (lang==="en"?" per year":" al a\u00f1o") : "";
        iout.textContent = "\u2248 "+n+" "+uLabel+perLbl; irow.style.display="";
        if(inote){
          inote.style.display="";
          // Lectura agregada para unidades mensuales: 12 -> años, 6 -> semestres.
          var agg = "";
          if (u.monthly){
            if (n>=12 && u.aggAnual){
              var ny=Math.floor(n/12), yl=(ny===1)?(u.aggAnual[lang]||u.aggAnual.es):((u.aggAnualPl&&(u.aggAnualPl[lang]||u.aggAnualPl.es))||u.aggAnual[lang]||u.aggAnual.es);
              agg=(lang==="en")?(" — equal to "+ny+" "+yl):(" — equivale a "+ny+" "+yl);
            } else if (n>=6 && u.aggSemestral){
              var ns=Math.floor(n/6), sl=(ns===1)?(u.aggSemestral[lang]||u.aggSemestral.es):((u.aggSemestralPl&&(u.aggSemestralPl[lang]||u.aggSemestralPl.es))||u.aggSemestral[lang]||u.aggSemestral.es);
              agg=(lang==="en")?(" — equal to "+ns+" "+sl):(" — equivale a "+ns+" "+sl);
            }
          }
          inote.textContent = (dirigida
            ? ((lang==="en") ? "Directed donation: your contribution goes to this project, with records and photos."
                             : "Donación dirigida: tu aporte va a este proyecto, con acta y foto.")
            : t("calc.impact.note")) + agg;
        }
      } else if (dirigida) {
        // No alcanza una unidad todavía: mostrar cuánto cuesta UNA completa (piso educativo).
        iout.textContent = fmtCOP(u.cop) + ((lang==="en") ? " = 1 "+uSingular : " = 1 "+uSingular);
        irow.style.display="";
        if(inote){
          inote.style.display="";
          inote.textContent = (lang==="en")
            ? "This is the cost of one full unit. Reach it and your donation covers a complete month."
            : "Este es el costo de una unidad completa. Alcánzalo y tu donación cubre un mes entero.";
        }
      } else {
        // Fondo general por debajo de la unidad de referencia: ocultar para no mostrar "0".
        irow.style.display="none"; if(inote) inote.style.display="none";
      }
    } else {
      irow.style.display="none";
      /* Sin equivalencia no se calla: se explica POR QUÉ no la hay. Que falte
         una cifra es información, y decirlo vale más que inventarla. */
      if (inote){
        if (campana){ inote.style.display=""; inote.textContent = t("calc.brigada.nota"); }
        else inote.style.display="none";
      }
    }
  }
  setText("m-name", tier[lang] || tier.es);
  setText("m-sub", (lang==="en")?("~ " + Math.round(usdMonthly) + " USD / month"):("~ " + Math.round(usdMonthly) + " USD / mes"));
  payRecNote();
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
var PAY_METHODS = ["banco","paypal"];
function payMethod(m, focusTab){
  PAY_METHODS.forEach(function(x){
    var tab = document.getElementById("paytab-"+x);
    var pan = document.getElementById("pay-"+x);
    var sel = x===m;
    if (tab){ tab.classList.toggle("on", sel); tab.setAttribute("aria-selected", sel); tab.tabIndex = sel ? 0 : -1; }
    if (pan) pan.classList.toggle("on", sel);
  });
  if (focusTab){ var f=document.getElementById("paytab-"+m); if (f) f.focus(); }
}
// navegación por teclado del tablist de pago (patrón WAI-ARIA)
document.addEventListener("keydown", function(e){
  var tab = e.target.closest && e.target.closest(".pay-tab[role=\"tab\"]");
  if (!tab) return;
  var i = PAY_METHODS.indexOf(tab.id.replace("paytab-",""));
  if (i < 0) return;
  var n = PAY_METHODS.length, j = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i+1)%n;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i-1+n)%n;
  else if (e.key === "Home") j = 0;
  else if (e.key === "End") j = n-1;
  if (j < 0) return;
  e.preventDefault();
  payMethod(PAY_METHODS[j], true);
});
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
  {f:"campo_04.jpg", es:"Acompañamiento continuo", en:"Continuous accompaniment"},
  {f:"jornadas/guajira_nina_naranja.webp", es:"La Guajira, enero 2025", en:"La Guajira, January 2025"},
  {f:"jornadas/guajira_abuela.webp", es:"Tres generaciones bajo la enramada", en:"Three generations under the enramada"},
  {f:"jornadas/guajira_retrato_azul.webp", es:"Niñez wayuu, Alta Guajira", en:"Wayuu childhood, Alta Guajira"},
  {f:"jornadas/guajira_futbol.webp", es:"El juego también es acompañamiento", en:"Play is also accompaniment"},
  {f:"jornadas/guajira_sonrisa.webp", es:"Alegría documentada, no prometida", en:"Joy documented, not promised"},
  {f:"jornadas/guajira_hermanas.webp", es:"Hermanas en la jornada de enero", en:"Sisters at the January outreach"},
  {f:"jornadas/guajira_panoleta.webp", es:"Jornada de juguetes, La Guajira", en:"Toy drive day, La Guajira"},
  {f:"jornadas/guajira_atardecer.webp", es:"Atardecer en jornada comunitaria", en:"Sunset during a community day"},
  {f:"jornadas/guajira_bebe.webp", es:"Entrega de leche en jornada wayuu", en:"Milk delivery on a Wayuu outreach day"},
  {f:"jornadas/guajira_territorio.webp", es:"Territorio wayuu, Alta Guajira", en:"Wayuu territory, Alta Guajira"},
  {f:"jornadas/guajira_jornada.webp", es:"Equipo y comunidad, jornada wayuu", en:"Team and community, Wayuu outreach day"},
  {f:"jornadas/baile_flow_escenario.webp", es:"Flow Callejero en tarima (NDF)", en:"Flow Callejero on stage (NDF)"},
  {f:"jornadas/baile_presentacion.webp", es:"Presentación del Proyecto de Baile (NDF)", en:"Dance Project performance (NDF)"},
  {f:"jornadas/baile_grupo_estudio.webp", es:"Proyecto de Baile en el estudio (NDF)", en:"Dance Project at the studio (NDF)"},
  {f:"jornadas/mayores_manos.webp", es:"Visita a hogar de adultos mayores (2023)", en:"Visit to an elders’ home (2023)"},
  {f:"jornadas/mayores_alegria.webp", es:"La alegría también se entrega", en:"Joy is also delivered"}
];
var lbIndex = 0;
function initGallery(){
  var g = document.getElementById("gallery");
  if (!g || g.dataset.done) return;
  g.dataset.done = "1";
  GALLERY.forEach(function(item, i){
    var cap = item[lang] || item.es;
    // Miniatura ligera (400px) para la grilla; la imagen completa se carga en el lightbox.
    var thumb = item.f.indexOf("jornadas/")===0 ? item.f.replace("jornadas/","jornadas/thumb/") : item.f;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gal-item";
    btn.setAttribute("aria-label", cap);
    var img = document.createElement("img");
    img.src = IMG_BASE + thumb;
    img.alt = cap;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 400; img.height = 300;
    btn.appendChild(img);
    var capEl = document.createElement("span");
    capEl.className = "gal-cap";
    capEl.setAttribute("aria-hidden", "true");
    capEl.textContent = cap;
    btn.appendChild(capEl);
    btn.addEventListener("click", function(){ openGalleryLightbox(i); });
    g.appendChild(btn);
  });
}
var lbTrigger = null;
function openGalleryLightbox(i){
  lbIndex = i;
  var item = GALLERY[i];
  var im = document.getElementById("lb-img");
  im.src = IMG_BASE + item.f;
  im.alt = item[lang] || item.es;
  document.getElementById("lb-cap").textContent = item[lang] || item.es;
  document.getElementById("lb-count").textContent = (i+1) + " / " + GALLERY.length;
  var lb = document.getElementById("lightbox");
  if (!lb.classList.contains("on")){
    lbTrigger = document.activeElement;       // recordar disparador para devolver el foco
    lb.classList.add("on");
    var x = lb.querySelector(".lb-x"); if (x) x.focus();
  }
}
function closeLightbox(){
  var lb = document.getElementById("lightbox");
  lb.classList.remove("on");
  if (lbTrigger && lbTrigger.focus){ lbTrigger.focus(); lbTrigger = null; }
}
function lbStep(d){ openGalleryLightbox((lbIndex + d + GALLERY.length) % GALLERY.length); }
document.addEventListener("keydown", function(e){
  var lb = document.getElementById("lightbox");
  if (!lb || !lb.classList.contains("on")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") lbStep(-1);
  else if (e.key === "ArrowRight") lbStep(1);
  else if (e.key === "Tab"){                   // trampa de foco dentro del diálogo
    var foc = Array.prototype.filter.call(lb.querySelectorAll("button"), function(b){ return b.offsetParent !== null; });
    if (!foc.length) return;
    var first = foc[0], last = foc[foc.length-1], a = document.activeElement;
    if (e.shiftKey && a === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last){ e.preventDefault(); first.focus(); }
    else if (foc.indexOf(a) === -1){ e.preventDefault(); first.focus(); }
  }
});
document.addEventListener("click", function(e){
  var lb = document.getElementById("lightbox");
  if (lb && lb.classList.contains("on") && e.target === lb) closeLightbox();
});

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
/* Red en el mapa: cada fundación/empresa aliada se agrega a PARTNERS.
   type: "foundation" | "company" | "hub". Coordenadas a nivel de zona/barrio (nunca direcciones privadas). */
var PARTNERS_FALLBACK = [
  { name:"HUB SOCIAL Give&Grow", type:"hub", lat:6.2442, lng:-75.5812, areaKey:"map.area.med" },
  { name:"Fundación Niños del Futuro", type:"foundation", lat:6.2925, lng:-75.5375, areaKey:"map.area.ndf", url:"https://ninosdelfuturo.com" }
];
var PARTNERS_DATA = null;
function loadPartners(){
  if (PARTNERS_DATA) return Promise.resolve(PARTNERS_DATA);
  return fetch("/data/partners.json")
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){
      PARTNERS_DATA = (j && j.partners && j.partners.length) ? j.partners : PARTNERS_FALLBACK;
      var units=[];
      for (var i=0;i<PARTNERS_DATA.length;i++){
        var p=PARTNERS_DATA[i], us=p.impactUnits||[];
        for (var k=0;k<us.length;k++){ us[k].partner=p.name; units.push(us[k]); }
      }
      if (units.length){ IMPACT_UNITS = units; try{ calcUpdate(); }catch(e){} }
      try{ buildProjectSelect(); }catch(e){}
      return PARTNERS_DATA;
    })
    .catch(function(){ PARTNERS_DATA = PARTNERS_FALLBACK; return PARTNERS_DATA; });
}
/* ---------- evidencia: entregas publicadas (Fase 6) ----------
   Una entrega se asocia a un DESTINO, no a un aporte: el dinero es fungible y
   una jornada se paga entre varios. Es contribución, no atribución — la misma
   doctrina que ya está publicada en #medicion. */
var BRIGADA_DESTINO = "brigada-emergencia-2026-08";

function entregaHTML(e){
  var fotos = (e.fotos||[]).map(function(f){
    return '<a class="ev-foto" href="'+escapeHtml(f.url)+'" target="_blank" rel="noopener">' +
           '<img src="'+escapeHtml(f.url)+'" alt="'+escapeHtml(f.alt||"")+'" loading="lazy"></a>';
  }).join("");
  var meta = [];
  if (e.familias) meta.push("<b>"+e.familias+"</b> "+escapeHtml(t("brig.ev.familias")));
  if (e.aliada) meta.push(escapeHtml(t("brig.ev.con"))+" "+escapeHtml(e.aliada));
  if (e.recibido_por) meta.push(escapeHtml(t("brig.ev.recibio"))+": "+escapeHtml(e.recibido_por));
  return '<article class="ev-item">' +
    '<div class="ev-cab"><span class="ev-num">'+escapeHtml(e.numero)+'</span>' +
    '<span class="ev-fecha">'+escapeHtml(e.fecha)+'</span></div>' +
    '<h4 class="ev-sector">'+escapeHtml(e.sector)+(e.lugar?' <span class="ev-lugar">'+escapeHtml(e.lugar)+'</span>':'')+'</h4>' +
    (meta.length?'<p class="ev-meta">'+meta.join(" · ")+'</p>':'') +
    '<p class="ev-res">'+escapeHtml(e.resumen)+'</p>' +
    (fotos?'<div class="ev-fotos">'+fotos+'</div>':'') +
  '</article>';
}

function pintarEntregas(cajaId, destino, conVacio){
  var caja = document.getElementById(cajaId);
  if (!caja) return;
  fetch("/api/entregas?destino="+encodeURIComponent(destino))
    .then(function(r){ return r.json(); })
    .then(function(d){
      var l = d.entregas || [];
      if (!l.length){
        /* El mensaje de la brigada habla de que «no ha salido»; en el rastreo el
           donante pregunta por SU destino, que puede ser cualquiera. */
        var vacio = (cajaId === "track-entregas") ? t("track.ev.vacio") : t("brig.ev.vacio");
        caja.innerHTML = conVacio ? '<p class="ev-vacio">'+escapeHtml(vacio)+'</p>' : ""; return;
      }
      caja.innerHTML = l.map(entregaHTML).join("");
    })
    .catch(function(){ caja.innerHTML = '<p class="ev-vacio">'+escapeHtml(t("ev.error"))+'</p>'; });
}

function renderHeroImpact(){
  var el = document.getElementById("hero-impact"); if (!el) return;
  loadPartners().then(function(){
    /* Referencia fija, no `activeImpactUnit()`: el hero es de la portada y no
       tiene por qué apagarse porque el visitante dejó otro destino elegido en
       la calculadora. */
    var u = IMPACT_UNITS.length ? IMPACT_UNITS[0] : null; if (!u){ el.hidden = true; return; }
    var n = Math.floor(20000 / u.cop);
    var label = (lang==="en") ? (n===1?u.en:(u.enPl||u.en)) : (n===1?u.es:(u.esPl||u.es));
    var amount = (lang==="en") ? "$20,000 COP" : "$20.000";
    el.innerHTML = t("hero.impact").replace("{a}","<b>"+amount+"</b>").replace("{x}","<b>"+n+" "+escapeHtml(label)+"</b>");
    el.hidden = false;
  });
}
function initIconDraw(){
  var shapes = document.querySelectorAll(".ic-svg path, .ic-svg circle, .ic-svg rect, .ic-svg line, .ic-svg polyline, .ic-svg polygon");
  for (var i=0;i<shapes.length;i++) shapes[i].setAttribute("pathLength","1");
}
// Rol de una fundación en el Hub: 'recibe' (beneficiaria) y/o 'aporta' (fortalece al Hub).
// Sin rol declarado se asume ['recibe'] — retrocompatible con las aliadas ya cargadas.
function fundRoles(p){
  return (Array.isArray(p.rol) && p.rol.length) ? p.rol : ["recibe"];
}
function fundRecibe(p){ return fundRoles(p).indexOf("recibe") >= 0; }
function fundAporta(p){ return fundRoles(p).indexOf("aporta") >= 0; }
function renderAliadas(){
  var el = document.getElementById("aliadas-grid"); if (!el) return;
  loadPartners().then(function(list){
    var html = "";
    for (var i=0;i<list.length;i++){
      var p = list[i]; if (p.type !== "foundation" || !fundRecibe(p)) continue;
      var area = p.area ? (p.area[lang]||p.area.es||"") : "";
      var pob = p.poblacion ? (p.poblacion[lang]||p.poblacion.es||"") : "";
      html += '<a class="pcard" href="#fundacion/'+encodeURIComponent(p.id)+'">'
            + ((p.logo && canShowLogo(p)) ? '<img class="pcard-logo" src="'+escapeHtml(p.logo)+'" alt="" loading="lazy">' : '')
            + '<span class="pcard-body"><b>'+escapeHtml(p.name)+'</b>'
            + '<span class="mu">'+escapeHtml(pob+(pob&&area?" · ":"")+area)+'</span></span>'
            + '<span class="pcard-go" aria-hidden="true">&rarr;</span></a>';
    }
    html += '<div class="card card-empty"><h3>'+t("hub.aliadas.soon.t")+'</h3><p>'+t("hub.aliadas.soon.p")+'</p></div>';
    el.innerHTML = html;
  });
}
// Muro "Aliadas que aportan" (#hub): fundaciones cuyo rol incluye 'aporta'.
// Misma fuente (partners.json); muestra QUÉ le entrega cada una al Hub y a Give&Grow.
function renderAportantes(){
  var el = document.getElementById("aportantes-grid"); if (!el) return;
  var empty = document.getElementById("aportantes-empty");
  loadPartners().then(function(list){
    var html = "", n = 0;
    for (var i=0;i<list.length;i++){
      var p = list[i];
      if (p.type !== "foundation" || !fundAporta(p)) continue;
      n++;
      var area = p.area ? (p.area[lang]||p.area.es||"") : "";
      var aporta = p.aporta ? (p.aporta[lang]||p.aporta.es||"") : "";
      html += '<a class="pcard pcard-emp" href="#fundacion/'+encodeURIComponent(p.id)+'">'
            + ((p.logo && canShowLogo(p)) ? '<img class="pcard-logo" src="'+escapeHtml(p.logo)+'" alt="" loading="lazy">' : '')
            + '<span class="pcard-body"><b>'+escapeHtml(p.name)+'</b>'
            + (area ? '<span class="mu">'+escapeHtml(area)+'</span>' : '')
            + '<span class="emp-mods"><span class="emp-mod">'+escapeHtml(t("net.type.foundation.aporta"))+'</span></span>'
            + (aporta ? '<span class="emp-recips"><span class="emp-recip"><i>'+escapeHtml(t("emp.card.aporta"))+'</i> '+escapeHtml(aporta)+'</span></span>' : '')
            + '</span><span class="pcard-go" aria-hidden="true">&rarr;</span></a>';
    }
    el.innerHTML = html;
    el.style.display = n ? "" : "none";
    if (empty) empty.style.display = n ? "none" : "";
  });
}
// Muro de empresas aliadas (#empresas). Misma fuente que fundaciones (partners.json),
// filtrado a type:company. Sin aliadas verificadas -> estado semilla honesto.
function renderEmpresas(){
  var el = document.getElementById("empresas-grid"); if (!el) return;
  var empty = document.getElementById("empresas-empty");
  loadPartners().then(function(list){
    var html = "", n = 0;
    for (var i=0;i<list.length;i++){
      var p = list[i]; if (p.type !== "company") continue;
      n++;
      var sector = p.sector ? (p.sector[lang]||p.sector.es||"") : "";
      var mods = Array.isArray(p.modalidad) ? p.modalidad : [];
      var tags = mods.map(function(m){ return '<span class="emp-mod">'+escapeHtml(t("emp.mod."+m))+'</span>'; }).join("");
      var aporta = p.aporta ? (p.aporta[lang]||p.aporta.es||"") : "";
      var recibe = p.recibe ? (p.recibe[lang]||p.recibe.es||"") : "";
      var recip = "";
      if (aporta) recip += '<span class="emp-recip"><i>'+escapeHtml(t("emp.card.aporta"))+'</i> '+escapeHtml(aporta)+'</span>';
      if (recibe) recip += '<span class="emp-recip"><i>'+escapeHtml(t("emp.card.recibe"))+'</i> '+escapeHtml(recibe)+'</span>';
      var inner = ((p.logo && canShowLogo(p)) ? '<img class="pcard-logo" src="'+escapeHtml(p.logo)+'" alt="" loading="lazy">' : '')
        + '<span class="pcard-body"><b>'+escapeHtml(p.name)+'</b>'
        + (sector ? '<span class="mu">'+escapeHtml(sector)+'</span>' : '')
        + (tags ? '<span class="emp-mods">'+tags+'</span>' : '')
        + (recip ? '<span class="emp-recips">'+recip+'</span>' : '')
        + '</span>';
      if (p.url){
        html += '<a class="pcard pcard-emp" href="'+escapeHtml(p.url)+'" target="_blank" rel="noopener">'+inner
          + '<span class="pcard-go" aria-hidden="true">&#8599;</span></a>';
      } else {
        html += '<div class="pcard pcard-emp">'+inner+'</div>';
      }
    }
    el.innerHTML = html;
    el.style.display = n ? "" : "none";
    if (empty) empty.style.display = n ? "none" : "";
  });
}
// Política de Privacidad (#privacidad). Contenido bilingüe inyectado (no i18n key-a-key
// por ser documento largo). Adaptado del doc legal v1.0: cookies = realidad del sitio
// (Cloudflare sin cookies), sin citar % tributario para no reabrir la inconsistencia.
var PRIVACY = {
  es: `<p class="legal-meta">Versión 1.0 · Vigente desde su publicación · Conforme a la Ley 1581 de 2012 (Colombia), su Decreto 1377 de 2013 y el Reglamento General de Protección de Datos (GDPR, Unión Europea).</p>
<h3>1. Responsable del tratamiento</h3>
<ul>
<li><strong>Razón social:</strong> Fundación Give&amp;Grow International</li>
<li><strong>NIT:</strong> 901.948.930-2</li>
<li><strong>Domicilio:</strong> Carrera 82A #9A Sur 28, Medellín, Antioquia, Colombia</li>
<li><strong>Correo de privacidad:</strong> <a href="mailto:privacidad@thegiveandgrowproject.org">privacidad@thegiveandgrowproject.org</a></li>
<li><strong>Representante Legal:</strong> Juan Sebastián Navarro Osorio</li>
<li><strong>Autoridad de vigilancia:</strong> Superintendencia de Industria y Comercio (SIC), Colombia</li>
</ul>
<h3>2. Qué datos tratamos y con qué finalidad</h3>
<p>Tratamos únicamente los datos necesarios para cumplir nuestra labor, según quién nos los entregue:</p>
<ul>
<li><strong>Donantes (personas y empresas):</strong> nombre o razón social, identificación, correo, teléfono, ciudad y monto o historial de aportes — para emitir tu certificado de donación con el beneficio tributario que contempla la ley, llevar la contabilidad, gestionar tu membresía y enviarte los reportes de impacto. No almacenamos datos de tarjetas de pago.</li>
<li><strong>Empresas y comercios aliados:</strong> datos de la empresa, del representante y de contacto — para la debida diligencia, la firma del convenio y la trazabilidad de la alianza.</li>
<li><strong>Voluntarios:</strong> datos de identificación y profesionales — para verificar idoneidad y asignarte a los programas.</li>
<li><strong>Beneficiarios de programas:</strong> datos entregados por las fundaciones aliadas para ejecutar y documentar el impacto. Los datos de niñas, niños y adolescentes reciben protección reforzada y solo se tratan con autorización de su representante legal.</li>
</ul>
<h3>3. Base legal</h3>
<p>Tratamos tus datos con tu <strong>autorización previa, expresa e informada</strong>, que recogemos por formulario físico o digital (con registro de fecha). Puedes revocarla en cualquier momento. Para titulares en la Unión Europea aplicamos las bases del Artículo 6 del GDPR (consentimiento, ejecución de un contrato, obligación legal o interés legítimo, según el caso).</p>
<h3>4. Tus derechos</h3>
<p>Como titular de los datos puedes, en cualquier momento:</p>
<ul>
<li><strong>Conocer y acceder</strong> a los datos que tratamos sobre ti.</li>
<li><strong>Rectificar</strong> datos inexactos o desactualizados.</li>
<li><strong>Solicitar la supresión</strong> ("derecho al olvido") cuando no exista un deber legal de conservarlos.</li>
<li><strong>Revocar la autorización</strong> que nos diste.</li>
<li><strong>Oponerte</strong> a ciertos tratamientos y solicitar la <strong>portabilidad</strong> de tus datos.</li>
<li><strong>Presentar una queja</strong> ante la SIC (Colombia) o la autoridad de control europea que corresponda.</li>
</ul>
<h3>5. Cómo ejercer tus derechos</h3>
<p>Escríbenos a <a href="mailto:privacidad@thegiveandgrowproject.org">privacidad@thegiveandgrowproject.org</a> con tu nombre, tu documento y la solicitud. Acusamos recibo en <strong>2 días hábiles</strong>; respondemos las consultas de acceso en <strong>10 días hábiles</strong> y los reclamos (rectificación, supresión, revocación) en <strong>15 días hábiles</strong>.</p>
<h3>6. Conservación de los datos</h3>
<p>Guardamos cada dato solo el tiempo necesario o el que exige la ley: los soportes de donaciones <strong>10 años</strong> (obligación tributaria y contable); los datos de beneficiarios, la duración del programa más 5 años; los de voluntarios, la vinculación más 3 años. Cumplido el plazo, se eliminan de forma segura.</p>
<h3>7. Transferencias internacionales</h3>
<p>Podemos compartir datos con encargados o aliados en otros países (por ejemplo, proveedores tecnológicos o fundaciones de cooperación), siempre con garantías adecuadas: cláusulas contractuales, acuerdos de encargo del tratamiento y el mínimo de datos necesarios, anonimizados cuando es posible.</p>
<h3>8. Seguridad de la información</h3>
<p>Protegemos tus datos con cifrado en tránsito, control de acceso por roles, registros de auditoría y protocolos de gestión de incidentes. Ningún sistema es infalible, pero aplicamos estándares reconocidos para reducir el riesgo.</p>
<h3>9. Cookies y analítica</h3>
<p>Este sitio <strong>no usa cookies de rastreo ni de marketing, ni píxeles de terceros.</strong> Para entender el uso del sitio empleamos <strong>Cloudflare Web Analytics, que no instala cookies ni identifica a las personas.</strong> Solo guardamos tu <strong>preferencia de tema (claro u oscuro)</strong> localmente en tu navegador; no es una cookie de seguimiento ni se envía a ningún servidor.</p>
<h3>10. Vigencia y cambios</h3>
<p>Esta política (Versión 1.0) rige desde su publicación y se revisa al menos una vez al año, o antes si cambian la normativa o nuestras prácticas. Publicaremos aquí cualquier actualización.</p>`,
  en: `<p class="legal-meta">Version 1.0 · Effective upon publication · In accordance with Colombia's Law 1581 of 2012, its Decree 1377 of 2013, and the EU General Data Protection Regulation (GDPR).</p>
<h3>1. Data controller</h3>
<ul>
<li><strong>Legal name:</strong> Fundación Give&amp;Grow International</li>
<li><strong>Tax ID (NIT):</strong> 901.948.930-2</li>
<li><strong>Address:</strong> Carrera 82A #9A Sur 28, Medellín, Antioquia, Colombia</li>
<li><strong>Privacy email:</strong> <a href="mailto:privacidad@thegiveandgrowproject.org">privacidad@thegiveandgrowproject.org</a></li>
<li><strong>Legal Representative:</strong> Juan Sebastián Navarro Osorio</li>
<li><strong>Supervisory authority:</strong> Superintendence of Industry and Commerce (SIC), Colombia</li>
</ul>
<h3>2. What data we process and why</h3>
<p>We process only the data needed to carry out our work, depending on who provides it:</p>
<ul>
<li><strong>Donors (individuals and companies):</strong> name or legal name, ID, email, phone, city and donation amount or history — to issue your donation certificate with the tax benefit provided by law, keep our accounting, manage your membership and send you impact reports. We do not store payment-card data.</li>
<li><strong>Partner companies and businesses:</strong> company, representative and contact details — for due diligence, signing the agreement and alliance traceability.</li>
<li><strong>Volunteers:</strong> identification and professional data — to verify suitability and assign you to programs.</li>
<li><strong>Program beneficiaries:</strong> data provided by partner foundations to deliver and document impact. Data of children and adolescents receives reinforced protection and is processed only with their legal guardian's authorization.</li>
</ul>
<h3>3. Legal basis</h3>
<p>We process your data with your <strong>prior, express and informed authorization</strong>, collected through a physical or digital form (with a timestamp). You may revoke it at any time. For data subjects in the European Union we rely on the bases in Article 6 of the GDPR (consent, performance of a contract, legal obligation or legitimate interest, as applicable).</p>
<h3>4. Your rights</h3>
<p>As a data subject you may, at any time:</p>
<ul>
<li><strong>Know and access</strong> the data we process about you.</li>
<li><strong>Rectify</strong> inaccurate or outdated data.</li>
<li><strong>Request erasure</strong> ("right to be forgotten") where there is no legal duty to keep it.</li>
<li><strong>Withdraw the authorization</strong> you gave us.</li>
<li><strong>Object</strong> to certain processing and request the <strong>portability</strong> of your data.</li>
<li><strong>File a complaint</strong> with the SIC (Colombia) or the relevant European supervisory authority.</li>
</ul>
<h3>5. How to exercise your rights</h3>
<p>Write to <a href="mailto:privacidad@thegiveandgrowproject.org">privacidad@thegiveandgrowproject.org</a> with your name, ID and request. We acknowledge receipt within <strong>2 business days</strong>; we answer access requests within <strong>10 business days</strong> and claims (rectification, erasure, withdrawal) within <strong>15 business days</strong>.</p>
<h3>6. Data retention</h3>
<p>We keep each piece of data only as long as necessary or as required by law: donation records for <strong>10 years</strong> (tax and accounting duty); beneficiary data for the duration of the program plus 5 years; volunteer data for the engagement plus 3 years. Once the term ends, data is securely deleted.</p>
<h3>7. International transfers</h3>
<p>We may share data with processors or partners in other countries (for example, technology providers or cooperation foundations), always with adequate safeguards: contractual clauses, data-processing agreements and the minimum data necessary, anonymized where possible.</p>
<h3>8. Information security</h3>
<p>We protect your data with encryption in transit, role-based access control, audit logs and incident-management protocols. No system is infallible, but we apply recognized standards to reduce risk.</p>
<h3>9. Cookies and analytics</h3>
<p>This site <strong>uses no tracking or marketing cookies, and no third-party pixels.</strong> To understand site usage we use <strong>Cloudflare Web Analytics, which sets no cookies and does not identify individuals.</strong> We only store your <strong>theme preference (light or dark)</strong> locally in your browser; it is not a tracking cookie and is not sent to any server.</p>
<h3>10. Term and changes</h3>
<p>This policy (Version 1.0) is effective upon publication and is reviewed at least once a year, or sooner if regulations or our practices change. We will post any updates here.</p>`
};
function renderPrivacy(){
  var el = document.getElementById("privacy-body"); if (!el) return;
  el.innerHTML = PRIVACY[lang] || PRIVACY.es;
}
function renderFicha(fid){
  var el = document.getElementById("ficha-body"); if (!el) return;
  loadPartners().then(function(list){
    var p = null;
    for (var i=0;i<list.length;i++){ if (list[i].id === fid){ p = list[i]; break; } }
    if (!p){ go("hub"); return; }
    applyFichaMeta(p);
    var pr = p.profile || {};
    var esc = escapeHtml;
    var pick = function(o){ return o ? esc(o[lang]||o.es||"") : ""; };
    var area = pick(p.area), pob = pick(p.poblacion), badge = pick(pr.badge),
        years = pick(pr.years), about = pick(pr.about), hubTxt = pick(pr.hub),
        quote = pick(pr.quote), tagline = pick(pr.tagline);
    var u = (p.impactUnits && p.impactUnits[0]) || null;
    var html = '<a class="card-link" href="#hub">&larr; '+t("ficha.back")+'</a>'
      + '<div class="ficha-head">'
      + ((p.logo && canShowLogo(p)) ? '<img class="ficha-logo" src="'+esc(p.logo)+'" alt="">' : '')
      + '<div><h1 class="ficha-name">'+esc(p.name)+'</h1>'
      + (tagline ? '<p class="ficha-tagline">'+tagline+'</p>' : '')
      + (badge ? '<span class="tag">'+badge+'</span>' : '')
      + '<div class="eco-row" style="margin-top:12px">'
      + (area ? '<span class="eco-chip">'+area+'</span>' : '')
      + (pob ? '<span class="eco-chip">'+pob+'</span>' : '')
      + (years ? '<span class="eco-chip">'+years+'</span>' : '')
      + (pr.leader ? '<span class="eco-chip">'+t("ficha.lider")+': '+esc(pr.leader)+'</span>' : '')
      + '</div></div></div>'
      + (about ? '<p class="lead" style="margin-top:22px;max-width:70ch">'+about+'</p>' : '')
      + (quote ? '<blockquote class="ficha-quote">'+quote+'</blockquote>' : '');
    if (pr.programs && pr.programs.length){
      html += '<h3 style="margin-top:34px">'+t("ficha.prog.t")+'</h3><div class="grid g2" style="margin-top:16px">';
      for (var k=0;k<pr.programs.length;k++){
        var g = pr.programs[k];
        var gLogo = g.logo ? '<div class="prog-logo"><img src="'+esc(g.logo)+'" alt="'+esc(g.name)+'" loading="lazy"></div>' : '';
        html += '<div class="card prog-card">'+gLogo+'<h3>'+esc(g.name)+'</h3><p>'+esc((g.desc && (g.desc[lang]||g.desc.es))||"")+'</p></div>';
      }
      html += '</div>';
    }
    /* Galería curada auto-alojada (consentimiento verificado en canShowGallery) */
    if (p.type === "foundation"){
      html += '<h3 style="margin-top:34px">'+t("ficha.gal.t")+'</h3>';
      var gal = (canShowGallery(p) && p.gallery && p.gallery.length) ? p.gallery : null;
      if (gal){
        html += '<div class="gal-strip" role="list">';
        for (var gi=0; gi<gal.length; gi++){
          var ph = gal[gi], alt = (ph.alt && (ph.alt[lang]||ph.alt.es)) || "";
          html += '<button type="button" class="gal-item" role="listitem" aria-label="'+t("ficha.gal.open")+'" data-act="openLightbox(\''+esc(p.id)+'\','+gi+')">'
                + '<img src="'+esc(ph.src)+'" alt="'+esc(alt)+'" loading="lazy"></button>';
        }
        html += '</div>';
      } else {
        html += '<div class="card card-empty gal-empty"><p>'+t("ficha.gal.empty")+'</p></div>';
      }
    }
    if (u){
      var qs = [10000, 20000, 50000, 100000];
      var chips = qs.map(function(q,qi){
        return '<button type="button" class="fimp-q'+(qi===1?' on':'')+'" data-cop="'+q+'" data-act="fichaImpCalc(this,\''+esc(p.id)+'\')">$'+q.toLocaleString(lang==="en"?"en-US":"es-CO")+'</button>';
      }).join('');
      html += '<div class="card ficha-impact" style="margin-top:26px"><h3>'+t("ficha.imp.t")+'</h3>'
        + '<div class="fimp-row">'+chips+'</div>'
        + '<p id="fimp-out" data-fid="'+esc(p.id)+'"></p></div>';
    }
    if (hubTxt) html += '<h3 style="margin-top:34px">'+t("ficha.hub.t")+'</h3><p style="max-width:70ch">'+hubTxt+'</p>';
    html += '<div class="eco-row" style="margin-top:26px">'
      + (p.url ? '<a class="card-link" href="'+esc(p.url)+'" target="_blank" rel="noopener">'+t("ficha.web")+'</a>' : '')
      + (p.instagram ? '<a class="card-link" style="margin-left:18px" href="'+esc(p.instagram)+'" target="_blank" rel="noopener">Instagram</a>' : '')
      + '<button type="button" id="ficha-share" class="card-link ficha-share" data-act="shareFicha(\''+esc(p.id)+'\')">'+t("ficha.share")+'</button>'
      + '</div>'
      + '<div class="cta-box" style="margin-top:36px"><h2>'+t("ficha.cta.t")+'</h2><p class="mu">'+t("ficha.cta.p")+'</p>'
      + '<a class="ficha-cta-btn" href="#donar"'+(u ? ' data-act="donarA(\''+esc(u.id)+'\')"' : '')+'>'+t("ficha.cta.btn")+'</a></div>';
    el.innerHTML = html;
    var q0 = el.querySelector(".fimp-q.on");
    if (q0) fichaImpCalc(q0, p.id);
  });
}
/* Consentimiento: hook (Tarea 6 lo conecta al bloque consent{} de partners.json) */
function canShowGallery(p){
  if (p.type === "hub") return true;
  return !!(p.consent && p.consent.photos === true);
}
function canShowLogo(p){
  if (p.type === "hub") return true;
  return !!(p.consent && p.consent.logo === true);
}
/* Lightbox nativo con <dialog>: sin librerías, accesible, ESC cierra */
var LB = { list:null, ix:0 };
function ensureLightbox(){
  var d = document.getElementById("gal-lb");
  if (d) return d;
  d = document.createElement("dialog");
  d.id = "gal-lb"; d.className = "gal-lb";
  d.innerHTML = '<button type="button" class="gal-lb-btn gal-lb-x" aria-label="'+t("ficha.gal.close")+'" data-act="closeGalLb()">'
    + '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>'
    + '<button type="button" class="gal-lb-btn gal-lb-prev" aria-label="'+t("ficha.gal.prev")+'" data-act="stepLightbox(-1)">'
    + '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="14 6 8 12 14 18"/></svg></button>'
    + '<figure class="gal-lb-fig"><img id="gal-lb-img" alt=""><figcaption id="gal-lb-cap" class="mu"></figcaption></figure>'
    + '<button type="button" class="gal-lb-btn gal-lb-next" aria-label="'+t("ficha.gal.next")+'" data-act="stepLightbox(1)">'
    + '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="10 6 16 12 10 18"/></svg></button>';
  d.addEventListener("click", function(e){ if (e.target === d) closeGalLb(); });
  document.body.appendChild(d);
  return d;
}
function openLightbox(pid, ix){
  loadPartners().then(function(list){
    var p = null;
    for (var i=0;i<list.length;i++){ if (list[i].id === pid){ p = list[i]; break; } }
    if (!p || !canShowGallery(p) || !p.gallery || !p.gallery.length) return;
    LB.list = p.gallery; LB.ix = ix || 0;
    var d = ensureLightbox();
    paintLightbox();
    if (!d.open) d.showModal();
  });
}
function paintLightbox(){
  var ph = LB.list[LB.ix]; if (!ph) return;
  var alt = (ph.alt && (ph.alt[lang]||ph.alt.es)) || "";
  var img = document.getElementById("gal-lb-img");
  img.src = ph.src; img.alt = alt;
  document.getElementById("gal-lb-cap").textContent = alt;
  var multi = LB.list.length > 1;
  document.querySelector(".gal-lb-prev").style.display = multi ? "" : "none";
  document.querySelector(".gal-lb-next").style.display = multi ? "" : "none";
}
function stepLightbox(d){
  if (!LB.list) return;
  LB.ix = (LB.ix + d + LB.list.length) % LB.list.length;
  paintLightbox();
}
function closeGalLb(){
  var d = document.getElementById("gal-lb");
  if (d && d.open) d.close();
}
/* Mapa día/noche: los tiles siguen el tema del sitio (v5 "mapa vivo") */
var GG_MAP=null, GG_TILE=null;
function ggTileUrl(){
  var dark = document.documentElement.getAttribute("data-theme")==="dark";
  return "https://{s}.basemaps.cartocdn.com/"+(dark?"dark_all":"light_all")+"/{z}/{x}/{y}{r}.png";
}
function ggMapTiles(){ if (GG_TILE) GG_TILE.setUrl(ggTileUrl()); }
function initMap(){
  var box = document.getElementById("map-box");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  function pin(tp){
    return L.divIcon({ className:"", html:'<span class="gg-pin gg-pin-'+tp+'"></span>', iconSize:[24,32], iconAnchor:[12,30], popupAnchor:[0,-26] });
  }
  function build(list){
    var map = L.map("map-box",{scrollWheelZoom:false}).setView([6.2442,-75.5812], 12);
    GG_MAP = map;
    GG_TILE = L.tileLayer(ggTileUrl(),
      {subdomains:"abcd", maxZoom:19, attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(map);
    var layers = { foundation:L.layerGroup(), company:L.layerGroup(), hub:L.layerGroup() };
    var counts = { foundation:0, company:0, hub:0 };
    var bounds=[];
    for (var i=0;i<list.length;i++){
      var pt=list[i];
      var area = pt.area ? (pt.area[lang]||pt.area.es||"") : (pt.areaKey ? t(pt.areaKey) : "");
      var html="<b>"+escapeHtml(pt.name)+"</b>"+(area?("<br>"+escapeHtml(area)):"");
      if (pt.type==="company"){
        if (pt.direccion) html += "<br>"+escapeHtml(pt.direccion);
        html += '<br><a href="'+escapeHtml(pt.ficha)+'">'+t("map.biz")+"</a>";
        if (pt.direccion) html += ' &middot; <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(pt.direccion+", Colombia")+'" target="_blank" rel="noopener">'+t("com.maps")+"</a>";
      } else if (pt.url){
        html += '<br><a href="'+escapeHtml(pt.url)+'" target="_blank" rel="noopener">'+t("map.visit")+"</a>";
      }
      var lay = layers[pt.type] || layers.foundation;
      L.marker([pt.lat,pt.lng],{icon:pin(pt.type)}).addTo(lay).bindPopup(html);
      if (counts[pt.type]!=null) counts[pt.type]++;
      bounds.push([pt.lat,pt.lng]);
    }
    for (var ty in layers) layers[ty].addTo(map);
    if (bounds.length>1) map.fitBounds(bounds,{padding:[42,42]});
    var legend=L.control({position:"bottomleft"});
    legend.onAdd=function(){
      var d=L.DomUtil.create("div","map-legend");
      d.innerHTML='<span><i class="gg-dot" style="background:#2E7D4F"></i>'+t("map.leg.f")+"</span>"
                 +'<span><i class="gg-dot" style="background:#B4690E"></i>'+t("map.leg.c")+"</span>"
                 +'<span><i class="gg-dot" style="background:#1F5C38"></i>'+t("map.leg.hub")+"</span>";
      return d;
    };
    legend.addTo(map);
    /* Filtros de red + resumen honesto (calculado de los datos reales) */
    var fbox = document.getElementById("map-filters");
    if (fbox){
      var FILTERS = [
        {k:"all", key:"map.f.all"},
        {k:"foundation", key:"map.leg.f"},
        {k:"company", key:"map.leg.c"}
      ];
      fbox.innerHTML = FILTERS.map(function(f,fi){
        return '<button type="button" class="map-fchip'+(fi===0?' on':'')+'" data-k="'+f.k+'" data-i18n="'+f.key+'">'+t(f.key)+'</button>';
      }).join('');
      fbox.querySelectorAll(".map-fchip").forEach(function(b){
        b.addEventListener("click", function(){
          fbox.querySelectorAll(".map-fchip").forEach(function(x){ x.classList.toggle("on", x===b); });
          var k=b.dataset.k;
          for (var ty in layers){
            var show = (k==="all") || (ty===k) || (ty==="hub"); /* el HUB siempre visible: es el centro de la red */
            if (show) layers[ty].addTo(map); else map.removeLayer(layers[ty]);
          }
        });
      });
    }
    var sumEl = document.getElementById("map-summary");
    if (sumEl){
      var phrase = function(n, key){ return n + " " + t("map.noun." + key + "." + (n === 1 ? "one" : "many")); };
      sumEl.textContent = t("map.sum")
        .replace("{f}", phrase(counts.foundation, "f"))
        .replace("{c}", phrase(counts.company, "c"))
        .replace("{h}", phrase(counts.hub, "h"));
    }
  }
  function start(){
    Promise.all([loadPartners(), loadGratitud()]).then(function(res){
      var list = (res[0] || []).slice();
      var comercios = (res[1] && res[1].comercios) || [];
      for (var i=0;i<comercios.length;i++){
        var c = comercios[i];
        if (c.status==="activa" && c.coords && typeof c.coords.lat==="number" && typeof c.coords.lng==="number"){
          list.push({ id:c.id, name:c.name, type:"company", lat:c.coords.lat, lng:c.coords.lng,
            area:{es:c.ciudad||"", en:c.ciudad||""}, ficha:"#comercio/"+c.id, direccion:c.direccion||"" });
        }
      }
      build(list);
    });
  }
  if (window.L){ start(); return; }
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/vendor/leaflet/leaflet.css";
  document.head.appendChild(css);
  var s = document.createElement("script");
  s.src = "/vendor/leaflet/leaflet.js";
  s.onload = start;
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
// El system prompt, el modelo y max_tokens viven en el Worker givegrow-alma
// (fijos del lado del servidor). El cliente solo envía los mensajes.
var almaHistory = [];
function almaFmt(text){
  var s = String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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
/* ---------- Panel lateral de ALMA ----------
   ALMA dejó de ser una página (v5 Fase 2): es una columna disponible en cualquier
   ruta. Maneja foco (trampa + retorno al disparador), Esc y el estado aria. */
var almaLastFocus = null;
function almaPanel(open){
  var p = document.getElementById("alma-panel");
  if (!p) return false;
  var s = document.getElementById("alma-scrim");
  var b = document.getElementById("alma-open");
  if (open){
    // Los chips se arman con la ruta desde la que se abrió: ALMA responde en contexto.
    almaFromRoute = currentRoute || "inicio";
    renderAlmaChips();
    almaLastFocus = document.activeElement;
    p.classList.add("open"); if (s) s.classList.add("open");
    if (b) b.setAttribute("aria-expanded","true");
    document.body.classList.add("alma-lock");
    var i = document.getElementById("alma-input");
    if (i) setTimeout(function(){ i.focus(); }, 60);
  } else {
    p.classList.remove("open"); if (s) s.classList.remove("open");
    if (b) b.setAttribute("aria-expanded","false");
    document.body.classList.remove("alma-lock");
    if (almaLastFocus && almaLastFocus.focus) almaLastFocus.focus();
    almaLastFocus = null;
  }
  return false;
}
document.addEventListener("keydown", function(e){
  var p = document.getElementById("alma-panel");
  if (!p || !p.classList.contains("open")) return;
  if (e.key === "Escape"){ almaPanel(false); return; }
  if (e.key !== "Tab") return;
  var f = p.querySelectorAll("button, input, a[href]");
  if (!f.length) return;
  var first = f[0], last = f[f.length-1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});
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
    body: JSON.stringify({ messages: almaHistory })
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
  /* Wompi devuelve al donante a /gracias?id=… — una ruta con path, no con hash.
     El fallback de SPA ya sirvió index.html; aquí se enruta a mano y se deja el
     hash limpio, conservando el identificador en memoria. */
  if (location.pathname === "/gracias" || location.pathname === "/gracias/"){
    graciasArranca();
    hash = "gracias";
  }
  go(hash, true);
  window.addEventListener("popstate", function(){ var h = location.hash.replace("#","")||"inicio"; go(h, true); });
  // Navegación por delegación (reemplaza inline; CSP fase 1).
  // Ignora elementos que aún conservan onclick inline → migración incremental sin doble disparo.
  document.addEventListener("click", function(e){
    var el = e.target.closest("[data-nav], a[href^='#']");
    if (!el || el.getAttribute("onclick") || el.hasAttribute("data-act")) return;
    var route = el.getAttribute("data-nav") || (el.getAttribute("href")||"").slice(1);
    if (!isSpaRoute(route)) return;   // deja pasar skip-link (#), anclas internas, etc.
    e.preventDefault();
    go(route);
  }, true);   // captura: funciona aun dentro de popups de Leaflet (que detienen la propagación)
  // Despachador de acciones por delegación (CSP fase 2)
  document.addEventListener("click", function(e){ var el=e.target.closest("[data-act]"); if(!el) return; if(el.tagName==="A") e.preventDefault(); runAct(el.getAttribute("data-act"), el, e); }, true);
  document.addEventListener("input", function(e){ var el=e.target.closest("[data-input]"); if(!el) return; runAct(el.getAttribute("data-input"), el, e); });
  document.addEventListener("change", function(e){ var el=e.target.closest("[data-change]"); if(!el) return; runAct(el.getAttribute("data-change"), el, e); });
  document.addEventListener("submit", function(e){ var el=e.target.closest("[data-submit]"); if(!el) return; e.preventDefault(); runAct(el.getAttribute("data-submit"), el, e); });
  document.addEventListener("keydown", function(e){ if(e.key!=="Enter") return; var el=e.target.closest("[data-enter]"); if(!el) return; runAct(el.getAttribute("data-enter"), el, e); });
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
  });
  initReveal();
  animateCounters();
  if (currentRoute==="inicio") updateLiveStats();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
loadPartners();
if ((navigator.language||"").indexOf("en")===0) ensureLang("en");
initIconDraw();

/* ---------- tema día/noche: automático por reloj + preferencia manual ---------- */
var THEME_KEY = "gg-theme";
var themeTimer = null;
function themeStored(){ try { var s = localStorage.getItem(THEME_KEY); return (s==="light"||s==="dark") ? s : "auto"; } catch(e){ return "auto"; } }
function themeStore(m){ try { if (m==="auto") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, m); } catch(e){} }
function themeByClock(){ var h = new Date().getHours(); return (h>=6 && h<18) ? "light" : "dark"; }
function themeResolve(m){ return m==="auto" ? themeByClock() : m; }
function themeApply(mode, anim){
  var root = document.documentElement;
  var res = themeResolve(mode);
  if (anim && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)){
    root.classList.add("theming");
    setTimeout(function(){ root.classList.remove("theming"); }, 380);
  }
  root.setAttribute("data-theme", res);
  ggMapTiles();
  var mc = document.querySelector('meta[name="theme-color"]');
  if (mc) mc.setAttribute("content", res==="dark" ? "#0F1613" : "#1F5C38");
  var b = document.getElementById("theme-btn");
  if (b){
    b.setAttribute("data-mode", mode);
    var k = mode==="auto" ? "theme.auto" : (mode==="light" ? "theme.light" : "theme.dark");
    b.setAttribute("data-i18n", k);
    b.setAttribute("data-i18n-attr", "aria-label");
    var label = t(k);
    b.setAttribute("aria-label", label);
    b.setAttribute("title", label);
  }
  if (themeTimer){ clearInterval(themeTimer); themeTimer = null; }
  if (mode==="auto"){
    themeTimer = setInterval(function(){
      var cur = document.documentElement.getAttribute("data-theme");
      var want = themeByClock();
      if (cur !== want) themeApply("auto", true);
    }, 60000);
  }
}
function themeCycle(){
  var order = ["auto","light","dark"];
  var next = order[(order.indexOf(themeStored()) + 1) % order.length];
  themeStore(next);
  themeApply(next, true);
}
themeApply(themeStored(), false);

/* ---------- barra de recorrido: la fundación de 0 a 100 ---------- */
var JOURNEY = ["inicio","origen","hub","impacto","fundaciones","empresas","membresias","gratitud","transparencia","faq","contacto","donar"];
var JOURNEY_KEYS = {inicio:"nav.inicio",origen:"nav.origen",hub:"nav.hub",impacto:"nav.impacto",fundaciones:"nav.fundaciones",empresas:"nav.empresas",membresias:"nav.membres",gratitud:"nav.gratitud",transparencia:"nav.transp",faq:"nav.faq",contacto:"nav.contacto",donar:"nav.donar"};
function renderJourney(id){
  var bar = document.getElementById("journey-nav");
  var idx = JOURNEY.indexOf(id);
  if (idx === -1){ if (bar) bar.style.display = "none"; return; }
  if (!bar){
    bar = document.createElement("div");
    bar.id = "journey-nav";
    bar.className = "wrap";
  }
  bar.style.display = "";
  var prev = idx > 0 ? JOURNEY[idx-1] : null;
  var next = idx < JOURNEY.length-1 ? JOURNEY[idx+1] : null;
  var segs = "";
  for (var s=0; s<JOURNEY.length; s++){ segs += '<span class="j-seg'+(s<=idx?" on":"")+'"></span>'; }
  var html = '<div class="journey">'
    + '<span class="j-meta"><span data-i18n="journey.t">El recorrido</span> · <b>' + (idx+1) + '</b>/' + JOURNEY.length + '</span>'
    + '<div class="j-track" aria-hidden="true">' + segs + '</div>'
    + '<div class="j-links">';
  if (prev) html += '<a class="j-prev" href="#'+prev+'">&larr; <span data-i18n="'+JOURNEY_KEYS[prev]+'"></span></a>';
  if (next) html += '<a class="j-next" href="#'+next+'"><span data-i18n="journey.next">Siguiente</span>: <span data-i18n="'+JOURNEY_KEYS[next]+'"></span> &rarr;</a>';
  else html += '<span class="j-done" data-i18n="journey.done">Recorrido completo.</span>';
  html += '</div></div>';
  bar.innerHTML = html;
  var page = document.getElementById("page-"+id);
  if (page) page.appendChild(bar);
  var nodes = bar.querySelectorAll("[data-i18n]");
  for (var i=0;i<nodes.length;i++){ nodes[i].textContent = t(nodes[i].getAttribute("data-i18n")); }
}
renderJourney(currentRoute || "inicio");

/* ---------- accesibilidad: saltar al contenido ---------- */
function skipToContent(){
  var page = document.querySelector("main.page.active") || document.querySelector("main");
  if (page){ page.setAttribute("tabindex","-1"); page.focus(); page.scrollIntoView(); }
  return false;
}

/* ============ Rastrea tu donación ============ */
function escapeHtml(text){
  return String(text==null?"":text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
/* Mini-calculadora de impacto en la ficha de fundación (usa impactUnits reales) */
function fichaImpCalc(btn, fid){
  var out = document.getElementById("fimp-out"); if (!out) return;
  var cop = parseInt(btn && btn.dataset ? btn.dataset.cop : 20000, 10) || 20000;
  document.querySelectorAll(".fimp-q").forEach(function(b){ b.classList.toggle("on", b===btn); });
  loadPartners().then(function(list){
    var p=null; for (var i=0;i<list.length;i++){ if(list[i].id===fid){ p=list[i]; break; } }
    if (!p || !p.impactUnits || !p.impactUnits.length){ out.textContent=""; return; }
    var parts = [];
    for (var k=0;k<p.impactUnits.length;k++){
      var u=p.impactUnits[k], n=Math.floor(cop/u.cop);
      if (n<1) continue;
      var label = (n===1) ? (u[lang]||u.es) : (u[lang+"Pl"]||u.esPl||u.es);
      parts.push("<b>"+n+" "+escapeHtml(label)+"</b>");
    }
    var amount = "$"+cop.toLocaleString(lang==="en"?"en-US":"es-CO");
    out.innerHTML = parts.length
      ? t("ficha.imp.calc").replace("{a}","<b>"+amount+"</b>").replace("{x}",parts.join(" · "))
      : t("ficha.imp.min");
  });
}
var INVENTORY_DATA = null;
function loadInventory(){
  if (INVENTORY_DATA) return Promise.resolve(INVENTORY_DATA);
  return fetch("/data/inventario.json")
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){ INVENTORY_DATA = j; return j; })
    .catch(function(){ return null; });
}
/* Estados públicos y su orden en la línea de tiempo */
var TRACK_STEPS = ["recibida","en_distribucion","entregada"];
var TRACK_LABELS = {
  recibida:      {es:"Recibida", en:"Received"},
  en_distribucion:{es:"En distribución", en:"In distribution"},
  entregada:     {es:"Entregada", en:"Delivered"}
};
function normalizeGuide(s){
  return String(s||"").toUpperCase().replace(/\s+/g,"").trim();
}
function trackSearch(){
  var inp = document.getElementById("track-input");
  var box = document.getElementById("track-result");
  var ng  = document.getElementById("track-noguide-box");
  if (ng) ng.style.display = "none";
  var guide = normalizeGuide(inp && inp.value);
  if (!guide){ if(inp) inp.focus(); return; }
  box.style.display = "";
  box.innerHTML = '<p class="track-loading">'+t("track.loading")+'</p>';

  /* D1 PRIMERO y el libro después. El rastreo leía solo `inventario.json` —lo
     que escribe la automatización de Sheets— así que una donación hecha por el
     sitio, que vive en D1, no se encontraba. Y el recibo que le llega al donante
     le dice justamente que venga aquí con su guía. */
  fetch("/api/aporte/" + encodeURIComponent(guide))
    .then(function(r){ return r.ok ? r.json() : null; })
    .catch(function(){ return null; })
    .then(function(a){
      /* Solo manda D1 si el aporte llegó a un estado PÚBLICO. Una `intencion` es
         una guía que se emitió y nunca se pagó: mostrarla como «Recibida» sería
         falso, y además taparía la donación real que el libro sí tiene con ese
         mismo número — que es justo lo que pasaba mientras los dos numeradores
         se pisaban. */
      var publico = a && a.guia && PUBLICOS.indexOf(a.estado) >= 0;
      if (publico){
        box.innerHTML = trackRender(deAporte(a), "sitio");
        pintarEntregas("track-entregas", a.destino || "", true);
        return;
      }
      return loadInventory().then(function(inv){
        var d = null;
        if (inv && inv.donaciones){
          for (var i=0;i<inv.donaciones.length;i++){ if (normalizeGuide(inv.donaciones[i].guia)===guide){ d = inv.donaciones[i]; break; } }
        }
        if (d){ box.innerHTML = trackRender(d, "libro"); return; }
        /* Ni pública en D1 ni en el libro. Si D1 la conoce sin confirmar, se lo
           decimos: a alguien cuyo pago falló le sirve más saberlo que ver un
           «no existe». */
        if (a && a.guia){ box.innerHTML = trackSinConfirmar(a); return; }
        if (!inv || !inv.donaciones){ box.innerHTML = '<p class="track-error">'+t("track.err.load")+'</p>'; return; }
        box.innerHTML = trackNotFound(guide);
      });
    });
}

/* Estados del aporte que el donante puede ver como recorrido. El pago sin
   confirmar no es un paso: para el donante el recorrido empieza cuando el
   dinero entró de verdad. */
var PUBLICOS = ["aprobada", "en_distribucion", "entregada"];

/* Guía emitida cuyo pago nunca se confirmó. Pasa cuando el donante abandona la
   pasarela o el medio de pago la rechaza. */
function trackSinConfirmar(a){
  /* Una transferencia reportada no es un pago fallido: es un pago que estamos
     verificando contra el extracto. Decirle lo mismo a los dos sería confundir
     a quien sí transfirió. */
  var esReporte = a.estado === "reportada";
  return '<div class="track-card track-nf">'
    + '<h3>'+t(esReporte ? "track.rp.t" : "track.sc.t")+'</h3>'
    + '<p>'+t(esReporte ? "track.rp.p" : "track.sc.p").replace("{guia}", "<b>"+escapeHtml(a.guia)+"</b>")+'</p>'
    + '</div>';
}

/* Traduce un aporte de D1 a la forma que ya pinta trackRender. Los estados de
   pago que no son públicos —intencion, pendiente, rechazada— no se muestran
   como un paso del recorrido: para el donante, el recorrido empieza cuando el
   pago está confirmado. */
function deAporte(a){
  var mapa = { aprobada:"recibida", en_distribucion:"en_distribucion", entregada:"entregada" };
  return {
    guia: a.guia,
    fecha: (a.aprobada_en || a.creada_en || "").slice(0,10),
    tipo: "dinero",
    modo: a.modo === "dirigida" ? "dirigida" : "fondo",
    destino: a.destino || "",
    desc: a.proyecto || "",
    estado: mapa[a.estado] || "recibida",
    entrega: ""
  };
}
function trackNotFound(guide){
  return '<div class="track-card track-nf">'
    + '<h3>'+t("track.nf.t")+'</h3>'
    + '<p>'+t("track.nf.p").replace("{guia}", "<b>"+escapeHtml(guide)+"</b>")+'</p>'
    + '<button type="button" class="track-noguide" data-act="trackNoGuide()">'+t("track.noguide")+'</button>'
    + '</div>';
}
function trackRender(d, fuente){
  var estado = d.estado || "recibida";
  var idx = TRACK_STEPS.indexOf(estado);
  if (idx<0) idx = 0;
  var pasos = "";
  for (var i=0;i<TRACK_STEPS.length;i++){
    var s = TRACK_STEPS[i];
    var cls = i<idx ? "done" : (i===idx ? "current" : "pending");
    var lab = TRACK_LABELS[s][lang] || TRACK_LABELS[s].es;
    pasos += '<div class="tl-step '+cls+'">'
          +  '<span class="tl-dot" aria-hidden="true"></span>'
          +  '<span class="tl-label">'+lab+'</span></div>';
  }
  var tipo = (d.tipo==="especie") ? t("track.type.especie") : t("track.type.dinero");
  var modo = (d.modo==="dirigida") ? t("track.mode.dirigida") : t("track.mode.fondo");
  var desc = d.desc ? escapeHtml(d.desc) : "";
  var entrega = "";
  if (estado==="entregada" && d.entrega){
    entrega = '<div class="track-ev"><span class="track-ev-ic" aria-hidden="true">✓</span><div><b>'+t("track.delivered.t")+'</b><p>'+escapeHtml(d.entrega)+'</p></div></div>';
  }
  return '<div class="track-card">'
    + '<div class="track-head"><div><span class="track-guide">'+escapeHtml(d.guia)+'</span>'
    + '<span class="track-date">'+t("track.since")+' '+escapeHtml(d.fecha||"")+'</span></div>'
    + '<span class="track-badge track-badge-'+estado+'">'+(TRACK_LABELS[estado]?(TRACK_LABELS[estado][lang]||TRACK_LABELS[estado].es):estado)+'</span></div>'
    + '<div class="track-timeline">'+pasos+'</div>'
    + '<div class="track-meta"><span>'+tipo+'</span><span>·</span><span>'+modo+'</span>'+(desc?'<span>·</span><span>'+desc+'</span>':'')+'</div>'
    + entrega
    + '<p class="track-foot">'+t("track.foot")+'</p>'
    + (fuente ? '<p class="track-fuente">'+t(fuente==="sitio"?"track.fuente.sitio":"track.fuente.libro")+'</p>' : "")
    + '</div>'
    /* Las entregas del destino, no de este aporte: contribución, no
       atribución. Solo tiene sentido para lo que vive en D1, que es lo único
       que sabe a qué destino fue. */
    + (fuente === "sitio"
        ? '<div class="track-ev-box"><h3>'+t("track.ev.t")+'</h3>'
          + '<p class="mu">'+t("track.ev.p")+'</p>'
          + '<div class="ev-lista" id="track-entregas"></div></div>'
        : "");
}
function trackNoGuide(){
  var ng = document.getElementById("track-noguide-box");
  var box = document.getElementById("track-result");
  if (box) box.style.display = "none";
  if (ng){ ng.style.display = ""; ng.scrollIntoView({behavior:"smooth", block:"center"}); }
}
function trackNoGuideSend(){
  var email = (document.getElementById("track-ng-email").value||"").trim();
  var note = document.getElementById("track-ng-note");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
    note.style.display=""; note.style.color="var(--err,#c0392b)"; note.textContent = t("track.ng.invalid"); return;
  }
  // Puente humano: abre correo prellenado a contabilidad para que Sebas responda con la guía.
  var subject = encodeURIComponent(t("track.ng.mailsubj"));
  var body = encodeURIComponent(t("track.ng.mailbody").replace("{email}", email));
  window.location.href = "mailto:contabilidad@thegiveandgrowproject.org?subject="+subject+"&body="+body;
  note.style.display=""; note.style.color="var(--g)"; note.textContent = t("track.ng.sent");
}

/* ============ contadores en vivo (leen del inventario real) ============ */
function updateLiveStats(){
  loadInventory().then(function(inv){
    if (!inv) return;
    var don = (inv.donaciones||[]).length;
    var ent = (inv.donaciones||[]).filter(function(d){ return d.estado==="entregada"; }).length
            + (inv.entregas||[]).length;
    var elD = document.getElementById("ls-donaciones");
    var elE = document.getElementById("ls-entregas");
    if (elD){ elD.setAttribute("data-count", don); }
    if (elE){ elE.setAttribute("data-count", ent); }
    // Re-disparar la animación si la sección está visible
    try{ animateCounters(); }catch(e){}
  });
}

/* ============ ALMA contextual: chips según la página de origen ============ */
var almaFromRoute = "inicio";
var ALMA_CHIPS = {
  "default":     ["alma.chip1","alma.chip2","alma.chip3","alma.chip4"],
  "donar":       ["alma.c.donar1","alma.chip2","alma.c.track","alma.c.membresia"],
  "empresas":    ["alma.c.padrinazgo","alma.chip3","alma.c.rse","alma.chip2"],
  "membresias":  ["alma.c.membresia","alma.c.donar1","alma.chip2","alma.c.gratitud"],
  "hub":         ["alma.chip4","alma.c.hub1","alma.c.rutas","alma.chip1"],
  "fundaciones": ["alma.chip4","alma.c.hub1","alma.c.donar1","alma.chip1"],
  "gratitud":    ["alma.c.gratitud","alma.c.membresia","alma.chip3","alma.chip1"],
  "rastrea":     ["alma.c.track","alma.chip1","alma.c.donar1","alma.chip2"],
  "transparencia":["alma.c.evidencia","alma.chip1","alma.chip2","alma.chip4"]
};
function renderAlmaChips(){
  var box = document.getElementById("alma-chips");
  if (!box) return;
  var keys = ALMA_CHIPS[almaFromRoute] || ALMA_CHIPS["default"];
  box.innerHTML = keys.map(function(k){
    return '<button type="button" class="alma-chip" data-act="almaAsk(this.textContent)" data-i18n="'+k+'">'+t(k)+'</button>';
  }).join("");
}

/* ============ Formulario "Quiero ser aliado" ============ */
/* Postea a /api/inscripcion, como las otras tres puertas del sitio. Antes iba a
   un Apps Script que escribía una hoja de cálculo: la hoja no tenía columna para
   `sector`, `aporta` ni `instagram`, así que esos tres campos —los que arman la
   tarjeta de reciprocidad de #empresas— se enviaban y se perdían. */
function allyToggleGrat(){
  var on = document.getElementById("mod-gratitud").checked;
  document.getElementById("ally-gratbox").style.display = on ? "" : "none";
}
function allyToggleServ(){
  var on = document.getElementById("mod-servicios").checked;
  document.getElementById("ally-servbox").style.display = on ? "" : "none";
}
// Mapeo intake -> modalidad pública de la tarjeta (partners.json type:company):
//   modDonacion|modRse -> "padrinazgo" ; modServicios|modDifusion -> "alianza" ;
//   modVoluntariado -> "journey" ; modGratitud -> "gratitud".
// El form guarda las 6 (uso interno); al aprobar, se traduce a modalidad[] curada.
function allySubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("ally-note");
  var btn = document.getElementById("ally-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  // Honeypot: si el campo trampa viene lleno, es un bot. Fingimos éxito y no enviamos.
  if (val("ally-website2")){
    document.getElementById("ally-form").reset(); allyToggleGrat(); allyToggleServ();
    return allyMsg(note, t("ally.ok"), true);
  }
  // Al menos una forma de apoyar
  var anyMod = chk("mod-donacion")||chk("mod-rse")||chk("mod-gratitud")||chk("mod-servicios")||chk("mod-voluntariado")||chk("mod-difusion");
  if (!anyMod) return allyMsg(note, t("ally.err.mod"), false);
  // Condicionales: la modalidad marcada exige su detalle
  if (chk("mod-gratitud") && !val("ally-ben")) return allyMsg(note, t("ally.err.ben"), false);
  if (chk("mod-servicios") && !val("ally-servdet")) return allyMsg(note, t("ally.err.serv"), false);
  // Autorizaciones (Ley 1581 + licitud + uso de marca)
  if (!chk("aut-marca") || !chk("aut-datos") || !chk("aut-licitud")){
    return allyMsg(note, t("ally.err.aut"), false);
  }
  var payload = {
    razon:val("ally-razon"), nit:val("ally-nit"), representante:val("ally-rep"), cedula:val("ally-cedula"),
    contacto:val("ally-contacto"), correo:val("ally-correo"), telefono:val("ally-tel"),
    ciudad:val("ally-ciudad"), sector:val("ally-sector"), direccion:val("ally-dir"),
    web:val("ally-web"), instagram:val("ally-instagram"), descripcion:val("ally-desc"), aporta:val("ally-aporta"),
    modDonacion:chk("mod-donacion"), modRse:chk("mod-rse"), modGratitud:chk("mod-gratitud"),
    modServicios:chk("mod-servicios"), modVoluntariado:chk("mod-voluntariado"), modDifusion:chk("mod-difusion"),
    benBeneficio:val("ally-ben"), benNivel:val("ally-nivel"), benCondiciones:val("ally-cond"), benRedime:val("ally-redime"),
    servDetalle:val("ally-servdet"),
    autMarca:chk("aut-marca"), autDatos:chk("aut-datos"), autLicitud:chk("aut-licitud"),
    tipo:"empresa", idioma: lang === "en" ? "en" : "es"
  };
  btn.disabled = true;
  allyMsg(note, t("ally.sending"), true);
  fetch("/api/inscripcion", {
    method:"POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function(r){ if (!r.ok) throw new Error("http_"+r.status); return r.json(); })
    .then(function(){
      document.getElementById("ally-form").reset();
      allyToggleGrat(); allyToggleServ();
      btn.disabled = false;
      allyMsg(note, t("ally.ok"), true);
    })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("ally.err.send"), false); });
  return false;
}

/* ---------- aplicación de fundaciones al HUB ----------
   El botón «Quiero aplicar» sacaba del sitio a un Google Form de 20–30 minutos
   con cargas de archivo. Este formulario pide solo lo que es texto: es lo que
   hace falta para el paso 2 del proceso publicado, «Revisamos». El logo, las
   fotos y el costo con soporte se piden después de la visita de contexto, con
   el cuestionario largo — y así el sitio deja de contradecirse cuando promete
   «Toma 10–15 minutos». */
function fundSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("ff-note");
  var btn = document.getElementById("ff-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  if (val("ff-web2")){ document.getElementById("ff").reset(); return allyMsg(note, t("ff.ok"), true); }

  var pers = document.querySelector('input[name="ff-pers"]:checked');
  var pob = [].slice.call(document.querySelectorAll('input[name="ff-pob"]:checked'))
    .map(function(e){ return e.value; });

  if (!val("ff-nombre")) return allyMsg(note, t("ff.err.nombre"), false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("ff-email"))) return allyMsg(note, t("ff.err.email"), false);
  if (!val("ff-lider")) return allyMsg(note, t("ff.err.lider"), false);
  if (!pers) return allyMsg(note, t("ff.err.pers"), false);
  if (!val("ff-zona")) return allyMsg(note, t("ff.err.zona"), false);
  if (!val("ff-historia")) return allyMsg(note, t("ff.err.historia"), false);
  if (!val("ff-mision")) return allyMsg(note, t("ff.err.mision"), false);
  if (!pob.length) return allyMsg(note, t("ff.err.pob"), false);
  if (!val("ff-atiende")) return allyMsg(note, t("ff.err.atiende"), false);
  if (!chk("ff-datos")) return allyMsg(note, t("ff.err.datos"), false);
  if (!chk("ff-veraz")) return allyMsg(note, t("ff.err.veraz"), false);

  btn.disabled = true;
  allyMsg(note, t("ff.sending"), true);

  fetch("/api/inscripcion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "fundacion",
      nombre: val("ff-nombre"), sigla: val("ff-sigla"),
      lider: val("ff-lider"), cargo: val("ff-cargo"), anio: val("ff-anio"),
      personeria: pers.value, zona: val("ff-zona"), ciudad: val("ff-ciudad"),
      email: val("ff-email"), telefono: val("ff-tel"),
      historia: val("ff-historia"), mision: val("ff-mision"),
      poblacion: pob, poblacion_otra: val("ff-pob-otra"),
      atiende: val("ff-atiende"), conteo: val("ff-conteo"),
      programa: val("ff-prog"), programa_desc: val("ff-prog-desc"), evidencia: val("ff-evid"),
      web: val("ff-web"), instagram: val("ff-instagram"),
      autoriza_datos: true, declara_veraz: true,
      idioma: lang === "en" ? "en" : "es"
    })
  }).then(function(r){ if (!r.ok) throw new Error("http_"+r.status); return r.json(); })
    .then(function(){
      document.getElementById("ff").reset(); fundPobOtra();
      btn.disabled = false;
      allyMsg(note, t("ff.ok"), true);
    })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("ff.err.send"), false); });
  return false;
}

/* «Quiero aplicar» vive en la última banda de #fundaciones y el formulario está
   justo debajo, pero `go()` termina con un scrollTo(0,0): sin esto el botón
   devolvería al aplicante al tope de una página de cinco secciones. Un ancla
   nativa tampoco sirve — el hash `#fund-form` no es una ruta y el enrutador lo
   resolvería como 404. Así que se navega y después se baja. */
function irAFormFund(){
  if (currentRoute !== "fundaciones") go("fundaciones");
  var s = document.getElementById("fund-form");
  if (!s) return;
  var suave = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  s.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  var primero = document.getElementById("ff-nombre");
  if (primero) setTimeout(function(){ primero.focus({ preventScroll: true }); }, suave ? 500 : 0);
}

/* «Otra» población abre su campo. Mismo patrón que las condicionales del
   formulario de aliados: el detalle aparece cuando se necesita, no antes. */
function fundPobOtra(){
  var on = document.getElementById("ff-pob-otra-chk");
  var box = document.getElementById("ff-pob-otra-box");
  if (box) box.style.display = (on && on.checked) ? "" : "none";
}
function fundOtra(){ setTimeout(fundPobOtra, 0); }
/* ---------- formulario de voluntariado ----------
   El aviso de terreno aparece según el nivel elegido, no al final: quien va a
   pisar territorio debe saber ANTES de enviar que hay dos verificaciones y una
   sesión de Marco. Enterarse después se sentiría como un filtro escondido, que
   es justo lo que el programa no es. */
function volNivel(){
  var n = document.querySelector('input[name="vf-nivel"]:checked');
  var aviso = document.getElementById("vf-terreno");
  if (!aviso) return;
  var pisa = n && (n.value === "hub" || n.value === "mixto");
  aviso.style.display = pisa ? "" : "none";
}

/* Ofrecimiento en especie. Mismo patrón que volSubmit: honeypot con éxito
   aparente, validación en el cliente para no hacer viajar lo obviamente
   incompleto, y la de verdad en el Worker. */
/* Reportar una transferencia. El donante se autorreporta y recibe guía al
   instante; el dinero lo confirma una persona después, contra el extracto. Por
   eso el mensaje de éxito dice «todavía no está confirmado» sin rodeos. */
var REP_TOKEN = null, REP_GUIA = null;

function repSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("rep-note");
  var btn = document.getElementById("rep-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  if (val("rep-web2")){ document.getElementById("rep").reset(); return allyMsg(note, t("rep.ok.t"), true); }

  var monto = Math.round(Number(val("rep-monto")) || 0);
  if (!(monto >= 5000 && monto <= 20000000)) return allyMsg(note, t("rep.err.monto"), false);
  if (!val("rep-fecha")) return allyMsg(note, t("rep.err.fecha"), false);
  if (!val("rep-nombre")) return allyMsg(note, t("rep.err.nombre"), false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("rep-email"))) return allyMsg(note, t("rep.err.email"), false);
  if (!chk("rep-datos")) return allyMsg(note, t("rep.err.datos"), false);

  var brigada = val("rep-dest") === "brigada";
  btn.disabled = true;
  allyMsg(note, t("rep.sending"), true);

  fetch("/api/transferencia", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      monto: monto,
      fecha: val("rep-fecha"),
      referencia: val("rep-ref"),
      modo: brigada ? "dirigida" : "fondo",
      destino: brigada ? BRIGADA.destino : null,
      proyecto: brigada ? t("brigada.opcion") : null,
      nombre: val("rep-nombre"),
      email: val("rep-email"),
      certificado: chk("rep-cert"),
      autoriza_datos: true,
      idioma: lang
    })
  }).then(function(r){ return r.ok ? r.json() : r.json().then(function(j){ throw new Error(j.error||"http"); }); })
    .then(function(d){
      REP_GUIA = d.guia; REP_TOKEN = d.token;
      document.getElementById("rep").style.display = "none";
      setText("rep-guia", d.guia);
      document.getElementById("rep-ok").style.display = "";
      note.textContent = "";
    })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("rep.err"), false); });
}

/* La subida va después de tener guía y token: sin eso sería una carga pública
   abierta contra el bucket. */
document.addEventListener("change", function(e){
  if (!e.target || e.target.id !== "rep-file") return;
  var f = e.target.files && e.target.files[0];
  var note = document.getElementById("rep-file-note");
  if (!f || !REP_GUIA || !REP_TOKEN) return;
  allyMsg(note, t("rep.sending"), true);
  fetch("/api/comprobante/" + encodeURIComponent(REP_GUIA) + "?t=" + encodeURIComponent(REP_TOKEN), {
    method: "POST", headers: { "content-type": f.type }, body: f
  }).then(function(r){ return r.json(); })
    .then(function(d){ allyMsg(note, d.error ? t("rep.sube.err") : t("rep.sube.ok"), !d.error); })
    .catch(function(){ allyMsg(note, t("rep.sube.err"), false); });
});

function ofSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("of-note");
  var btn = document.getElementById("of-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };

  if (val("of-web2")){ document.getElementById("of").reset(); return allyMsg(note, t("of.ok"), true); }

  if (!val("of-cat")) return allyMsg(note, t("of.err.cat"), false);
  if (!val("of-detalle")) return allyMsg(note, t("of.err.detalle"), false);
  if (!val("of-nombre")) return allyMsg(note, t("of.err.nombre"), false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("of-email"))) return allyMsg(note, t("of.err.email"), false);
  var ok = document.getElementById("of-datos");
  if (!ok || !ok.checked) return allyMsg(note, t("of.err.datos"), false);

  var quienEl = document.querySelector('input[name="of-quien"]:checked');
  btn.disabled = true;
  allyMsg(note, t("of.sending"), true);

  fetch("/api/inscripcion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "especie",
      campana: BRIGADA.destino,
      categoria: val("of-cat"),
      detalle: val("of-detalle"),
      cantidad: val("of-cantidad"),
      disponible: val("of-disp"),
      quien: quienEl ? quienEl.value : "persona",
      nombre: val("of-nombre"),
      email: val("of-email"),
      telefono: val("of-tel"),
      ciudad: val("of-ciudad"),
      autoriza_datos: true,
      idioma: lang
    })
  }).then(function(r){ return r.ok ? r.json() : r.json().then(function(j){ throw new Error(j.error||"http"); }); })
    .then(function(){ document.getElementById("of").reset(); btn.disabled = false; allyMsg(note, t("of.ok"), true); })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("of.err"), false); });
}

/* De la brigada al formulario de voluntariado, sin perder de dónde viene.
   Antes el botón «Ofrecer mi tiempo» llevaba a #voluntariado y ahí se perdía el
   contexto: la inscripción llegaba igual que cualquier otra y nadie podía saber
   si era para el acopio de la brigada o para el programa de todo el año.
   Preselecciona «estructura» porque es lo único que se puede ofrecer a tiempo
   —terreno exige doble verificación y sesión de Marco—, y deja el aviso visible
   para que el cambio no sea invisible ni irreversible. */
var VOL_ORIGEN = null;
function irAVoluntariadoBrigada(){
  VOL_ORIGEN = BRIGADA_DESTINO;
  if (currentRoute !== "voluntariado") go("voluntariado");
  var est = document.querySelector('input[name="vf-nivel"][value="estructura"]');
  if (est){ est.checked = true; volNivel(); }
  var aviso = document.getElementById("vf-origen");
  if (aviso) aviso.style.display = "";
  var s = document.getElementById("vol-form");
  if (!s) return;
  var suave = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  s.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  var primero = document.getElementById("vf-nombre");
  if (primero) setTimeout(function(){ primero.focus({ preventScroll: true }); }, suave ? 500 : 0);
}

function volSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("vf-note");
  var btn = document.getElementById("vf-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  /* Honeypot: éxito aparente, cero envío. No se le enseña al bot qué lo delató. */
  if (val("vf-web2")){ document.getElementById("vf").reset(); volNivel(); return allyMsg(note, t("vf.ok"), true); }

  var nivelEl = document.querySelector('input[name="vf-nivel"]:checked');
  if (!val("vf-nombre")) return allyMsg(note, t("vf.err.nombre"), false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("vf-email"))) return allyMsg(note, t("vf.err.email"), false);
  if (!nivelEl) return allyMsg(note, t("vf.err.nivel"), false);
  if (!val("vf-oficio")) return allyMsg(note, t("vf.err.oficio"), false);
  if (!chk("vf-datos")) return allyMsg(note, t("vf.err.datos"), false);

  btn.disabled = true;
  allyMsg(note, t("vf.sending"), true);

  fetch("/api/inscripcion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "voluntario",
      nombre: val("vf-nombre"),
      email: val("vf-email"),
      telefono: val("vf-tel"),
      ciudad: val("vf-ciudad"),
      nivel: nivelEl.value,
      oficio: val("vf-oficio"),
      disponibilidad: val("vf-disp"),
      mensaje: val("vf-msg"),
      captura: chk("vf-captura"),
      origen: VOL_ORIGEN || "",
      autoriza_datos: true,
      web2: val("vf-web2"),
      idioma: (typeof lang !== "undefined" && lang === "en") ? "en" : "es"
    })
  }).then(function(r){ if (!r.ok) throw new Error("http_"+r.status); return r.json(); })
    .then(function(){
      document.getElementById("vf").reset(); volNivel();
      /* Se limpia el origen: si la misma persona vuelve a inscribir a alguien
         más desde otra ruta, esa inscripción no debe heredar la brigada. */
      VOL_ORIGEN = null;
      var av = document.getElementById("vf-origen"); if (av) av.style.display = "none";
      btn.disabled = false;
      allyMsg(note, t("vf.ok"), true);
    })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("vf.err.send"), false); });
  return false;
}

function allyMsg(el, msg, ok){
  el.style.display = ""; el.textContent = msg;
  el.style.color = ok ? "var(--g)" : "var(--err,#c0392b)";
  return false;
}

/* ============ Programa de Gratitud: comercios aliados ============ */
var GRATITUD_DATA = null;
function loadGratitud(){
  if (GRATITUD_DATA) return Promise.resolve(GRATITUD_DATA);
  return fetch("/data/gratitud.json")
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){ GRATITUD_DATA = j; return j; })
    .catch(function(){ return null; });
}
function renderGratitudComercios(){
  var grid = document.getElementById("grat-grid");
  var empty = document.getElementById("grat-empty");
  if (!grid) return;
  loadGratitud().then(function(data){
    // Solo comercios con convenio firmado (status "activa")
    var activos = (data && data.comercios || []).filter(function(c){ return c.status === "activa"; });
    if (!activos.length){
      grid.innerHTML = "";
      if (empty) empty.style.display = "";
      return;
    }
    if (empty) empty.style.display = "none";
    var cats = (data && data.categorias) || {};
    grid.innerHTML = activos.map(function(c){
      var catLabel = cats[c.categoria] ? (cats[c.categoria][lang] || cats[c.categoria].es) : "";
      var ben = c.beneficio ? (c.beneficio[lang] || c.beneficio.es || "") : "";
      var cond = c.condiciones ? (c.condiciones[lang] || c.condiciones.es || "") : "";
      var redime = c.redime ? (c.redime[lang] || c.redime.es || "") : "";
      var showLogo = c.logo && c.consent && c.consent.logo;
      var head = showLogo
        ? '<img class="grat-logo" src="'+escapeHtml(c.logo)+'" alt="'+escapeHtml(c.name)+'" loading="lazy">'
        : '<div class="grat-logo grat-logo-ph" aria-hidden="true">'+escapeHtml((c.name||"?").charAt(0))+'</div>';
      var link = c.instagram || c.web || "";
      var nameHtml = link
        ? '<a href="'+escapeHtml(link)+'" target="_blank" rel="noopener">'+escapeHtml(c.name)+'</a>'
        : escapeHtml(c.name);
      return '<a class="grat-card grat-card-link" href="#comercio/'+escapeHtml(c.id)+'">'
        + '<div class="grat-card-head">'+head
        + '<div><h3>'+escapeHtml(c.name)+'</h3>'
        + '<span class="grat-cat">'+escapeHtml(catLabel)+(c.ciudad?' · '+escapeHtml(c.ciudad):'')+'</span></div></div>'
        + (ben ? '<p class="grat-benefit">'+escapeHtml(ben)+'</p>' : '')
        + '<dl class="grat-meta">'
        + (c.nivelDesde ? '<div><dt>'+t("grat.card.nivel")+'</dt><dd>'+escapeHtml(c.nivelDesde)+'</dd></div>' : '')
        + (redime ? '<div><dt>'+t("grat.card.redime")+'</dt><dd>'+escapeHtml(redime)+'</dd></div>' : '')
        + '</dl>'
        + '<span class="grat-card-more">'+t("grat.card.more")+' &rarr;</span>'
        + '</a>';
    }).join("");
  });
}

/* ============ Ficha de comercio aliado (informativa) ============ */
function renderComercio(cid){
  var el = document.getElementById("comercio-body"); if (!el) return;
  loadGratitud().then(function(data){
    var c = null;
    var comercios = (data && data.comercios) || [];
    for (var i=0;i<comercios.length;i++){ if (comercios[i].id === cid && comercios[i].status === "activa"){ c = comercios[i]; break; } }
    if (!c){ go("gratitud"); return; }
    var cats = (data && data.categorias) || {};
    var pick = function(o){ return o ? (o[lang]||o.es||"") : ""; };
    var catLabel = cats[c.categoria] ? pick(cats[c.categoria]) : "";
    var about = pick(c.about), ben = pick(c.beneficio), cond = pick(c.condiciones), redime = pick(c.redime);
    var showLogo = c.logo && c.consent && c.consent.logo;

    var html = '<a class="card-link" href="#gratitud">&larr; '+t("com.back")+'</a>'
      + '<div class="ficha-head">'
      + (showLogo ? '<img class="ficha-logo ficha-logo-light" src="'+escapeHtml(c.logo)+'" alt="'+escapeHtml(c.name)+'">' : '')
      + '<div><h1 class="ficha-name">'+escapeHtml(c.name)+'</h1>'
      + '<div class="eco-row" style="margin-top:12px">'
      + (catLabel ? '<span class="eco-chip">'+escapeHtml(catLabel)+'</span>' : '')
      + (c.ciudad ? '<span class="eco-chip">'+escapeHtml(c.ciudad)+'</span>' : '')
      + '<span class="eco-chip">'+t("com.aliado")+'</span>'
      + '</div></div></div>';

    if (c.direccion) html += '<p class="com-address">'+escapeHtml(c.direccion)
      + ' · <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.direccion+", Colombia")+'" target="_blank" rel="noopener">'+t("com.maps")+'</a></p>';

    if (about) html += '<p class="lead" style="margin-top:22px;max-width:70ch">'+escapeHtml(about)+'</p>';

    /* Beneficio para miembros — cupón institucional (elemento firma de la ficha) */
    html += '<div class="benefit-coupon"><div class="bc-main">'
      + '<span class="bc-eyebrow">'+t("com.benefit.t")+'</span>'
      + (ben ? '<p class="bc-benefit">'+escapeHtml(ben)+'</p>' : '')
      + (c.nivelDesde ? '<span class="bc-level">'+t("grat.card.nivel")+' · '+escapeHtml(c.nivelDesde)+'</span>' : '')
      + '</div>';
    if (redime || cond){
      html += '<div class="bc-perf" aria-hidden="true"></div><dl class="bc-terms">'
        + (redime ? '<div><dt>'+t("grat.card.redime")+'</dt><dd>'+escapeHtml(redime)+'</dd></div>' : '')
        + (cond ? '<div><dt>'+t("grat.card.cond")+'</dt><dd>'+escapeHtml(cond)+'</dd></div>' : '')
        + '</dl>';
    }
    html += '</div>';

    /* Galería (solo con consentimiento explícito de fotos) */
    var gal = (c.consent && c.consent.photos && c.gallery && c.gallery.length) ? c.gallery : null;
    if (gal){
      html += '<h3 style="margin-top:34px">'+t("com.gal.t")+'</h3><div class="gal-strip" role="list">';
      for (var gi=0; gi<gal.length; gi++){
        var ph = gal[gi], alt = pick(ph.alt);
        html += '<button type="button" class="gal-item" role="listitem" aria-label="'+t("ficha.gal.open")+'" data-act="openComercioLb(\''+escapeHtml(c.id)+'\','+gi+')">'
              + '<img src="'+escapeHtml(ph.src)+'" alt="'+escapeHtml(alt)+'" loading="lazy"></button>';
      }
      html += '</div>';
    }

    /* Redes y compartir */
    html += '<div class="eco-row" style="margin-top:30px">'
      + (c.web ? '<a class="card-link" href="'+escapeHtml(c.web)+'" target="_blank" rel="noopener">'+t("ficha.web")+'</a>' : '')
      + (c.instagram ? '<a class="card-link" style="margin-left:18px" href="'+escapeHtml(c.instagram)+'" target="_blank" rel="noopener">Instagram</a>' : '')
      + '</div>';

    /* CTA: hacerse miembro (NO donar; la empresa ofrece, el miembro disfruta) */
    html += '<div class="cta-box" style="margin-top:36px"><h2>'+t("com.cta.t")+'</h2><p class="mu">'+t("com.cta.p")+'</p>'
      + '<a class="ficha-cta-btn" href="#membresias">'+t("com.cta.btn")+'</a></div>';

    el.innerHTML = html;
  });
}
/* Lightbox de galería de comercio (reutiliza el LB nativo de fundaciones) */
function openComercioLb(cid, ix){
  loadGratitud().then(function(data){
    var comercios = (data && data.comercios) || [];
    var c = null;
    for (var i=0;i<comercios.length;i++){ if (comercios[i].id === cid){ c = comercios[i]; break; } }
    if (!c || !c.gallery || !c.gallery.length) return;
    LB.list = c.gallery; LB.ix = ix || 0;
    var d = ensureLightbox();
    paintLightbox();
    if (!d.open) d.showModal();
  });
}

/* Ir a Gratitud y desplazarse a la sección de comercios aliados */
function goComercios(){
  go("gratitud");
  setTimeout(function(){
    var sec = document.getElementById("grat-comercios-sec");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
  return false;
}
