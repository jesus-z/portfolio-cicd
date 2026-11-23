import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const consultaProyectos = `
  SELECT
    p.id,
    p.titulo AS title,
    cp.nombre AS category,
    COALESCE(GROUP_CONCAT(t.nombre, ' · '), '') AS stack,
    p.descripcion AS description
  FROM proyectos AS p
  LEFT JOIN categorias_proyecto AS cp ON cp.id = p.categoria_id
  LEFT JOIN proyecto_tecnologias AS pt ON pt.proyecto_id = p.id
  LEFT JOIN tecnologias AS t ON t.id = pt.tecnologia_id
  WHERE p.estado = 'publicado'
  GROUP BY p.id
  ORDER BY p.orden, p.id
`

const consultaProyectosEnEspanol = `
  SELECT
    p.id,
    p.titulo,
    cp.nombre AS categoria,
    p.descripcion,
    p.url_demo,
    p.url_repositorio,
    p.estado,
    COALESCE(GROUP_CONCAT(t.nombre, ' · '), '') AS tecnologias
  FROM proyectos AS p
  LEFT JOIN categorias_proyecto AS cp ON cp.id = p.categoria_id
  LEFT JOIN proyecto_tecnologias AS pt ON pt.proyecto_id = p.id
  LEFT JOIN tecnologias AS t ON t.id = pt.tecnologia_id
  WHERE p.estado = 'publicado'
  GROUP BY p.id
  ORDER BY p.orden, p.id
`

export function crearAplicacion(baseDeDatos, recursosEstaticos = resolve('dist')) {
  const aplicacion = express()
  aplicacion.disable('x-powered-by')

  aplicacion.get('/api/health', (_solicitud, respuesta) => {
    baseDeDatos.prepare('SELECT 1 FROM proyectos LIMIT 1').get()
    respuesta.json({ status: 'ok' })
  })

  // Se conserva esta respuesta para que la interfaz React existente no cambie.
  aplicacion.get('/api/projects', (_solicitud, respuesta) => {
    respuesta.json(baseDeDatos.prepare(consultaProyectos).all())
  })

  aplicacion.get('/api/proyectos', (_solicitud, respuesta) => {
    respuesta.json(baseDeDatos.prepare(consultaProyectosEnEspanol).all())
  })

  aplicacion.get('/api/habilidades', (_solicitud, respuesta) => {
    respuesta.json(baseDeDatos.prepare(`
      SELECT ah.nombre AS area, h.nombre, h.porcentaje
      FROM habilidades AS h
      JOIN areas_habilidades AS ah ON ah.id = h.area_id
      ORDER BY ah.orden, h.orden
    `).all())
  })

  aplicacion.get('/api/idiomas', (_solicitud, respuesta) => {
    respuesta.json(baseDeDatos.prepare(
      'SELECT nombre, nivel, codigo_marco FROM idiomas ORDER BY orden, id'
    ).all())
  })

  aplicacion.get('/api/perfil', (_solicitud, respuesta) => {
    const perfil = baseDeDatos.prepare(
      'SELECT nombre, profesion, resumen, ciudad, pais FROM perfil WHERE id = 1'
    ).get()
    const contactos = baseDeDatos.prepare(
      'SELECT tipo, valor, etiqueta FROM contactos WHERE visible = 1 ORDER BY orden, id'
    ).all()
    respuesta.json({ ...perfil, contactos })
  })

  aplicacion.use('/api', (_solicitud, respuesta) =>
    respuesta.status(404).json({ error: 'Ruta no encontrada' })
  )
  if (existsSync(recursosEstaticos)) aplicacion.use(express.static(recursosEstaticos))
  return aplicacion
}
