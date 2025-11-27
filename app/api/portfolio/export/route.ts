import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { getPortfolioOverview } from '@/lib/portfolio/data';
import { normalizeFilters } from '@/lib/portfolio/filters';
import type { ExportFormat, PortfolioFilters, PortfolioOverviewResponse } from '@/lib/portfolio/types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatMetricValue(value: number, unit: 'currency' | 'percent' | 'number') {
  if (unit === 'currency') {
    return currencyFormatter.format(value);
  }
  if (unit === 'percent') {
    return `${percentFormatter.format(value)}%`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function buildCsvPayload(overview: PortfolioOverviewResponse) {
  const summaryRows = overview.summary.map((metric) => ({
    Section: 'Summary',
    Metric: metric.label,
    Value: formatMetricValue(metric.value, metric.unit),
    Delta: `${metric.delta.toFixed(2)}% ${metric.delta >= 0 ? '↑' : '↓'} ${metric.deltaLabel}`,
    Symbol: '',
    'Asset Type': '',
    Account: '',
    'Allocation %': '',
    '1D Change %': '',
    'YTD Return %': '',
  }));

  const performance = overview.performance;
  const firstPoint = performance[0];
  const lastPoint = performance.at(-1);
  const portfolioDelta = firstPoint && lastPoint ? lastPoint.portfolio - firstPoint.portfolio : 0;

  const rangeRows = [
    {
      Section: 'Performance',
      Metric: 'Range',
      Value: `${overview.filters.rangeStart} → ${overview.filters.rangeEnd}`,
      Delta: `${portfolioDelta.toFixed(2)} pts vs start`,
      Symbol: '',
      'Asset Type': '',
      Account: '',
      'Allocation %': '',
      '1D Change %': '',
      'YTD Return %': '',
    },
  ];

  const holdingRows = (overview.holdings.length ? overview.holdings : overview.rankings.leaders).map((holding) => ({
    Section: 'Holding',
    Metric: holding.name,
    Value: currencyFormatter.format(holding.value),
    Delta: `${holding.ytdReturnPct.toFixed(2)}% YTD`,
    Symbol: holding.symbol,
    'Asset Type': holding.assetType,
    Account: holding.account,
    'Allocation %': holding.allocation.toFixed(2),
    '1D Change %': holding.dayChangePct.toFixed(2),
    'YTD Return %': holding.ytdReturnPct.toFixed(2),
  }));

  const rows = [...summaryRows, ...rangeRows, ...holdingRows];

  return Papa.unparse(rows, {
    columns: [
      'Section',
      'Metric',
      'Value',
      'Delta',
      'Symbol',
      'Asset Type',
      'Account',
      'Allocation %',
      '1D Change %',
      'YTD Return %',
    ],
  });
}

async function buildPdfPayload(overview: PortfolioOverviewResponse) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let cursorY = 760;

  const ensureSpace = (space = 32) => {
    if (cursorY - space <= 40) {
      page = pdfDoc.addPage([612, 792]);
      cursorY = 760;
    }
  };

  const drawLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    const font = options?.bold ? boldFont : regularFont;
    const size = options?.size ?? 12;
    ensureSpace(size + 6);
    page.drawText(text, { x: margin, y: cursorY, size, font });
    cursorY -= size + 6;
  };

  drawLine('WealthMatters Portfolio Snapshot', { bold: true, size: 20 });
  drawLine(`As of ${new Date(overview.updatedAt).toLocaleString('en-US')}`);
  drawLine(
    `Range ${overview.filters.rangeStart} → ${overview.filters.rangeEnd}`,
    { size: 11 },
  );

  cursorY -= 8;
  drawLine('Summary metrics', { bold: true });
  overview.summary.forEach((metric) => {
    drawLine(
      `${metric.label}: ${formatMetricValue(metric.value, metric.unit)} (${metric.delta.toFixed(2)}% ${metric.deltaLabel})`,
    );
  });

  cursorY -= 4;
  drawLine('Performance highlights', { bold: true });
  const performance = overview.performance;
  if (performance.length > 1) {
    const firstPoint = performance[0];
    const lastPoint = performance.at(-1)!;
    const shift = lastPoint.portfolio - firstPoint.portfolio;
    drawLine(`Portfolio change: ${shift.toFixed(2)} pts`);
    drawLine(`Benchmark change: ${(lastPoint.benchmark - firstPoint.benchmark).toFixed(2)} pts`);
  } else {
    drawLine('Not enough performance data available.');
  }

  cursorY -= 4;
  drawLine('Holdings breakdown', { bold: true });
  const holdings = overview.holdings.length
    ? overview.holdings
    : overview.rankings.leaders;

  for (const holding of holdings.slice(0, 10)) {
    drawLine(
      `${holding.symbol} — ${holding.account} — ${currencyFormatter.format(holding.value)} (${holding.allocation.toFixed(1)}% / ${holding.ytdReturnPct.toFixed(1)}% YTD)`,
    );
  }

  return pdfDoc.save();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const format = body?.format as ExportFormat | undefined;
    const filters = normalizeFilters(body?.filters as Partial<PortfolioFilters> | undefined);

    if (!format || (format !== 'pdf' && format !== 'csv')) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    const overview = getPortfolioOverview(filters);

    if (format === 'pdf') {
      const pdfBytes = await buildPdfPayload(overview);
      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="wealthmatters-${overview.filters.rangeEnd}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const csv = buildCsvPayload(overview);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wealthmatters-${overview.filters.rangeEnd}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to export portfolio data' },
      { status: 500 },
    );
  }
}
