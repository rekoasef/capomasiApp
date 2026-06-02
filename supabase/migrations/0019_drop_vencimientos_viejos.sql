-- Rediseño Vencimientos / Gastos Personales
-- El modelo viejo se elimina por completo. La migración 0020 crea el nuevo
-- gestor de gastos de Paola.

DROP TABLE IF EXISTS gastos_personales CASCADE;
DROP TABLE IF EXISTS vencimientos CASCADE;
