'use client';

import { Download, FileDown, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExportFormat } from '@/lib/portfolio/types';

interface ExportMenuProps {
  disabled?: boolean;
  isExporting?: boolean;
  onExport: (format: ExportFormat) => void | Promise<void>;
}

export function ExportMenu({ disabled, isExporting, onExport }: ExportMenuProps) {
  const handleSelect = (format: ExportFormat) => {
    if (disabled || isExporting) return;
    void onExport(format);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel>Export current view</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleSelect('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleSelect('csv')}>
          <FileDown className="mr-2 h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportMenu;
