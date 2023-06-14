/* Copyright 2023 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

window.initKqCircuit = function(model){
  const n_num_tokens = model.hyper.n_num_tokens

  let {embeddingMatrix, keyW, queryW, valueW, linearW} = model.params
  const hyper = model.hyper

  let keyHeads = keyW
    .reshape([hyper.model_size, hyper.num_heads, hyper.key_size])
    .split(model.hyper.num_heads, 1)
    .map(d => d.squeeze([1]))

  let queryHeads = queryW
    .reshape([hyper.model_size, hyper.num_heads, hyper.key_size])
    .split(model.hyper.num_heads, 1)
    .map(d => d.squeeze([1]))

  // First dim is query
  const kqCircuits = d3.range(hyper.num_heads)
    .map(i => embeddingMatrix
      .matMul(queryHeads[i])
      .matMul(keyHeads[i].transpose())
      .matMul(embeddingMatrix.transpose())
    )

  var headSel = d3.select('.kq-circuit').html('')
    .appendMany('div', kqCircuits)
    .st({display: 'inline-block'})
    .each(drawCircuit)

  function drawCircuit(kqCircuit, headIndex){

    var s = 2
    var pad = 5

    const c = d3.conventions({
      sel: d3.select(this).append('div'),
      height: 99*s,
      width: 99*s,
      margin: {left: 20, bottom: 60, right: 40},
      layers: 'sc',
    })

    c.svg.append('text').text('Head ' + headIndex)
      .at({textAnchor: 'middle', x: c.width/2, y: -2})

    c.x.domain([0, 99])
    c.y.domain([99, 0])

    c.svg.append('text').text('Head ' + headIndex)
      .at({textAnchor: 'middle', x: c.width/2, y: -2})

    var lTick = 100 + pad*1.5
    c.xAxis
      .tickValues([0, 20, 40, 60, 80, lTick, lTick + pad])
      .tickFormat(d => d < 100 ? d : d == lTick ? 'L' : 'R')
    c.yAxis
      .tickValues([0, 20, 40, 60, 80, lTick, lTick + pad])
      .tickFormat(d => d < 100 ? d : d == lTick ? 'L' : 'R')

    d3.drawAxis(c)
    c.svg.select('.x').translate(c.height + 35, 1)
    util.addAxisLabel(c, 'Key Token', 'Query Token', 28)

    if (headIndex) c.svg.select('.y .axis-label').remove()

    var ctx = c.layers[1]
    function render(){
      var grid = kqCircuit.arraySync()
      grid.forEach((row, i) => {
        row.forEach((v, j) => {
          if (i > 101 || j > 101) return // skip pad token

          var dj = j
          var height = s
          if (j == 100) dj += pad
          if (j == 101) dj += pad*2
          if (j >= 100) height = pad*2

          var di = i
          var width = s
          if (i == 100) di += pad
          if (i == 101) di += pad*2
          if (i >= 100) width = pad*2

          ctx.beginPath()
          ctx.fillStyle = color(v)
          ctx.rect(dj*s, di*s, height, width)
          ctx.fill()
        })
      })
    }
    render()
      
    window.renderAll.fns.push({render})
  }

}


window.init?.()
