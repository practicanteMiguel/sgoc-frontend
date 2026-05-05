function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export function buildHtmlHeader(params: {
  title:     string
  subtitle?: string
  extra?:    string
}): string {
  const { title, subtitle, extra } = params
  const o = origin()
  return `
<div style="display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:20px;">
  <img src="${o}/assets/logo-full.png" style="height:62px;width:auto;object-fit:contain;flex-shrink:0;" onerror="this.style.visibility='hidden'" />
  <div style="flex:1;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
    <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">${title}</div>
    ${subtitle ? `<div style="font-size:11px;color:#555;">${subtitle}</div>` : ''}
    ${extra    ? `<div style="font-size:11px;color:#555;margin-top:1px;">${extra}</div>` : ''}
  </div>
  <img src="${o}/assets/Logo_Ecopetrol.png" style="height:62px;width:auto;object-fit:contain;flex-shrink:0;" onerror="this.style.visibility='hidden'" />
</div>`
}

export async function fetchLogoBase64(path: string): Promise<string | null> {
  try {
    const res  = await fetch(path)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function fetchLogoBuffer(path: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}
