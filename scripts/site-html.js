const marcador = '<!-- portfolio-projects -->'
const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapar = valor => valor.replace(/[&<>"']/g, caracter => entidades[caracter])

export function agregarProyectosEstaticos(html, proyectos) {
  const secciones = html.split(marcador)
  if (secciones.length !== 2) throw new Error('El HTML debe tener un único marcador de proyectos.')
  const tarjetas = proyectos.map(({ titulo, descripcion, categoria, tecnologias }) => {
    const etiquetas = tecnologias.map(tecnologia => '<li>' + escapar(tecnologia) + '</li>').join('')
    return '<article class="project-card"><div class="project-art" aria-hidden="true"></div><div class="project-copy"><p class="eyebrow">' + escapar(categoria) + '</p><h3>' + escapar(titulo) + '</h3><p>' + escapar(descripcion) + '</p><ul class="tags">' + etiquetas + '</ul></div></article>'
  }).join('')
  return secciones[0] + tarjetas + secciones[1]
}
