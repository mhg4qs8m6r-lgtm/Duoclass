import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SymbolWithTooltipProps {
  symbol: string;
  tooltipText: string;
  className?: string;
}

export function SymbolWithTooltip({ symbol, tooltipText, className = "" }: SymbolWithTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-block ${className}`}>
            {symbol}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
