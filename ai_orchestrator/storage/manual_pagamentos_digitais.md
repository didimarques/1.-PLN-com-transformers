# Manual Operacional — Empresa de Pagamentos Digitais (Fintech)

## 1. Liquidação e Prazos
- **PIX:** Liquidação instantânea (D+0, 24/7) via SPI do Banco Central; taxa padrão de 0,49% para PJ.
- **Cartão de Débito:** Liquidação em D+1 útil; taxa MDR padrão de 1,39%.
- **Cartão de Crédito à Vista:** Liquidação em D+30 (ou D+2 com antecipação); taxa MDR padrão de 2,89%.

## 2. Política de Chargeback, Disputas e Antifraude
- **Suspeita de Fraude (Score > 85):** Transação bloqueada preventivamente e encaminhada ao Detetive/Maestro de Operações para auditoria.
- **Chargeback (Contestação):** O estabelecimento tem até **7 dias corridos** para enviar comprovante de entrega/NF-e.
- **Reembolso Automático / Estorno PIX (MED):** Em caso de falha operacional comprovada, o estorno ocorre em até **7 dias úteis** após validação.

## 3. Conciliação Financeira
- Divergências acima de **R$ 500,00** entre o extrato bancário e a tabela transacional no PostgreSQL devem gerar um dossiê em PDF (`gerar_pdf_relatorio`).
