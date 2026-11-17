-- Migración 0067 — la aliada de EE. UU. ve y confirma los regalos desde su
-- portal (17 nov 2026, pedido de Sebas).
--
-- Los dólares de la campaña los recibe la fundación aliada (Positive
-- Potential), no Give&Grow: hasta hoy ella le reportaba los pagos a Sebas y él
-- los confirmaba a mano en /admin, y mientras tanto la reserva de los regalos
-- vencía. Con esta columna, la inscripción de la aliada abre en su portal una
-- pestaña «Regalos» donde ve la campaña y confirma (o rechaza) los pedidos en
-- dólares, que es el dinero que entra a su cuenta.
--
-- Decisiones de Sebas (17 nov): de los niños ve SOLO lo que ya es público
-- (código, nombre de pila, edad, zona, regalo, foto si se autorizó); de los
-- donantes, nombre y correo SOLO de los pedidos en dólares, que son sus propios
-- donantes. Crear, editar o retirar niños y regalos sigue siendo del equipo.
--
-- NULL = ninguna inscripción tiene la pestaña. Se asigna con un UPDATE desde
-- la consola de D1 (el id de la inscripción no va en el repositorio público).

ALTER TABLE regalo_campanas ADD COLUMN aliada_inscripcion INTEGER;
