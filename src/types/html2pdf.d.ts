declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: { type?: string; quality?: number }
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean }
    jsPDF?: { unit?: string; format?: string; orientation?: string }
  }
  interface Html2PdfWrapper {
    set(opts: Html2PdfOptions): Html2PdfWrapper
    from(src: HTMLElement | string): Html2PdfWrapper
    save(): Promise<void>
  }
  function html2pdf(): Html2PdfWrapper
  export = html2pdf
}
