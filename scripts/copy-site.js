import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { agregarProyectosEstaticos } from './site-html.js'
import { proyectosIniciales } from '../backend/proyectos.js'

const html = await readFile('frontend/index.html', 'utf8')
await mkdir('dist/assets', { recursive: true })
for (const archivo of ['resumen.html', 'style.css', 'cv.css', 'site.js']) {
  await cp('frontend/' + archivo, 'dist/' + archivo)
}
for (const archivo of ['perfil.png', 'perfil.webp', '0827.MP3']) {
  await cp('frontend/assets/' + archivo, 'dist/assets/' + archivo)
}
await writeFile('dist/index.html', agregarProyectosEstaticos(html, proyectosIniciales))
