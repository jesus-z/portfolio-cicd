import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { crearAplicacion } from '../backend/app.js'
import { abrirBaseDeDatos } from '../backend/db.js'

let db, server, base

before(async () => {
  db = abrirBaseDeDatos(':memory:')
  server = crearAplicacion(db).listen(0, '127.0.0.1')
  await once(server, 'listening')
  base = 'http://127.0.0.1:' + server.address().port
})

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  db.close()
})

test('Salud de Express y SQLite', async () => {
  const response = await fetch(base + '/api/health')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('La API responde con los datos leídos de SQLite', async () => {
  db.prepare('UPDATE proyectos SET descripcion = ? WHERE id = 1').run('Prueba desde SQLite')
  const response = await fetch(base + '/api/projects')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.length, 3)
  assert.match(data[0].title, /NeuroLink 3.0/)
  assert.equal(data[0].description, 'Prueba desde SQLite')
})

test('Una ruta inexistente de API devuelve 404 JSON', async () => {
  const response = await fetch(base + '/api/inexistente')
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Ruta no encontrada' })
})
