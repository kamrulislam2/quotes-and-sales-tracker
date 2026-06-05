import { RecordItem } from '@/types';

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
    total: records.length,
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
