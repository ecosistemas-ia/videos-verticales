// Lo común de las páginas locales (galería y entrega): estilos y escapado de HTML.

export function e(texto: unknown): string {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

export const ESTILO_PAGINA = `
:root{--fondo:#0d1016;--tarjeta:#161b24;--borde:#262d3a;--texto:#eef1f6;--gris:#97a1b2;--acento:#c8f031}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:32px 20px 60px}h1{font-size:28px;margin:0 0 6px}h2{font-size:20px;margin:28px 0 12px}
p.sub{color:var(--gris);margin:0 0 24px}.rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:16px;overflow:hidden}
.tarjeta video,.tarjeta img{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;background:#000}
.tarjeta .cuerpo{padding:12px 14px 16px}.tarjeta h3{margin:0 0 4px;font-size:17px}.tarjeta .id{color:var(--acento);font:600 13px ui-monospace,monospace}
.tarjeta p{margin:6px 0 0;color:var(--gris);font-size:14px}.vacio{display:flex;align-items:center;justify-content:center;aspect-ratio:9/16;color:var(--gris);font-size:14px;padding:20px;text-align:center;background:#0a0d12}
.bloque{background:var(--tarjeta);border:1px solid var(--borde);border-radius:14px;padding:16px 18px;margin-bottom:14px;white-space:pre-wrap}
button{background:var(--acento);color:#10140a;border:0;border-radius:10px;padding:7px 14px;font-weight:700;cursor:pointer;float:right}
a{color:var(--acento)}`;
