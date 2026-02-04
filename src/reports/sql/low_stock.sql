-- Reporte: stock bajo (por movimientos)
-- Nota: stock = SUM(inventory_movements.quantity) por skuId

WITH stock AS (
  SELECT
    "skuId" AS sku_id,
    COALESCE(SUM(quantity), 0) AS current_stock
  FROM inventory_movements
  GROUP BY "skuId"
)
SELECT
  sk.id AS sku_id,
  sk."skuCode" AS sku_code,
  pr.name AS product_name,
  COALESCE(st.current_stock, 0) AS current_stock
FROM skus sk
JOIN products pr ON pr.id = sk."productId"
LEFT JOIN stock st ON st.sku_id = sk.id
WHERE COALESCE(st.current_stock, 0) <= 2
ORDER BY current_stock ASC, sku_code ASC;
