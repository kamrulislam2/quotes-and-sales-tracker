import { RecordItem } from '@/types';
import { toast } from 'react-hot-toast';

// Helper function to format date from ISO string (or YYYY-MM-DD) to DD-MM-YYYY format
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

// Helper function to format ISO timestamp to 12-hour AM/PM format (e.g. 03:04 PM)
export const formatTimeToAMPM = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
};

// Calculate counts of files of each type
export const calculateSummaryStats = (records: RecordItem[]) => {
  let quote = 0;
  let requote = 0;
  let requoteVan = 0;
  let requoteBike = 0;
  let review = 0;
  let reviewVan = 0;
  let reviewBike = 0;
  let individualReview = 0;
  let otherSite = 0;
  let van = 0;
  let bike = 0;
  let sale = 0;

  records.forEach(r => {
    const type = r.file_type;
    if (type === 'Quote') quote++;
    else if (type === 'Requote') requote++;
    else if (type === 'Requote Van') requoteVan++;
    else if (type === 'Requote Bike') requoteBike++;
    else if (type === 'Review') review++;
    else if (type === 'Review Van') reviewVan++;
    else if (type === 'Review Bike') reviewBike++;
    else if (type === 'Individual Review') individualReview++;
    else if (type === 'Other Site') otherSite++;
    else if (type === 'Van') van++;
    else if (type === 'Bike') bike++;
    else if (type === 'Sale') sale++;
  });

  return {
    total: records.length - otherSite,
    quote,
    requote,
    requoteVan,
    requoteBike,
    review,
    reviewVan,
    reviewBike,
    individualReview,
    otherSite,
    van,
    bike,
    sale
  };
};

export const escapeHtml = (unsafeStr: unknown): string => {
  if (unsafeStr === null || unsafeStr === undefined) return '';
  return unsafeStr
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Export records list to CSV file (Microsoft Excel compatible with UTF-8 BOM)
export const exportToCSV = (records: RecordItem[], fileName: string) => {
  const headers = ['Date', 'Submitted Time', 'File Name', 'Branch', 'Codename', 'Type'];
  
  const rows = records.map(r => {
    const date = formatDate(r.submitted_at);
    const time = formatTimeToAMPM(r.submitted_at);
    return [
      date,
      time,
      r.file_name,
      r.branch_name,
      r.codename,
      r.file_type
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // Prepended \uFEFF Byte Order Mark (BOM) allows Excel to render non-ASCII characters (e.g. Bengali script) correctly
  const fullContent = '\uFEFF' + csvContent;

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  if (isTauri) {
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(fullContent);
      const { invoke } = (window as any).__TAURI__.core;
      invoke('save_file', { file_name: `${fileName}.csv`, content: Array.from(bytes) })
        .then((savedPath: string) => {
          toast.success(`Excel saved to: ${savedPath}`);
        })
        .catch((err: any) => {
          if (err !== 'Save cancelled') {
            toast.error(`Failed to save Excel: ${err}`);
          }
        });
    } catch (err) {
      toast.error('Failed to export Excel in desktop app.');
    }
    return;
  }
  
  const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export records list to PDF via temporary print window (guarantees perfect native UTF-8 rendering)
export const exportToPDF = (records: RecordItem[], title: string, subtitle?: string) => {
  const rowsHtml = records.map(r => `
    <tr>
      <td>${formatDate(r.submitted_at)}</td>
      <td>${formatTimeToAMPM(r.submitted_at)}</td>
      <td>${escapeHtml(r.file_name)}</td>
      <td>${escapeHtml(r.branch_name)}</td>
      <td>${escapeHtml(r.codename)}</td>
      <td>${escapeHtml(r.file_type)}</td>
    </tr>
  `).join('');

  const getHtmlContent = (withAutoPrint: boolean) => `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            padding: 40px;
            margin: 0;
            background-color: #ffffff;
          }
          .header {
            margin-bottom: 25px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 15px;
          }
          .title {
            font-size: 22px;
            font-weight: bold;
            color: #0f172a;
          }
          .subtitle {
            font-size: 13px;
            color: #64748b;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 2px solid #cbd5e1;
            border-top: 1px solid #e2e8f0;
          }
          td {
            padding: 10px 12px;
            font-size: 12px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%">Date</th>
              <th style="width: 15%">Submitted Time</th>
              <th style="width: 35%">File Name</th>
              <th style="width: 12%">Branch</th>
              <th style="width: 13%">Codename</th>
              <th style="width: 10%">Type</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Generated automatically by Quotes & Sales Tracker
        </div>
        ${withAutoPrint ? `
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
        ` : ''}
      </body>
    </html>
  `;

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  if (isTauri) {
    try {
      const htmlContent = getHtmlContent(true);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(htmlContent);
      const { invoke } = (window as any).__TAURI__.core;
      const cleanFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      invoke('save_file', { file_name: cleanFileName, content: Array.from(bytes) })
        .then((savedPath: string) => {
          toast.success(`HTML saved to: ${savedPath}. Open it to print/save PDF.`);
        })
        .catch((err: any) => {
          if (err !== 'Save cancelled') {
            toast.error(`Failed to save HTML: ${err}`);
          }
        });
    } catch (err) {
      toast.error('Failed to export PDF/HTML in desktop app.');
    }
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(getHtmlContent(false));
  printWindow.document.write(`
    <script>
      window.onload = function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      };
    </script>
  `);
  printWindow.document.close();
};
