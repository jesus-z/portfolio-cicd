import { crearAplicacion } from './app.js'
import { abrirBaseDeDatos } from './db.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const carpetaBackend = dirname(fileURLToPath(import.meta.url))
const rutaBaseDeDatos = process.env.DB_PATH === ':memory:'
  ? ':memory:'
  : resolve(carpetaBackend, 'data', 'portfolio.sqlite')
const baseDeDatos = abrirBaseDeDatos(rutaBaseDeDatos)
const puerto = Number(process.env.PORT ?? 3000)

console.log('Base SQLite: ' + rutaBaseDeDatos)
crearAplicacion(baseDeDatos).listen(puerto, '0.0.0.0', () => {
  console.log('Portafolio escuchando en el puerto ' + puerto)
})
