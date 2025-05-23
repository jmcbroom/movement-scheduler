// Type definitions for @markwhen/parser
declare module '@markwhen/parser' {
  export interface DateRange {
    fromDateTime: string;
    toDateTime: string;
  }

  export interface EventDescription {
    eventDescription: string;
  }

  export interface Event {
    dateRangeInText: DateRange;
    eventDescription: EventDescription;
    path: string[];
  }

  export interface Timeline {
    events: Event[];
  }

  export interface ParseResult {
    timelines: Timeline[];
  }

  export function parse(content: string): ParseResult;
} 