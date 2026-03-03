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

// Node "radius" (half of square side)
const nSize = (d: SimNode) => d.isCurrentUser ? 28 : 20

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
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Calculate dynamic node opacity based on similarity to current user
    const currentUser = data.nodes.find(n => n.isCurrentUser)
    const currentUserId = currentUser?.userId

    const nodeOpacityMap = new Map<string, number>()
    if (currentUserId) {
      data.edges.forEach(e => {
        if (e.source === currentUserId) {
          nodeOpacityMap.set(e.target as string, Math.max(nodeOpacityMap.get(e.target as string) || 0, e.similarity))
        } else if (e.target === currentUserId) {
          nodeOpacityMap.set(e.source as string, Math.max(nodeOpacityMap.get(e.source as string) || 0, e.similarity))
        }
      })
    }

    const getNodeOpacity = (userId: string) => {
      const sim = nodeOpacityMap.get(userId) || 0
      return 0.15 + (sim * 0.85)
    }

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
        .distance(d => 190 - d.similarity * 80))
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>(d => nSize(d) + 10))

    // Edges
    const edgeGroup = g.append('g').attr('class', 'edges')
    const edgeSel = edgeGroup.selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => edgeColor(d.similarity))
      .attr('stroke-width', d => 1 + d.similarity * 2)
      .attr('stroke-opacity', d => 0.25 + d.similarity * 0.5)
      .attr('stroke-linecap', 'square')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        d3.select(this).attr('stroke-opacity', 1).attr('stroke-width', d.similarity * 2 + 2.5)
        const rect = svgEl.getBoundingClientRect()
        setEdgeLabel({ x: event.clientX - rect.left, y: event.clientY - rect.top, sim: d.similarity })
      })
      .on('mousemove', function (event: MouseEvent) {
        const rect = svgEl.getBoundingClientRect()
        setEdgeLabel(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('stroke-opacity', 0.25 + d.similarity * 0.5).attr('stroke-width', 1 + d.similarity * 2)
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

    // Outer glow ring for lyric-ready nodes
    nodeSel.filter(d => d.lyricStatus === 'ready')
      .append('rect')
      .attr('x', d => -(nSize(d) + 7))
      .attr('y', d => -(nSize(d) + 7))
      .attr('width', d => (nSize(d) + 7) * 2)
      .attr('height', d => (nSize(d) + 7) * 2)
      .attr('fill', 'none')
      .attr('stroke', '#00FF41')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35)
      .attr('shape-rendering', 'crispEdges')

    // Main square
    nodeSel.append('rect')
      .attr('x', d => -nSize(d))
      .attr('y', d => -nSize(d))
      .attr('width', d => nSize(d) * 2)
      .attr('height', d => nSize(d) * 2)
      .attr('fill', d => d.isCurrentUser
        ? '#00FF41'
        : `rgba(0, 255, 65, ${getNodeOpacity(d.userId)})`)
      .attr('stroke', '#00FF41')
      .attr('stroke-width', d => d.isCurrentUser ? 2 : 1)
      .attr('shape-rendering', 'crispEdges')

    // Inner inset frame — pixel art detail
    nodeSel.append('rect')
      .attr('x', d => -(nSize(d) - 5))
      .attr('y', d => -(nSize(d) - 5))
      .attr('width', d => (nSize(d) - 5) * 2)
      .attr('height', d => (nSize(d) - 5) * 2)
      .attr('fill', 'none')
      .attr('stroke', d => d.isCurrentUser ? 'rgba(0,0,0,0.25)' : 'rgba(0,255,65,0.22)')
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges')
      .style('pointer-events', 'none')

    // Initials label
    nodeSel.append('text')
      .text(d => initials(d.displayName))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => d.isCurrentUser ? '#000000' : '#00FF41')
      .attr('font-size', d => d.isCurrentUser ? '13' : '10')
      .attr('font-weight', '700')
      .attr('font-family', '"Courier New", Courier, monospace')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Name label below node
    nodeSel.append('text')
      .text(d => d.displayName.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('y', d => nSize(d) + 13)
      .attr('fill', 'rgba(0,255,65,0.6)')
      .attr('font-size', '10')
      .attr('font-family', '"Courier New", Courier, monospace')
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
          background: 'rgba(3, 6, 3, 0.94)',
          border: '1px solid rgba(0,255,65,0.25)',
          padding: '4px 12px',
          fontSize: '11px',
          fontFamily: '"Courier New", monospace',
          color: '#00FF41',
          pointerEvents: 'none',
          backdropFilter: 'blur(12px)',
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
              <span>{selectedNode.isCurrentUser ? 'you' : selectedNode.spotifyId}</span>
              {selectedNode.lyricStatus === 'ready' && (
                <span style={{ color: '#00FF41', fontSize: 10, letterSpacing: '0.3px' }}>■ lyric ready</span>
              )}
              {selectedNode.lyricStatus === 'pending' && (
                <span style={{ color: '#fbbf24', fontSize: 10, letterSpacing: '0.3px' }}>■ computing</span>
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
  if (sim >= 0.75) return '#00FF41'
  if (sim >= 0.55) return '#00CC33'
  if (sim >= 0.35) return '#009922'
  return '#005511'
}
