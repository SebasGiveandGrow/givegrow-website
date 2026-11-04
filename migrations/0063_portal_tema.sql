-- Migración 0063 — el portal vestido para una fundación (4 nov 2026).
--
-- Un detalle de bienvenida, no una función: el portal de una fundación puede
-- llevar un tema propio (colores y dibujo de cabecera) y un saludo para quien
-- lo abre. El primero es «adriatico» (Adriatic Blue con lirios blancos), para
-- Positive Potential.
--
-- `portal_tema`: el id de un tema de PORTAL_TEMAS en worker.js. Un id que el
-- código no conozca se ignora y el portal sale con el tema de siempre.
-- `portal_saludo`: la frase que reemplaza la explicación bajo el nombre de la
-- fundación. Va en la base y no en el código porque lleva el nombre de una
-- persona, y el repositorio es público.
--
-- Las dos quedan en NULL para todas las demás: nada cambia para el resto de la
-- red. Se asignan desde la consola de D1, por ahora sin pantalla en el panel.

ALTER TABLE inscripciones ADD COLUMN portal_tema TEXT;
ALTER TABLE inscripciones ADD COLUMN portal_saludo TEXT;
