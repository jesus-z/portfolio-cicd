import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { areasHabilidadesIniciales, idiomasIniciales, proyectosIniciales } from './proyectos.js'

const esquema = `
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS perfil (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nombre TEXT NOT NULL,
    profesion TEXT,
    resumen TEXT,
    ciudad TEXT,
    pais TEXT,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contactos (
    id INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    etiqueta TEXT,
    visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS areas_habilidades (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS habilidades (
    id INTEGER PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas_habilidades(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    porcentaje INTEGER CHECK (porcentaje BETWEEN 0 AND 100),
    orden INTEGER NOT NULL DEFAULT 0,
    UNIQUE (area_id, nombre)
  );

  CREATE TABLE IF NOT EXISTS idiomas (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    nivel TEXT NOT NULL,
    codigo_marco TEXT,
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS categorias_proyecto (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY,
    titulo TEXT NOT NULL UNIQUE,
    categoria_id INTEGER REFERENCES categorias_proyecto(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    url_demo TEXT,
    url_repositorio TEXT,
    estado TEXT NOT NULL DEFAULT 'publicado',
    orden INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tecnologias (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS proyecto_tecnologias (
    proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    tecnologia_id INTEGER NOT NULL REFERENCES tecnologias(id) ON DELETE CASCADE,
    PRIMARY KEY (proyecto_id, tecnologia_id)
  );

  CREATE TABLE IF NOT EXISTS experiencias_laborales (
    id INTEGER PRIMARY KEY,
    cargo TEXT NOT NULL,
    empresa TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    fecha_inicio TEXT,
    fecha_fin TEXT,
    actual INTEGER NOT NULL DEFAULT 0 CHECK (actual IN (0, 1)),
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS formaciones (
    id INTEGER PRIMARY KEY,
    titulo TEXT NOT NULL,
    institucion TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    fecha_inicio TEXT,
    fecha_fin TEXT,
    en_curso INTEGER NOT NULL DEFAULT 0 CHECK (en_curso IN (0, 1)),
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS certificaciones (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    entidad TEXT,
    fecha_obtencion TEXT,
    url_verificacion TEXT,
    UNIQUE (nombre, entidad)
  );

  CREATE INDEX IF NOT EXISTS indice_habilidades_area ON habilidades(area_id, orden);
  CREATE INDEX IF NOT EXISTS indice_proyectos_categoria ON proyectos(categoria_id, orden);
  CREATE INDEX IF NOT EXISTS indice_experiencias_fechas ON experiencias_laborales(fecha_inicio, fecha_fin);
  CREATE INDEX IF NOT EXISTS indice_formaciones_fechas ON formaciones(fecha_inicio, fecha_fin);
`

function obtenerId(db, tabla, columna, valor) {
  return db.prepare('SELECT id FROM ' + tabla + ' WHERE ' + columna + ' = ?').get(valor)?.id
}

function guardarProyecto(db, proyecto, orden = 0) {
  db.prepare('INSERT OR IGNORE INTO categorias_proyecto (nombre) VALUES (?)').run(proyecto.categoria)
  const categoriaId = obtenerId(db, 'categorias_proyecto', 'nombre', proyecto.categoria)
  db.prepare(
    'INSERT OR IGNORE INTO proyectos (titulo, categoria_id, descripcion, orden) VALUES (?, ?, ?, ?)'
  ).run(proyecto.titulo, categoriaId, proyecto.descripcion, orden)
  const proyectoId = obtenerId(db, 'proyectos', 'titulo', proyecto.titulo)
  for (const nombreTecnologia of proyecto.tecnologias) {
    db.prepare('INSERT OR IGNORE INTO tecnologias (nombre) VALUES (?)').run(nombreTecnologia)
    const tecnologiaId = obtenerId(db, 'tecnologias', 'nombre', nombreTecnologia)
    db.prepare(
      'INSERT OR IGNORE INTO proyecto_tecnologias (proyecto_id, tecnologia_id) VALUES (?, ?)'
    ).run(proyectoId, tecnologiaId)
  }
}

function importarProyectosAnteriores(db) {
  const tablaAnterior = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'"
  ).get()
  if (!tablaAnterior) return

  const registrosAnteriores = db.prepare(
    'SELECT title, category, stack, description FROM projects ORDER BY id'
  ).all()
  for (const [orden, registro] of registrosAnteriores.entries()) {
    guardarProyecto(db, {
      titulo: registro.title,
      categoria: registro.category || 'Sin categoría',
      tecnologias: (registro.stack || '').split(' · ').filter(Boolean),
      descripcion: registro.description || ''
    }, orden)
  }
  db.exec('DROP TABLE projects')
}

function insertarDatosIniciales(db) {
  db.prepare(`
    INSERT OR IGNORE INTO perfil (id, nombre, profesion, resumen, ciudad, pais)
    VALUES (1, ?, ?, ?, ?, ?)
  `).run(
    'Jesús Eduardo Zeballos Isita',
    'Estudiante de Ingeniería de Sistemas Informáticos',
    'Estudio Ingeniería de Sistemas Informáticos en Univalle, sede Sucre. Me interesa conectar interfaces, lógica y datos en proyectos que se puedan usar y probar.',
    'Sucre',
    'Bolivia'
  )

  const insertarContacto = db.prepare(
    'INSERT OR IGNORE INTO contactos (tipo, valor, etiqueta, orden) VALUES (?, ?, ?, ?)'
  )
  for (const contacto of [
    { tipo: 'correo', valor: 'jedu_1010@hotmail.com', etiqueta: 'Correo electrónico' },
    { tipo: 'telefono', valor: '+591 744 44862', etiqueta: 'Teléfono' },
    { tipo: 'github', valor: 'https://github.com/jesus-z', etiqueta: 'GitHub' }
  ].entries()) {
    const [orden, datosContacto] = contacto
    insertarContacto.run(datosContacto.tipo, datosContacto.valor, datosContacto.etiqueta, orden)
  }

  const insertarArea = db.prepare('INSERT OR IGNORE INTO areas_habilidades (nombre, orden) VALUES (?, ?)')
  const insertarHabilidad = db.prepare(
    'INSERT OR IGNORE INTO habilidades (area_id, nombre, porcentaje, orden) VALUES (?, ?, ?, ?)'
  )
  for (const [ordenArea, area] of areasHabilidadesIniciales.entries()) {
    insertarArea.run(area.nombre, ordenArea)
    const areaId = obtenerId(db, 'areas_habilidades', 'nombre', area.nombre)
    for (const [ordenHabilidad, habilidad] of area.habilidades.entries()) {
      insertarHabilidad.run(areaId, habilidad.nombre, habilidad.porcentaje, ordenHabilidad)
    }
  }

  const insertarIdioma = db.prepare(
    'INSERT OR IGNORE INTO idiomas (nombre, nivel, codigo_marco, orden) VALUES (?, ?, ?, ?)'
  )
  for (const [orden, idioma] of idiomasIniciales.entries()) {
    insertarIdioma.run(idioma.nombre, idioma.nivel, idioma.codigoMarco, orden)
  }

  for (const [orden, proyecto] of proyectosIniciales.entries()) {
    guardarProyecto(db, proyecto, orden)
  }
}

export function abrirBaseDeDatos(ruta) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })
  const baseDeDatos = new DatabaseSync(ruta)
  baseDeDatos.exec(esquema)
  baseDeDatos.exec('BEGIN IMMEDIATE')
  try {
    importarProyectosAnteriores(baseDeDatos)
    insertarDatosIniciales(baseDeDatos)
    baseDeDatos.exec('PRAGMA user_version = 2')
    baseDeDatos.exec('COMMIT')
  } catch (error) {
    baseDeDatos.exec('ROLLBACK')
    baseDeDatos.close()
    throw error
  }
  return baseDeDatos
}
