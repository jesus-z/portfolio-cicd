import React from 'react'
import { createRoot } from 'react-dom/client'

function ProjectCards({ projects }) {
  return projects.map(({ id, title, category, stack, description }) => (
    <article className="project-card" key={id} data-project-id={id}>
      <div className="project-art" aria-hidden="true" />
      <div className="project-copy">
        <p className="eyebrow">{category}</p>
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className="tags">
          {stack.split(' · ').map(technology => <li key={technology}>{technology}</li>)}
        </ul>
      </div>
    </article>
  ))
}

const mount = document.querySelector('#portfolio-projects')
if (mount) {
  fetch('/api/projects')
    .then(response => {
      if (!response.ok) throw new Error('Código HTTP ' + response.status)
      return response.json()
    })
    .then(projects => {
      if (Array.isArray(projects) && projects.length) {
        createRoot(mount).render(<ProjectCards projects={projects} />)
      }
    })
    .catch(() => {
      // El HTML de la compilación ya contiene las tarjetas.
    })
}
