function neighbourhoodHighlight(p) {

  let all = nodes.get({ returnType: "Object" }) // pega tudo

  if (p.nodes.length > 0) {

    highlightActive = true

    let sel = p.nodes[0] // node clicado
    let grau = 2

    // deixa tudo apagado
    for (let id in all) {
      all[id].color = "rgba(200,200,200,0.5)"

      if (all[id].hiddenLabel === undefined) {
        all[id].hiddenLabel = all[id].label
        all[id].label = undefined
      }
    }

    let ligados = network.getConnectedNodes(sel) // vizinhos
    let ligados2 = []

    // pega segundo nivel
    for (let i = 1; i < grau; i++) {
      for (let j = 0; j < ligados.length; j++) {
        ligados2 = ligados2.concat(
          network.getConnectedNodes(ligados[j])
        )
      }
    }

    // segundo nivel cinza medio
    for (let i = 0; i < ligados2.length; i++) {
      let id = ligados2[i]

      all[id].color = "rgba(150,150,150,0.75)"

      if (all[id].hiddenLabel !== undefined) {
        all[id].label = all[id].hiddenLabel
        all[id].hiddenLabel = undefined
      }
    }

    // primeiro nivel normal
    for (let i = 0; i < ligados.length; i++) {
      let id = ligados[i]

      all[id].color = nodeColors[id]

      if (all[id].hiddenLabel !== undefined) {
        all[id].label = all[id].hiddenLabel
        all[id].hiddenLabel = undefined
      }
    }

    // node principal
    all[sel].color = nodeColors[sel]

    if (all[sel].hiddenLabel !== undefined) {
      all[sel].label = all[sel].hiddenLabel
      all[sel].hiddenLabel = undefined
    }

  } else if (highlightActive === true) {

    // volta tudo
    for (let id in all) {
      all[id].color = nodeColors[id]

      if (all[id].hiddenLabel !== undefined) {
        all[id].label = all[id].hiddenLabel
        all[id].hiddenLabel = undefined
      }
    }

    highlightActive = false
  }

  // atualiza
  let arr = []

  for (let id in all) {
    if (all.hasOwnProperty(id)) {
      arr.push(all[id])
    }
  }

  nodes.update(arr)
}


// filtro simples
function filterHighlight(p) {

  let all = nodes.get({ returnType: "Object" })

  if (p.nodes.length > 0) {

    filterActive = true
    let sel = p.nodes

    // esconde tudo
    for (let id in all) {
      all[id].hidden = true

      if (all[id].savedLabel === undefined) {
        all[id].savedLabel = all[id].label
        all[id].label = undefined
      }
    }

    // mostra so os selecionados
    for (let i = 0; i < sel.length; i++) {
      let id = sel[i]

      all[id].hidden = false

      if (all[id].savedLabel !== undefined) {
        all[id].label = all[id].savedLabel
        all[id].savedLabel = undefined
      }
    }

  } else if (filterActive === true) {

    // volta tudo
    for (let id in all) {
      all[id].hidden = false

      if (all[id].savedLabel !== undefined) {
        all[id].label = all[id].savedLabel
        all[id].savedLabel = undefined
      }
    }

    filterActive = false
  }

  // atualiza
  let arr = []

  for (let id in all) {
    if (all.hasOwnProperty(id)) {
      arr.push(all[id])
    }
  }

  nodes.update(arr)
}


// seleciona 1 node
function selectNode(n) {
  network.selectNodes(n) // marca
  neighbourhoodHighlight({ nodes: n }) // destaque
  return n
}


// seleciona varios
function selectNodes(n) {
  network.selectNodes(n)
  filterHighlight({ nodes: n }) // filtra
  return n
}


// filtro por prop
function highlightFilter(f) {

  let sel = []
  let prop = f['property']

  if (f['item'] === 'node') {

    let all = nodes.get({ returnType: "Object" })

    for (let id in all) {
      if (
        all[id][prop] &&
        f['value'].includes(all[id][prop].toString())
      ) {
        sel.push(id)
      }
    }

  } else if (f['item'] === 'edge') {

    let allE = edges.get({ returnType: 'object' })

    for (let e in allE) {
      if (
        allE[e][prop] &&
        f['value'].includes(allE[e][prop].toString())
      ) {
        sel.push(allE[e]['from'])
        sel.push(allE[e]['to'])
      }
    }
  }

  selectNodes(sel) // aplica
}