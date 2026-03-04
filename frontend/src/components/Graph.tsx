import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode } from '../types'

// ─── Persona archetypes ────────────────────────────────────────────────────
interface Persona {
  label: string
  desc: string
  corner: 'tl' | 'tr' | 'bl' | 'br'
}

const TASTE_PERSONAS: Persona[] = [
  { label: 'Pop / Mainstream',    desc: 'Chart-topping hits, broad appeal, high energy anthems',     corner: 'tl' },
  { label: 'Electronic / Dance',  desc: 'Synthesized beats, club culture, sonic experimentation',     corner: 'tr' },
  { label: 'Indie / Folk',        desc: 'Acoustic textures, DIY spirit, intimate storytelling',       corner: 'bl' },
  { label: 'Hip-Hop / R&B',       desc: 'Rhythmic poetry, soul-rooted grooves, cultural expression', corner: 'br' },
]

const LYRIC_PERSONAS: Persona[] = [
  { label: 'Romantic',        desc: 'Love songs, longing, emotional vulnerability',           corner: 'tl' },
  { label: 'Party Anthems',   desc: 'Celebration, euphoria, living in the moment',            corner: 'tr' },
  { label: 'Introspective',   desc: 'Self-reflection, existential depth, quiet honesty',      corner: 'bl' },
  { label: 'Timeless Classics', desc: 'Universal themes, enduring imagery, poetic craft',     corner: 'br' },
]

// Hollow diamond pixel art — 5×5 at 4px → 20px
const DIAMOND: { x: number; y: number; w: number; h: number }[] = [
  { x: 8,  y: 0,  w: 4, h: 4 },   // top tip
  { x: 4,  y: 4,  w: 4, h: 4 },
  { x: 12, y: 4,  w: 4, h: 4 },
  { x: 0,  y: 8,  w: 4, h: 4 },   // mid-left
  { x: 16, y: 8,  w: 4, h: 4 },   // mid-right
  { x: 4,  y: 12, w: 4, h: 4 },
  { x: 12, y: 12, w: 4, h: 4 },
  { x: 8,  y: 16, w: 4, h: 4 },   // bottom tip
]

function PersonaNode({ persona, hovered, onEnter, onLeave }: {
  persona: Persona
  hovered: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const isTop    = persona.corner === 'tl' || persona.corner === 'tr'
  const isLeft   = persona.corner === 'tl' || persona.corner === 'bl'
  const textAlign = isLeft ? 'left' : 'right'

  const pos: React.CSSProperties = {
    position: 'absolute',
    [isTop  ? 'top'    : 'bottom']: 72,
    [isLeft ? 'left'   : 'right']:  68,
  }

  return (
    <div
      style={{
        ...pos,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isLeft ? 'flex-start' : 'flex-end',
        gap: 7,
        opacity: hovered ? 0.72 : 0.22,
        transition: 'opacity 0.25s ease',
        cursor: 'default',
        pointerEvents: 'all',
        userSelect: 'none',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Pixel diamond */}
      <svg width={20} height={20} shapeRendering="crispEdges">
        {DIAMOND.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h}
            fill={hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)'}
          />
        ))}
      </svg>

      {/* Label */}
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.4,
        textTransform: 'uppercase' as const,
        color: 'rgba(255,255,255,0.9)',
        textAlign,
        lineHeight: 1.2,
      }}>
        {persona.label}
      </div>

      {/* Description — only when hovered */}
      {hovered && (
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          textAlign,
          maxWidth: 140,
          lineHeight: 1.5,
        }}>
          {persona.desc}
        </div>
      )}
    </div>
  )
}

function PersonaOverlay({ mode }: { mode: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const personas = mode === 'lyric' ? LYRIC_PERSONAS : TASTE_PERSONAS

  return (
    <>
      {personas.map(p => (
        <PersonaNode
          key={p.corner}
          persona={p}
          hovered={hovered === p.corner}
          onEnter={() => setHovered(p.corner)}
          onLeave={() => setHovered(null)}
        />
      ))}
    </>
  )
}

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

// Pixel-circle geometry
// Large (current user): 7×7 grid, pixel-size 4 → 28px total, spans [-14, +14]
const LARGE_PIXELS = [
  { x: -6,  y: -14, w: 12, h: 4 },
  { x: -10, y: -10, w: 20, h: 4 },
  { x: -14, y: -6,  w: 28, h: 4 },
  { x: -14, y: -2,  w: 28, h: 4 },
  { x: -14, y:  2,  w: 28, h: 4 },
  { x: -10, y:  6,  w: 20, h: 4 },
  { x:  -6, y: 10,  w: 12, h: 4 },
] as const

// Small (friends): 5×5 grid, pixel-size 4 → 20px total, spans [-10, +10]
const SMALL_PIXELS = [
  { x: -6,  y: -10, w: 12, h: 4 },
  { x: -10, y: -6,  w: 20, h: 4 },
  { x: -10, y: -2,  w: 20, h: 4 },
  { x: -10, y:  2,  w: 20, h: 4 },
  { x:  -6, y:  6,  w: 12, h: 4 },
] as const

// Outer glow ring (one pixel shell outside large circle)
const LARGE_RING_PIXELS = [
  { x: -6,  y: -18, w: 12, h: 4 },
  { x: -14, y: -14, w: 8,  h: 4 },
  { x:  6,  y: -14, w: 8,  h: 4 },
  { x: -18, y: -10, w: 4,  h: 24 },
  { x:  14, y: -10, w: 4,  h: 24 },
  { x: -14, y: 10,  w: 8,  h: 4 },
  { x:  6,  y: 10,  w: 8,  h: 4 },
  { x: -6,  y: 14,  w: 12, h: 4 },
] as const

const nSize = (d: SimNode) => d.isCurrentUser ? 14 : 10

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

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => { g.attr('transform', event.transform) })

    svg.call(zoom)

    // Opacity by similarity to current user
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
      return 0.18 + sim * 0.82
    }

    const nodes: SimNode[] = data.nodes.map(n => ({ ...n }))
    const nodeById = new Map(nodes.map(n => [n.userId, n]))

    const links: SimLink[] = data.edges
      .map(e => ({ source: e.source, target: e.target, similarity: e.similarity }))
      .filter(l => nodeById.has(l.source as string) && nodeById.has(l.target as string))

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.userId)
        .strength(d => 0.3 + d.similarity * 0.5)
        .distance(d => 190 - d.similarity * 80))
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>(d => nSize(d) + 20))

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
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on('click', (_, d) => setSelectedNode(d))

    // Transparent hit area (enables pointer events on <g>)
    nodeSel.append('circle')
      .attr('r', d => nSize(d) + 6)
      .attr('fill', 'transparent')

    // Lyric-ready glow ring (pixel outline)
    nodeSel.filter(d => d.lyricStatus === 'ready' && d.isCurrentUser)
      .each(function () {
        const group = d3.select(this)
        LARGE_RING_PIXELS.forEach(p => {
          group.append('rect')
            .attr('x', p.x).attr('y', p.y)
            .attr('width', p.w).attr('height', p.h)
            .attr('fill', '#00FF41')
            .attr('fill-opacity', 0.30)
            .attr('shape-rendering', 'crispEdges')
            .style('pointer-events', 'none')
        })
      })

    // Pixel circle body
    nodeSel.each(function (d) {
      const group = d3.select<SVGGElement, SimNode>(this as SVGGElement)
      const pixels = d.isCurrentUser ? LARGE_PIXELS : SMALL_PIXELS
      const fill = d.isCurrentUser
        ? '#00FF41'
        : `rgba(0, 255, 65, ${getNodeOpacity(d.userId)})`

      pixels.forEach(p => {
        group.append('rect')
          .attr('x', p.x).attr('y', p.y)
          .attr('width', p.w).attr('height', p.h)
          .attr('fill', fill)
          .attr('shape-rendering', 'crispEdges')
          .style('pointer-events', 'none')
      })
    })

    // Initials — current user only (28px circle can fit them)
    nodeSel.filter(d => d.isCurrentUser)
      .append('text')
      .text(d => initials(d.displayName))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#000')
      .attr('font-size', '9')
      .attr('font-weight', '700')
      .attr('font-family', "'Outfit', sans-serif")
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Name label below node
    nodeSel.append('text')
      .text(d => d.displayName.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('y', d => nSize(d) + 14)
      .attr('fill', 'rgba(255,255,255,0.75)')
      .attr('font-size', '10')
      .attr('font-weight', '500')
      .attr('font-family', "'Outfit', sans-serif")
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    sim.on('tick', () => {
      edgeSel
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [data])

  const solo = !data || data.nodes.length <= 1

  return (
    <>
      <svg
        ref={svgRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <PersonaOverlay mode={mode} />

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
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 3,
          padding: '4px 12px',
          fontSize: '11px',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 600,
          color: '#111',
          pointerEvents: 'none',
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
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
                <span style={{ color: '#16a34a', fontSize: 10 }}>● lyric ready</span>
              )}
              {selectedNode.lyricStatus === 'pending' && (
                <span style={{ color: '#d97706', fontSize: 10 }}>● computing</span>
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
