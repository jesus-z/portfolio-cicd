import test from 'node:test'
import assert from 'node:assert/strict'
import { agregarProyectosEstaticos } from '../scripts/site-html.js'

const plantilla = '<body><div><!-- portfolio-projects --></div></body>'
const proyecto = { titulo: 'Proyecto', descripcion: 'Descripción', categoria: 'Web', tecnologias: ['React', 'Node.js'] }

test('Inserta tarjetas estáticas con sus tecnologías', () => {
  const html = agregarProyectosEstaticos(plantilla, [proyecto])
  assert.match(html, /<h3>Proyecto<\/h3>/)
  assert.match(html, /<li>React<\/li><li>Node\.js<\/li>/)
})

test('Escapa el contenido de las tarjetas antes de incluirlo en HTML', () => {
  const html = agregarProyectosEstaticos(plantilla, [{ ...proyecto, titulo: '<script>&"' }])
  assert.match(html, /&lt;script&gt;&amp;&quot;/)
  assert.doesNotMatch(html, /<script>/)
})

test('Rechaza plantillas sin marcador o con más de uno', () => {
  assert.throws(() => agregarProyectosEstaticos('<body></body>', []), /único marcador/)
  assert.throws(() => agregarProyectosEstaticos(plantilla + plantilla, []), /único marcador/)
})
