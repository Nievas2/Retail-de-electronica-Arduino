-- Reporte: ventas por dia
-- Criterio: solo ventas CERRADA

SELECT
  DATE(s.created_at) AS day,
  COUNT(DISTINCT s.id) AS total_sales,
  COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0) AS items_total,
  COALESCE(SUM(p.amount), 0) AS paid_total
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
LEFT JOIN payments p ON p.sale_id = s.id
WHERE s.status = 'CERRADA'
GROUP BY DATE(s.created_at)
ORDER BY day DESC;
