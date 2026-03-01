import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode } from '../types'

type SimNode = d3.SimulationNodeDatum & GraphNode

type SimLink = d3.SimulationLinkDatum<SimNode> & { similarity: number }

interface Props {
  data: GraphData | null
  mode: string
}

interface EdgeLabel {
  x: number
  y: number
  sim: number
}

export default function Graph({ data, mode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [edgeLabel, setEdgeLabel] = useState<EdgeLabel | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svgEl = svgRef.current
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    setSelectedNode(null)
    setEdgeLabel(null)

    if (!data || data.nodes.length === 0) return

    const { width, height } = svgEl.getBoundingClientRect()

    // Root group for zoom/pan
    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Build simulation data
    const nodes: SimNode[] = data.nodes.map(n => ({ ...n }))
    const nodeById = new Map(nodes.map(n => [n.userId, n]))

    const links: SimLink[] = data.edges
      .map(e => ({
        source: e.source,
        target: e.target,
        similarity: e.similarity,
      }))
      .filter(l => nodeById.has(l.source as string) && nodeById.has(l.target as string))

    // Force simulation
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.userId)
        .strength(d => 0.3 + d.similarity * 0.5)
        .distance(d => 180 - d.similarity * 80))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>(d => d.isCurrentUser ? 38 : 32))

    // Edges
    const edgeGroup = g.append('g').attr('class', 'edges')
    const edgeSel = edgeGroup.selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => edgeColor(d.similarity))
      .attr('stroke-width', d => 1 + d.similarity * 2.5)
      .attr('stroke-opacity', d => 0.3 + d.similarity * 0.5)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        d3.select(this).attr('stroke-opacity', 1).attr('stroke-width', d.similarity * 2.5 + 2.5)
        const rect = svgEl.getBoundingClientRect()
        setEdgeLabel({ x: event.clientX - rect.left, y: event.clientY - rect.top, sim: d.similarity })
      })
      .on('mousemove', function (event: MouseEvent) {
        const rect = svgEl.getBoundingClientRect()
        setEdgeLabel(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('stroke-opacity', 0.3 + d.similarity * 0.5).attr('stroke-width', 1 + d.similarity * 2.5)
        setEdgeLabel(null)
      })

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const nodeSel = nodeGroup.selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on('click', (_, d) => setSelectedNode(d))

    // Glow ring for lyric-ready nodes
    nodeSel.filter(d => d.lyricStatus === 'ready')
      .append('circle')
      .attr('r', d => (d.isCurrentUser ? 30 : 24) + 6)
      .attr('fill', 'none')
      .attr('stroke', '#34d399')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35)

    // Main circle
    nodeSel.append('circle')
      .attr('r', d => d.isCurrentUser ? 30 : 24)
      .attr('fill', d => d.isCurrentUser ? 'rgba(124,106,247,0.14)' : 'rgba(18,18,36,0.9)')
      .attr('stroke', d => d.isCurrentUser ? '#7c6af7' : '#252545')
      .attr('stroke-width', d => d.isCurrentUser ? 2 : 1.5)

    // Initials label
    nodeSel.append('text')
      .text(d => initials(d.displayName))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => d.isCurrentUser ? '#9580ff' : '#6a6a90')
      .attr('font-size', d => d.isCurrentUser ? '13' : '11')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Name label below node
    nodeSel.append('text')
      .text(d => d.displayName.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('y', d => (d.isCurrentUser ? 30 : 24) + 14)
      .attr('fill', '#35354a')
      .attr('font-size', '10')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Tick
    sim.on('tick', () => {
      edgeSel
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [data, mode])

  const solo = !data || data.nodes.length <= 1

  return (
    <>
      <svg
        ref={svgRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {solo && (
        <div className="graph-hint">
          <p>Add friends to see how your<br />music taste connects.</p>
        </div>
      )}

      {edgeLabel && (
        <div style={{
          position: 'absolute',
          left: edgeLabel.x,
          top: edgeLabel.y - 36,
          transform: 'translateX(-50%)',
          background: 'rgba(14,14,28,0.92)',
          border: '1px solid #252545',
          borderRadius: '8px',
          padding: '4px 12px',
          fontSize: '12px',
          color: '#ddddf0',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          zIndex: 20,
        }}>
          {Math.round(edgeLabel.sim * 100)}% match
        </div>
      )}

      {selectedNode && (
        <div className="node-card">
          <div className="node-card-avatar">
            {initials(selectedNode.displayName)}
          </div>
          <div className="node-card-info">
            <div className="node-card-name">{selectedNode.displayName}</div>
            <div className="node-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{selectedNode.isCurrentUser ? 'You' : selectedNode.spotifyId}</span>
              {selectedNode.lyricStatus === 'ready' && (
                <span style={{ color: '#34d399', fontSize: 11 }}>● lyric ready</span>
              )}
              {selectedNode.lyricStatus === 'pending' && (
                <span style={{ color: '#fbbf24', fontSize: 11 }}>● computing…</span>
              )}
            </div>
          </div>
          <button className="node-card-close" onClick={() => setSelectedNode(null)}>×</button>
        </div>
      )}
    </>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function edgeColor(sim: number): string {
  if (sim >= 0.75) return '#34d399'
  if (sim >= 0.55) return '#7c6af7'
  if (sim >= 0.35) return '#6b5db8'
  return '#2e2e50'
}
