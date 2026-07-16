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
    "origen.p2":"Esa pregunta se volvió método. Give&Grow International nace de casi cuatro años de experiencia de campo de Juan Sebastián Navarro Osorio en La Guajira, la Sierra Nevada y las comunas de Medellín, y se constituye el 19 de mayo de 2025 en Medellín como Entidad Sin Ánimo de Lucro (ESAL) bajo el Régimen Tributario Especial. El propósito: restaurar la confianza en el acto de dar, con trazabilidad y sin intermediarios opacos.",
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
    "ally.f.web":"Sitio web o Instagram",
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
    "ally.m.vol.p":"Tus colaboradores participan en las actividades.",
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
    "ally.err.send":"No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos a contabilidad@thegiveandgrowproject.org.",
    "ally.err.config":"El formulario aún se está configurando. Escríbenos a contabilidad@thegiveandgrowproject.org.",
    "track.ey":"Trazabilidad real",
    "track.t":"Rastrea tu donación",
    "track.lead":"Cada donación tiene un número de guía único. Escríbelo y sigue su recorrido, de principio a fin.",
    "track.ph":"GG-2026-000001",
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
    "hub.routes.ey":"Cómo operamos",
    "hub.t":"Cinco rutas. Un solo propósito.",
    "hub.lead":"El centro operativo donde alianzas, donaciones e impacto se encuentran.",
    "hub.r1.t":"R1 - Alianzas con Fundaciones",
    "hub.r1.p":"Fortalecemos a fundaciones verificadas con logística y visibilidad, sin reemplazar su labor. Ejemplo real: Fundación Niños del Futuro, en Manrique (Medellín), con Chefs del Futuro y Borboletas.",
    "hub.r2.t":"R2 - Gestión de Donaciones",
    "hub.r2.p":"Donaciones en especie y monetarias con trazabilidad completa: acta, foto y reporte. Ejemplo real: en NDF un plato de comida cuesta $4.000 y tu aporte se traduce en platos entregados, con evidencia.",
    "hub.r3.t":"R3 - Social Grow",
    "hub.r3.p":"Formación y fortalecimiento de capacidades para las fundaciones aliadas. Próximamente. Ejemplo: talleres de educación financiera para madres comunitarias de La Honda.",
    "hub.r4.t":"R4 - Impact Journey",
    "hub.r4.p":"Experiencias que llevan a donantes y equipos aliados al campo, con comunidades reales y un reporte de impacto. Se activa en 2026.",
    "hub.r5.t":"R5 - Conexión Laboral",
    "hub.r5.p":"Puente hacia el empleo para poblaciones vulnerables. Fase futura. Ejemplo: acompañamiento de 12 a 18 meses a una persona saliendo de reclusión, conectada con formación (R3) y empleo (R4).",
    "hub.pob.t":"Las poblaciones que queremos alcanzar",
    "hub.pob.note":"Nuestra misión apunta a impactar todo tipo de población vulnerable a través de las fundaciones que se suman al HUB. Estas son las que hoy guían nuestro objeto social; la cobertura real crece con cada aliada que entra con trabajo y evidencia.",
    "hub.pob.list":"Niñez en riesgo - Comunidades indígenas - Comunidades campesinas - Personas en situación de calle - Adultos mayores - Animales en maltrato - Personas en rehabilitación - Personas privadas de la libertad",
    "emp.ey":"RSE empresarial",
    "emp.t":"Tu empresa, con propósito y trazabilidad.",
    "emp.lead":"Tres formas de aliarte. Cada una con beneficio tributario y reporte verificable.",
    "emp.p1.t":"Padrinazgo de Impacto",
    "emp.p1.p":"Defines un presupuesto y, con la Calculadora de Impacto, lo traduces en unidades reales y verificables. Recibes certificado de donación y reporte de impacto con evidencia.",
    "emp.p2.t":"Impact Journey",
    "emp.p2.p":"Voluntariado corporativo en doble vía (Ruta 4, ya operativa): tu equipo vive la realidad de las comunidades que apoya. Una jornada con propósito, no de marketing.",
    "emp.p3.t":"Alianza a medida",
    "emp.p3.p":"Un canal abierto para co-crear juntos programas, campañas o formas de cooperación ajustadas a la realidad de tu empresa.",
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
    "alma.ey":"Asistente IA",
    "alma.t":"Conversa con ALMA.",
    "alma.lead":"ALMA (Asistente de Labor Misional y Alianzas) responde tus dudas sobre donaciones, alianzas y el HUB SOCIAL.",
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
    "a11y.skip":"Saltar al contenido",
    "alma.send":"Enviar",
    "alma.hello":"Hola, soy ALMA. Puedo contarte cómo donar, los beneficios tributarios, las membresías o cómo aplica tu fundación al Hub. ¿En qué te ayudo?",
    "donar.ey":"Donar",
    "donar.t":"Tu donación, con destino claro.",
    "donar.lead":"Calcula tu impacto y tu beneficio tributario, luego elige cómo aportar.",
    "calc.tab.ind":"Persona",
    "calc.tab.emp":"Empresa",
    "calc.tax":"Beneficio tributario (25%)",
    "calc.tax.legal":"El descuento del 25% (Art. 257 ET) aplica según los términos, requisitos y límites que contempla la ley; su procedencia depende de la situación tributaria de cada donante.",
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
    "faq.a2":"Es una red de empresas aliadas que ofrecen descuentos exclusivos a todos los miembros activos, desde el nivel Retoño. Las empresas ganan visibilidad como negocios con propósito y los miembros acceden a beneficios en comercios aliados a medida que se suman.",
    "faq.q3":"¿Cómo funciona el beneficio tributario?",
    "faq.a3":"Por cada donación realizada a través del sistema financiero accedes a un descuento del 25% sobre el impuesto de renta a cargo (Art. 257 ET). Por ejemplo, $4.000.000 COP donados equivalen a $1.000.000 COP menos en tu impuesto.",
    "faq.q4":"¿Puedo ser voluntario?",
    "faq.a4":"Aceptamos voluntariado de habilidades profesionales: médicos, odontólogos, abogados, contadores, desarrolladores, docentes y más. Escríbenos a sebas@thegiveandgrowproject.org o por WhatsApp al +57 315 330 5028 indicando tu área y disponibilidad.",
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
    "map.sum":"Hoy la red reúne {f} fundaciones, {c} comercio(s) aliado(s) y {h} HUB. Crece una alianza a la vez.",
    "map.biz":"Ver beneficio",
    "com.maps":"Cómo llegar",
    "map.area.med":"Medellín · centro operativo",
    "net.ey":"La red",
    "nav.g.nosotros":"Nosotros","nav.cta":"Donar","nav.faq":"FAQ",
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
    "net.t":"Quiénes forman la red hoy.",
    "net.p":"Cada punto del mapa, con nombre propio. Aquí solo aparecen vínculos confirmados: la red crece con evidencia.",
    "net.next":"Tu fundación o empresa puede ser el siguiente punto en el mapa.",
    "net.type.foundation":"Fundación aliada",
    "net.type.company":"Empresa aliada",
    "net.type.hub":"Centro operativo",
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
    "pay.how.p":"Tu seguridad primero. Así puedes aportar hoy, y así funcionará el pago automático cuando habilitemos Wompi.",
    "pay.how.s1.t":"Elige tu nivel y monto",
    "pay.how.s1.p":"Usa la calculadora para ver tu aporte, tu beneficio tributario y tu nivel. Puedes elegir mensual, anual o único.",
    "pay.how.s2.t":"Paga por un canal seguro",
    "pay.how.s2.p":"Hoy: transferencia a la cuenta Bancolombia y envías el comprobante. Próximamente: tarjeta, PSE o Nequi con débito automático vía Wompi, la pasarela de Bancolombia.",
    "pay.how.s3.t":"Recibe tu certificado y credencial",
    "pay.how.s3.p":"En máximo 24 horas recibes tu certificado de donación (Art. 257 ET) y tu credencial de miembro.",
    "pay.how.sec.t":"Consejos de seguridad",
    "pay.how.sec.p":"Nunca compartas tus claves con nadie y verifica que la página tenga candado (https). Give&Grow no pide contraseñas por WhatsApp ni correo. Puedes pausar o cancelar tu débito cuando quieras.",
    "faq.a6":"El HUB SOCIAL no es solo un canal para donar: es un centro operativo con cinco rutas que conectan alianzas, donaciones e impacto medible. Tres cosas nos diferencian. Primero, trazabilidad total: cada aporte tiene confirmación en 24 horas, certificado tributario, acta de entrega y reporte fotográfico mensual. Segundo, evidencia, no promesas: somos una fundación joven y transparente que muestra lo que puede probar, sin cifras infladas, y trabajamos con fundaciones aliadas verificadas en territorio. Tercero, reciprocidad: quien da también crece — los miembros acceden a los beneficios del Programa de Gratitud y las empresas ganan visibilidad como negocios con propósito. Es lo que resume nuestro lema: «Dar para crecer, crecer para dar más».",
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
    "emp.grat.btn2":"Ver comercios aliados",
    "grat.you.ey":"Para todos",
    "grat.you.t":"Dos caras de la misma gratitud.",
    "grat.you.mem.t":"Si eres miembro",
    "grat.you.mem.p":"Con tu credencial digital accedes a beneficios en comercios aliados, desde el nivel Retoño.",
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
  membresias:{t:{es:"Membresías · Give&Grow International",en:"Memberships · Give&Grow International"},d:{es:"Hazte miembro de Give&Grow: dona de forma recurrente, crece de Semilla a Bosque y suma beneficios en cada nivel.",en:"Become a Give&Grow member: give monthly, grow from Seed to Forest and add benefits at each tier."}},
  faq:{t:{es:"Preguntas frecuentes · Give&Grow International",en:"FAQ · Give&Grow International"},d:{es:"Respuestas a las preguntas más comunes sobre donaciones, beneficios tributarios, alianzas y el modelo de Give&Grow.",en:"Answers to common questions about donations, tax benefits, partnerships and the Give&Grow model."}}
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

function renderPobChips(){
  var el=document.getElementById("hub-pob"); if(!el) return;
  var items=(t("hub.pob.list")||"").split(" - ");
  el.innerHTML = items.map(function(x){ return '<span class="eco-chip">'+x.trim().replace(/</g,"&lt;")+'</span>'; }).join("");
}
function postLang(l){
  applyLang(l); renderWall(); renderHeroImpact(); renderAliadas();
  try{ buildProjectSelect(); calcUpdate(); }catch(e){}
  if (currentRoute.indexOf("fundacion/")===0) renderFicha(currentRoute.split("/")[1]);
  if (currentRoute.indexOf("comercio/")===0) renderComercio(currentRoute.split("/")[1]);
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
    if (vt){ document.startViewTransition(function(){ postLang(l); }); }
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
  if (id==="alma" && currentRoute!=="alma") almaFromRoute = currentRoute;
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
  if (!target){ id = "e404"; target = document.getElementById("page-e404"); }
  if (!target){ id = "inicio"; target = document.getElementById("page-inicio"); }
  target.classList.add("active");
  currentRoute = id;
  if (location.hash !== "#"+id) history[fromPop ? "replaceState" : "pushState"](null,"","#"+id);
  applyRouteMeta(id);
  renderJourney(id);
  window.scrollTo(0,0);
  closeDrawer();
  initReveal();
  animateCounters();
  if (id==="inicio") updateLiveStats();
  if (id==="alma") renderAlmaChips();
  if (id==="gratitud") renderGratitudComercios();
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
  }
  // "Donde más se necesite" (fondo): usa la primera unidad como equivalencia de referencia.
  return IMPACT_UNITS[0];
}
function setImpactUnit(id){ calc.projectId = id; calcUpdate(); }

/* Construye el selector fundación → proyecto a partir de partners.json.
   Cada <option> lleva el id de la unidad de impacto (o 'general' para el fondo). */
function buildProjectSelect(){
  var sel = document.getElementById("calc-project");
  if (!sel) return;
  var partners = (PARTNERS_DATA || PARTNERS_FALLBACK).filter(function(p){ return p.type==="foundation" && p.impactUnits && p.impactUnits.length; });
  var html = '<option value="general" data-partner="">'+(lang==="en"?"Where it's needed most (general fund)":"Donde más se necesite (fondo general)")+'</option>';
  for (var i=0;i<partners.length;i++){
    var p = partners[i];
    html += '<optgroup label="'+p.name+'">';
    for (var k=0;k<p.impactUnits.length;k++){
      var u = p.impactUnits[k];
      var label = u.project ? u.project : (u[lang]||u.es);
      html += '<option value="'+u.id+'" data-partner="'+p.id+'">'+label+'</option>';
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
  calcUpdate();
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
        iout.textContent = "\u2248 "+n+" "+uLabel; irow.style.display="";
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
    var img = document.createElement("img");
    // Miniatura ligera (400px) para la grilla; la imagen completa se carga en el lightbox.
    var thumb = item.f.indexOf("jornadas/")===0 ? item.f.replace("jornadas/","jornadas/thumb/") : item.f;
    img.src = IMG_BASE + thumb;
    img.alt = item[lang] || item.es;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 400; img.height = 300;
    img.addEventListener("click", function(){ openGalleryLightbox(i); });
    g.appendChild(img);
  });
}
function openGalleryLightbox(i){
  lbIndex = i;
  var item = GALLERY[i];
  var im = document.getElementById("lb-img");
  im.src = IMG_BASE + item.f;
  im.alt = item[lang] || item.es;
  document.getElementById("lb-cap").textContent = item[lang] || item.es;
  document.getElementById("lb-count").textContent = (i+1) + " / " + GALLERY.length;
  document.getElementById("lightbox").classList.add("on");
}
function closeLightbox(){ document.getElementById("lightbox").classList.remove("on"); }
function lbStep(d){ openGalleryLightbox((lbIndex + d + GALLERY.length) % GALLERY.length); }
document.addEventListener("keydown", function(e){
  var lb = document.getElementById("lightbox");
  if (!lb || !lb.classList.contains("on")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") lbStep(-1);
  else if (e.key === "ArrowRight") lbStep(1);
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
var NET_COLORS = { foundation:"#1F5C38", company:"#B4690E", hub:"#0A2A5E" };
function renderHeroImpact(){
  var el = document.getElementById("hero-impact"); if (!el) return;
  loadPartners().then(function(){
    var u = activeImpactUnit(); if (!u){ el.hidden = true; return; }
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
function renderWall(){
  var el = document.getElementById("net-wall"); if (!el) return;
  loadPartners().then(function(list){
    var html = "";
    for (var i=0;i<list.length;i++){
      var p = list[i];
      var area = p.area ? (p.area[lang]||p.area.es||"") : (p.areaKey ? t(p.areaKey) : "");
      html += '<div class="card net-card"><span class="net-dot" style="background:'+(NET_COLORS[p.type]||NET_COLORS.hub)+'"></span>'
            + '<h3>'+p.name+'</h3>'
            + (area ? '<p class="mu" style="margin:6px 0 10px">'+area+'</p>' : '')
            + '<span class="tag">'+t("net.type."+p.type)+'</span>'
            + (p.url ? '<p style="margin-top:12px"><a class="card-link" href="'+p.url+'" target="_blank" rel="noopener">'+t("map.visit")+'</a></p>' : '')
            + '</div>';
    }
    html += '<div class="card card-empty"><p>'+t("net.next")+'</p></div>';
    el.innerHTML = html;
  });
}
function renderAliadas(){
  var el = document.getElementById("aliadas-grid"); if (!el) return;
  loadPartners().then(function(list){
    var html = "";
    for (var i=0;i<list.length;i++){
      var p = list[i]; if (p.type !== "foundation") continue;
      var area = p.area ? (p.area[lang]||p.area.es||"") : "";
      var pob = p.poblacion ? (p.poblacion[lang]||p.poblacion.es||"") : "";
      html += '<a class="pcard" href="#fundacion/'+p.id+'" onclick="return go(\'fundacion/'+p.id+'\')">'
            + ((p.logo && canShowLogo(p)) ? '<img class="pcard-logo" src="'+p.logo+'" alt="" loading="lazy">' : '')
            + '<span class="pcard-body"><b>'+p.name+'</b>'
            + '<span class="mu">'+pob+(pob&&area?" · ":"")+area+'</span></span>'
            + '<span class="pcard-go" aria-hidden="true">&rarr;</span></a>';
    }
    html += '<div class="card card-empty"><h3>'+t("hub.aliadas.soon.t")+'</h3><p>'+t("hub.aliadas.soon.p")+'</p></div>';
    el.innerHTML = html;
  });
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
        quote = pick(pr.quote);
    var u = (p.impactUnits && p.impactUnits[0]) || null;
    var html = '<a class="card-link" href="#hub" onclick="return go(\'hub\')">&larr; '+t("ficha.back")+'</a>'
      + '<div class="ficha-head">'
      + ((p.logo && canShowLogo(p)) ? '<img class="ficha-logo" src="'+esc(p.logo)+'" alt="">' : '')
      + '<div><h1 class="ficha-name">'+esc(p.name)+'</h1>'
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
          html += '<button type="button" class="gal-item" role="listitem" aria-label="'+t("ficha.gal.open")+'" onclick="openLightbox(\''+esc(p.id)+'\','+gi+')">'
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
        return '<button type="button" class="fimp-q'+(qi===1?' on':'')+'" data-cop="'+q+'" onclick="fichaImpCalc(this,\''+esc(p.id)+'\')">$'+q.toLocaleString(lang==="en"?"en-US":"es-CO")+'</button>';
      }).join('');
      html += '<div class="card ficha-impact" style="margin-top:26px"><h3>'+t("ficha.imp.t")+'</h3>'
        + '<div class="fimp-row">'+chips+'</div>'
        + '<p id="fimp-out" data-fid="'+esc(p.id)+'"></p></div>';
    }
    if (hubTxt) html += '<h3 style="margin-top:34px">'+t("ficha.hub.t")+'</h3><p style="max-width:70ch">'+hubTxt+'</p>';
    html += '<div class="eco-row" style="margin-top:26px">'
      + (p.url ? '<a class="card-link" href="'+esc(p.url)+'" target="_blank" rel="noopener">'+t("ficha.web")+'</a>' : '')
      + (p.instagram ? '<a class="card-link" style="margin-left:18px" href="'+esc(p.instagram)+'" target="_blank" rel="noopener">Instagram</a>' : '')
      + '<button type="button" id="ficha-share" class="card-link ficha-share" onclick="return shareFicha(\''+esc(p.id)+'\')">'+t("ficha.share")+'</button>'
      + '</div>'
      + '<div class="cta-box" style="margin-top:36px"><h2>'+t("ficha.cta.t")+'</h2><p class="mu">'+t("ficha.cta.p")+'</p>'
      + '<a class="ficha-cta-btn" href="#donar" onclick="return go(\'donar\')">'+t("ficha.cta.btn")+'</a></div>';
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
  d.innerHTML = '<button type="button" class="gal-lb-btn gal-lb-x" aria-label="'+t("ficha.gal.close")+'" onclick="closeGalLb()">'
    + '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>'
    + '<button type="button" class="gal-lb-btn gal-lb-prev" aria-label="'+t("ficha.gal.prev")+'" onclick="stepLightbox(-1)">'
    + '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="14 6 8 12 14 18"/></svg></button>'
    + '<figure class="gal-lb-fig"><img id="gal-lb-img" alt=""><figcaption id="gal-lb-cap" class="mu"></figcaption></figure>'
    + '<button type="button" class="gal-lb-btn gal-lb-next" aria-label="'+t("ficha.gal.next")+'" onclick="stepLightbox(1)">'
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
function initMap(){
  var box = document.getElementById("map-box");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  function pin(tp){
    return L.divIcon({ className:"", html:'<span class="gg-pin gg-pin-'+tp+'"></span>', iconSize:[24,32], iconAnchor:[12,30], popupAnchor:[0,-26] });
  }
  function build(list){
    var map = L.map("map-box",{scrollWheelZoom:false}).setView([6.2442,-75.5812], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
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
        html += '<br><a href="'+escapeHtml(pt.ficha)+'" onclick="return go(\'comercio/'+escapeHtml(pt.id)+'\')">'+t("map.biz")+"</a>";
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
      d.innerHTML='<span><i class="gg-dot" style="background:#1F5C38"></i>'+t("map.leg.f")+"</span>"
                 +'<span><i class="gg-dot" style="background:#B4690E"></i>'+t("map.leg.c")+"</span>"
                 +'<span><i class="gg-dot" style="background:#0A2A5E"></i>'+t("map.leg.hub")+"</span>";
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
      sumEl.textContent = t("map.sum")
        .replace("{f}", counts.foundation)
        .replace("{c}", counts.company)
        .replace("{h}", counts.hub);
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
var ALMA_SYS = `Eres ALMA (Asistente de Labor Misional y Alianzas), la IA de Fundación Give&Grow International. Respondes de forma clara, cálida y concisa. Máximo 3 párrafos por respuesta. No uses listas extensas. Responde en el idioma del usuario.

GIVE&GROW: Fundación colombiana ESAL (NIT 901.948.930-2, RTE Código 04 DIAN). Fundada el 19 de mayo de 2025 en Medellín. Fundador: Juan Sebastián Navarro Osorio, casi 4 años de trabajo en zonas de difícil acceso (La Guajira, Sierra Nevada, Medellín). Tagline: "Dar para crecer, crecer para dar más". Web: www.thegiveandgrowproject.org. Contacto: sebas@thegiveandgrowproject.org / +57 315 330 5028.

MISIÓN: Conectar generosidad con necesidad de forma estratégica y con trazabilidad completa. No reemplazamos fundaciones, las amplificamos.

IMPACTOS Y ALMA: ImpactOS es el sistema operativo de Give&Grow (la plataforma digital del ecosistema). ALMA es su interfaz inteligente. Give&Grow es el ecosistema completo. ALMA es a Give&Grow lo que Siri es al iPhone.

HUB SOCIAL: Centro operativo en Medellín. 5 rutas: R1 Alianzas con Fundaciones, R2 Gestión de Donaciones, R3 Social Grow, R4 Impact Journey, R5 Conexión Laboral. Proceso: visita de contexto, onboarding, gestión de necesidades, entrega con acta, reporte fotográfico al donante.

DONACIONES: Transferencia a Bancolombia Cuenta de Ahorros 31000009221 (NIT 901.948.930-2). Enviar comprobante a contabilidad@thegiveandgrowproject.org. El donante recibe en 24h confirmación, credencial digital y certificado tributario, más reportes fotográficos mensuales.

BENEFICIO TRIBUTARIO: 25% de descuento sobre el impuesto de renta a cargo (Art. 257 ET). Ejemplo: 4.000.000 COP donados = 1.000.000 COP menos de impuesto.

MEMBRESÍAS: Semilla, Retoño, Árbol y Bosque (niveles crecientes de aporte mensual), Temporal (donación única) y Honor (por invitación).

PROGRAMA DE GRATITUD: Red de empresas aliadas con descuentos exclusivos para todos los miembros activos. Categorías: gastronomía, moda, belleza, bienestar, odontología.

RSE EMPRESARIAL: 3 puertas cumplibles hoy: Padrinazgo de Impacto (presupuesto traducido a unidades reales con certificado y reporte), Impact Journey (voluntariado corporativo en doble vía, Ruta 4) y Alianza a medida (co-creación de programas). El aporte se define a la medida de cada empresa; invita a escribir para una propuesta personalizada.

POBLACIONES OBJETIVO: la misión busca impactar todo tipo de población vulnerable a través de las fundaciones del HUB. Las que hoy guían el objeto social: niñez en riesgo, comunidades indígenas, comunidades campesinas, personas en situación de calle, adultos mayores, animales en maltrato, personas en rehabilitación, personas privadas de la libertad. La cobertura real crece con cada aliada verificada.

Más de 25 fundaciones preaprobadas en la red de espera; la vinculación formal se confirma una a una con verificación. Hoy el muro muestra las aliadas ya verificadas.`;

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
  var html = '<div class="journey"><span class="j-meta"><span data-i18n="journey.t">El recorrido</span> · ' + (idx+1) + '/' + JOURNEY.length + '</span><div class="j-links">';
  if (prev) html += '<a class="j-prev" href="#'+prev+'" onclick="return go(\''+prev+'\')">&larr; <span data-i18n="'+JOURNEY_KEYS[prev]+'"></span></a>';
  if (next) html += '<a class="j-next" href="#'+next+'" onclick="return go(\''+next+'\')"><span data-i18n="journey.next">Siguiente</span>: <span data-i18n="'+JOURNEY_KEYS[next]+'"></span> &rarr;</a>';
  else html += '<span class="j-prev" data-i18n="journey.done">Recorrido completo.</span>';
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
  loadInventory().then(function(inv){
    if (!inv || !inv.donaciones){ box.innerHTML = '<p class="track-error">'+t("track.err.load")+'</p>'; return; }
    var d = null;
    for (var i=0;i<inv.donaciones.length;i++){ if (normalizeGuide(inv.donaciones[i].guia)===guide){ d = inv.donaciones[i]; break; } }
    if (!d){ box.innerHTML = trackNotFound(guide); return; }
    box.innerHTML = trackRender(d);
  });
}
function trackNotFound(guide){
  return '<div class="track-card track-nf">'
    + '<h3>'+t("track.nf.t")+'</h3>'
    + '<p>'+t("track.nf.p").replace("{guia}", "<b>"+escapeHtml(guide)+"</b>")+'</p>'
    + '<button type="button" class="track-noguide" onclick="trackNoGuide()">'+t("track.noguide")+'</button>'
    + '</div>';
}
function trackRender(d){
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
    + '</div>';
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
    return '<button type="button" class="alma-chip" onclick="almaAsk(this.textContent)" data-i18n="'+k+'">'+t(k)+'</button>';
  }).join("");
}

/* ============ Formulario "Quiero ser aliado" ============ */
/* URL del Apps Script desplegado como aplicación web. Se cablea tras la instalación. */
var ALLY_ENDPOINT = "https://script.google.com/macros/s/AKfycbxAe-N5E1qKwbSXrkGtM_zQi49HDtmGodhIjolw3dnTc35SaE_a6b6ZvDkPpX07Nmi0Ng/exec";
function allyToggleGrat(){
  var on = document.getElementById("mod-gratitud").checked;
  document.getElementById("ally-gratbox").style.display = on ? "" : "none";
}
function allyToggleServ(){
  var on = document.getElementById("mod-servicios").checked;
  document.getElementById("ally-servbox").style.display = on ? "" : "none";
}
function allySubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("ally-note");
  var btn = document.getElementById("ally-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  if (!chk("aut-marca") || !chk("aut-datos") || !chk("aut-licitud")){
    return allyMsg(note, t("ally.err.aut"), false);
  }
  var payload = {
    razon:val("ally-razon"), nit:val("ally-nit"), representante:val("ally-rep"), cedula:val("ally-cedula"),
    contacto:val("ally-contacto"), correo:val("ally-correo"), telefono:val("ally-tel"),
    ciudad:val("ally-ciudad"), direccion:val("ally-dir"), web:val("ally-web"), descripcion:val("ally-desc"),
    modDonacion:chk("mod-donacion"), modRse:chk("mod-rse"), modGratitud:chk("mod-gratitud"),
    modServicios:chk("mod-servicios"), modVoluntariado:chk("mod-voluntariado"), modDifusion:chk("mod-difusion"),
    benBeneficio:val("ally-ben"), benNivel:val("ally-nivel"), benCondiciones:val("ally-cond"), benRedime:val("ally-redime"),
    servDetalle:val("ally-servdet"),
    autMarca:chk("aut-marca"), autDatos:chk("aut-datos"), autLicitud:chk("aut-licitud")
  };
  if (!ALLY_ENDPOINT){
    return allyMsg(note, t("ally.err.config"), false);
  }
  btn.disabled = true;
  allyMsg(note, t("ally.sending"), true);
  fetch(ALLY_ENDPOINT, {
    method:"POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  }).then(function(r){ return r.json().catch(function(){ return {ok:r.ok}; }); })
    .then(function(res){
      if (res && res.ok){
        document.getElementById("ally-form").reset();
        allyToggleGrat(); allyToggleServ();
        allyMsg(note, t("ally.ok"), true);
      } else {
        btn.disabled = false;
        allyMsg(note, t("ally.err.send"), false);
      }
    })
    .catch(function(){ btn.disabled = false; allyMsg(note, t("ally.err.send"), false); });
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
      return '<a class="grat-card grat-card-link" href="#comercio/'+c.id+'" onclick="return go(\'comercio/'+c.id+'\')">'
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

    var html = '<a class="card-link" href="#gratitud" onclick="return go(\'gratitud\')">&larr; '+t("com.back")+'</a>'
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
        html += '<button type="button" class="gal-item" role="listitem" aria-label="'+t("ficha.gal.open")+'" onclick="openComercioLb(\''+c.id+'\','+gi+')">'
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
      + '<a class="ficha-cta-btn" href="#membresias" onclick="return go(\'membresias\')">'+t("com.cta.btn")+'</a></div>';

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
