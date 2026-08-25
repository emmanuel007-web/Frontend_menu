import { Injectable } from '@angular/core';
import { Order } from '../models/models';

export interface InvoiceRestaurantInfo {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  taxId?: string | null;
  estimatedPrepTime?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDateTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return isoString;
    }
  }

  calculateReadyTime(createdAtIso: string, prepTimeText = '20-30 min'): string {
    try {
      const created = new Date(createdAtIso);
      // Extract the upper number from "20-30 min"
      const match = prepTimeText.match(/(\d+)/g);
      const minutesToAdd = match && match.length > 0 ? parseInt(match[match.length - 1], 10) : 25;
      const readyDate = new Date(created.getTime() + minutesToAdd * 60 * 1000);
      return new Intl.DateTimeFormat('es-CO', {
        timeStyle: 'short',
      }).format(readyDate);
    } catch {
      return '';
    }
  }

  generateInvoiceHtml(order: Order, restaurant: InvoiceRestaurantInfo): string {
    const formattedDate = this.formatDateTime(order.createdAt);
    const readyTime = this.calculateReadyTime(order.createdAt, restaurant.estimatedPrepTime || '20-30 min');
    const orderTypeLabel =
      order.orderType === 'DELIVERY'
        ? '🛵 Domicilio'
        : order.orderType === 'TAKEAWAY'
        ? '🛍️ Para Llevar'
        : `🍽️ En Mesa (${order.tableNumber || 'Mesa'})`;

    const itemsRows = order.items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px dashed #e5e7eb;">
          <td style="padding: 10px 4px; vertical-align: top; font-size: 13px; color: #374151;">
            <div style="font-weight: 700; color: #111827;">${idx + 1}. ${item.productName}</div>
            ${item.notes ? `<div style="font-size: 11px; color: #92400e; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">Nota: ${item.notes}</div>` : ''}
          </td>
          <td style="padding: 10px 4px; text-align: center; vertical-align: top; font-weight: 700; font-size: 13px; color: #111827;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 4px; text-align: right; vertical-align: top; font-size: 13px; color: #4b5563;">
            ${this.formatCurrency(item.unitPrice)}
          </td>
          <td style="padding: 10px 4px; text-align: right; vertical-align: top; font-weight: 700; font-size: 13px; color: #111827;">
            ${this.formatCurrency(item.subtotal || item.unitPrice * item.quantity)}
          </td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura Pedido ${order.orderNumber} - ${restaurant.name}</title>
        <style>
          @page {
            margin: 15mm;
            size: A4 portrait;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            margin: 0;
            padding: 20px;
            color: #1f2937;
            background-color: #f9fafb;
            display: flex;
            justify-content: center;
          }
          .invoice-box {
            background: #ffffff;
            max-width: 650px;
            width: 100%;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .restaurant-name {
            font-size: 24px;
            font-weight: 900;
            color: #111827;
            margin: 0;
          }
          .restaurant-info {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
            line-height: 1.5;
          }
          .badge-order {
            display: inline-block;
            background-color: #111827;
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-top: 10px;
            letter-spacing: 0.5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background-color: #f9fafb;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            border: 1px solid #f3f4f6;
          }
          .info-item {
            font-size: 12px;
          }
          .info-label {
            color: #9ca3af;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .info-value {
            font-weight: 700;
            color: #1f2937;
          }
          .time-banner {
            background-color: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            border-radius: 10px;
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background-color: #f3f4f6;
            color: #4b5563;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 6px;
          }
          .totals-table {
            width: 100%;
            margin-top: 12px;
            border-top: 2px solid #111827;
            padding-top: 12px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
          }
          .grand-total {
            font-size: 20px;
            font-weight: 900;
            color: #111827;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            padding-top: 20px;
            margin-top: 28px;
          }
          @media print {
            body {
              background: none;
              padding: 0;
            }
            .invoice-box {
              border: none;
              box-shadow: none;
              padding: 0;
              max-width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <h1 class="restaurant-name">${restaurant.name}</h1>
            <div class="restaurant-info">
              ${restaurant.taxId ? `<span>${restaurant.taxId}</span><br>` : ''}
              ${restaurant.address ? `<span>📍 ${restaurant.address}</span><br>` : ''}
              ${restaurant.phone || restaurant.whatsapp ? `<span>📞 ${restaurant.phone || restaurant.whatsapp}</span>` : ''}
            </div>
            <div>
              <span class="badge-order">COMPROBANTE DE PEDIDO #${order.orderNumber}</span>
            </div>
          </div>

          <div class="time-banner">
            <span>⏱️ Tiempo Estimado de Preparación: <strong>${restaurant.estimatedPrepTime || '20-30 min'}</strong></span>
            ${readyTime ? `<span>🔔 Aprox: ${readyTime}</span>` : ''}
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Cliente</div>
              <div class="info-value">${order.customerName || 'Cliente'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ubicación / Tipo</div>
              <div class="info-value">${orderTypeLabel}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha y Hora</div>
              <div class="info-value">${formattedDate}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado de la Orden</div>
              <div class="info-value" style="color: #059669;">● ${order.status === 'PENDING' ? 'Recibido en Cocina' : order.status}</div>
            </div>
            ${order.customerPhone ? `
            <div class="info-item">
              <div class="info-label">Teléfono de Contacto</div>
              <div class="info-value">${order.customerPhone}</div>
            </div>` : ''}
            ${order.notes ? `
            <div class="info-item" style="grid-column: span 2;">
              <div class="info-label">Observaciones Generales</div>
              <div class="info-value" style="font-style: italic;">${order.notes}</div>
            </div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Descripción</th>
                <th style="text-align: center; width: 60px;">Cant.</th>
                <th style="text-align: right; width: 100px;">Unitario</th>
                <th style="text-align: right; width: 110px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-table">
            <div class="total-row">
              <span style="color: #6b7280;">Subtotal de Productos:</span>
              <span style="font-weight: 700;">${this.formatCurrency(order.totalAmount)}</span>
            </div>
            <div class="total-row">
              <span style="color: #6b7280;">Impuestos (IVA / Impoconsumo):</span>
              <span style="font-weight: 600; color: #4b5563;">Incluido</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL A PAGAR:</span>
              <span style="color: #111827;">${this.formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0; font-weight: 700; color: #4b5563;">¡Gracias por tu pedido en ${restaurant.name}!</p>
            <p style="margin: 4px 0 0 0;">Factura y comprobante digital generado a través de <strong>Tavita</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  downloadInvoice(order: Order, restaurant: InvoiceRestaurantInfo): void {
    const html = this.generateInvoiceHtml(order, restaurant);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${restaurant.slug || 'restaurante'}_${order.orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  printInvoice(order: Order, restaurant: InvoiceRestaurantInfo): void {
    const html = this.generateInvoiceHtml(order, restaurant);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);
    }
  }
}
