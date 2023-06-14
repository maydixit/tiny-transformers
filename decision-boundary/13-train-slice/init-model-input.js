window.initModelInput = (hyper) => {
  const rv = {
    boundary: window.modelInput?.boundary || {v: 30},
    xPositions: window.modelInput?.xPositions || d3.range((hyper.sequence_length + 1)/2)
      .map(i => ({i: i*2, v: Math.round(Math.random()*hyper.n_num_tokens)})),
  }
  _.last(rv.xPositions).isLast = true

  rv.calcInput = function(){
    let input = rv.xPositions
      .map(d => [d.v, d.v < rv.boundary.v ? hyper.n_num_tokens : hyper.n_num_tokens + 1])

    input = _.flatten(input)
    input.pop() // Inputs have final prediction chopped off
    rv.curInput = input
  }
  rv.calcInput()

  const sel = d3.select('.input').html('')//.st({display: 'none'})
  const c = d3.conventions({
    sel: sel.append('div'),
    height: 80,
    width: 200,
    margin: {left: 50, bottom: 20}
  })
  const curInputSel = sel.append('div')
    .st({marginLeft: c.margin.left})
    .appendMany('div.token-inline', d3.range(hyper.sequence_length))

  c.y.domain([0, hyper.sequence_length - 1])
  c.x.domain([0, hyper.n_num_tokens - 1])

  c.yAxis.ticks(3).tickFormat(d => d/2)
  d3.drawAxis(c)
  util.ggPlot(c, 0)
  util.addAxisLabel(c, '', 'Token Index')

  // c.svg.selectAll('.y text').remove()

  const xPosSel = c.svg.appendMany('circle.x-draggable', rv.xPositions)
    .at({
      cy: d => c.y(d.i),
      r: 5,
      strokeWidth: 1,
      stroke: '#000'
    })
  xPosSel.filter(d => d.isLast).st({fill: '#0ff'})

  const boundarySel = c.svg.append('path.x-draggable')
    .at({strokeWidth: 4, d: `M 0 0 V ${c.height}`, stroke: '#000', opacity: .3})
    .datum(rv.boundary)

  const drag = d3.drag()
    .on('drag', function(d){
      d.v = Math.round(d3.clamp(0, c.x.invert(d3.mouse(c.svg.node())[0]), hyper.n_num_tokens - 1))
      renderAll.input()
    })

  const xDraggableSel = c.svg.selectAll('.x-draggable')
    .call(drag).st({cursor: 'pointer'})

  function render(){
    rv.calcInput()

    xPosSel
      .at({fill: d => color.lr[d.v < rv.boundary.v]})

    xDraggableSel.translate(d => c.x(d.v), 0)

    curInputSel.data(rv.curInput)
      .text(d => d == 100 ? 'L' : d == 101 ? 'R' : d)
      .st({color: (d, i) => i == hyper.sequence_length - 1 ? '#0ff' : d < 100 ? '' : color.lr[d == 100]})
  }

  renderAll.inputFns.push(render)


  return rv
}
window.init?.()
