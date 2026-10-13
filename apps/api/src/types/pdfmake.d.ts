declare module 'pdfmake' {
  interface PdfMakeDocumentDefinition {
    info?: Record<string, string | number | undefined>;
    defaultStyle?: Record<string, unknown>;
    pageSize?: string;
    pageMargins?: [number, number, number, number];
    content: unknown;
    styles?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
  }

  interface PdfMakeOutputDocument {
    getBuffer(): Promise<Buffer>;
  }

  interface PdfMakeInstance {
    createPdf(docDefinition: PdfMakeDocumentDefinition): PdfMakeOutputDocument;
    setFonts(fonts: Record<string, Record<string, string>>): void;
  }

  const pdfMake: PdfMakeInstance;
  export default pdfMake;
}

declare module 'pdfmake/fonts/Roboto' {
  const fonts: Record<string, Record<string, string>>;
  export default fonts;
}
