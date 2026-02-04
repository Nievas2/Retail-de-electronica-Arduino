-- Reporte: top productos (unidades + dinero)
-- Solo ventas CERRADA

SELECT
  pr.id AS product_id,
  pr.name AS product_name,
  sk.id AS sku_id,
  sk."skuCode" AS sku_code,
  SUM(si.quantity) AS units_sold,
  COALESCE(SUM(si.quantity * si."unitPrice" - si.discount), 0) AS money_sold
FROM sale_items si
JOIN sales s ON s.id = si."saleId"
JOIN skus sk ON sk.id = si."skuId"
JOIN products pr ON pr.id = sk."productId"
WHERE s.status = 'CERRADA'
GROUP BY pr.id, pr.name, sk.id, sk."skuCode"
ORDER BY units_sold DESC, money_sold DESC
LIMIT 50;
