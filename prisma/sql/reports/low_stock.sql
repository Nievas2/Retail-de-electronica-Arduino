-- Reporte: stock bajo (calculado por movimientos)
-- Nota: asume que inventory_movements.quantity es signed (+entrada, -salida)

WITH stock AS (
  SELECT
    sku_id,
    COALESCE(SUM(quantity), 0) AS current_stock
  FROM inventory_movements
  GROUP BY sku_id
)
SELECT
  sk.id AS sku_id,
  sk.sku_code,
  pr.name AS product_name,
  COALESCE(st.current_stock, 0) AS current_stock
FROM skus sk
JOIN products pr ON pr.id = sk.product_id
LEFT JOIN stock st ON st.sku_id = sk.id
WHERE COALESCE(st.current_stock, 0) <= 2
ORDER BY current_stock ASC, sk.sku_code ASC;
