-- Give&Grow · base privada · migración 0050
-- ============================================================================
-- QUEJAS QUE NO LLEGAN POR EL FORMULARIO (28 oct 2026).
--
-- Una familia de Mira Mi Casa no abre un formulario: manda un WhatsApp, llama o
-- se lo dice en persona a quien está en terreno. Hasta hoy eso no tenía dónde
-- quedar, así que no contaba en el indicador #12 ni tenía plazo. Desde el panel
-- (/admin › Quejas) se anota con el día en que llegó, y desde ahí sigue el
-- mismo camino que las del formulario.
--
--   · canal           — por dónde llegó. Lo que ya existía es 'formulario'.
--   · registrada_por  — la sesión de Access que la anotó. NULL en las del
--                       formulario.
--
-- ALTER TABLE ADD COLUMN no admite IF NOT EXISTS: si ya se aplicó, la tabla de
-- migraciones lo sabe y `migrations apply` no la vuelve a correr.
-- ============================================================================

ALTER TABLE quejas ADD COLUMN canal TEXT NOT NULL DEFAULT 'formulario'
  CHECK (canal IN ('formulario', 'whatsapp', 'correo', 'telefono', 'en_persona', 'otro'));
ALTER TABLE quejas ADD COLUMN registrada_por TEXT;
