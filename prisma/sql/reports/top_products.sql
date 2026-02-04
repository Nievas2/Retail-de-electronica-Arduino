-- Reporte: top productos por unidades / dinero
-- Solo ventas CERRADA

SELECT
  pr.id AS product_id,
  pr.name AS product_name,
  sk.id AS sku_id,
  sk.sku_code AS sku_code,
  SUM(si.quantity) AS units_sold,
  COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0) AS money_sold
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN skus sk ON sk.id = si.sku_id
JOIN products pr ON pr.id = sk.product_id
WHERE s.status = 'CERRADA'
GROUP BY pr.id, pr.name, sk.id, sk.sku_code
ORDER BY units_sold DESC, money_sold DESC
LIMIT 50;
