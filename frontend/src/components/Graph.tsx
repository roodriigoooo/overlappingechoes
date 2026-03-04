import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode } from '../types'

// ─── Anchor song archetypes ────────────────────────────────────────────────
interface AnchorSongDef {
  song: string
  artist: string
  desc: string
}

interface AnchorCategory {
  id: string
  label: string
  color: string
  corner: 'tl' | 'tr' | 'bl' | 'br'
  songs: AnchorSongDef[]
}

interface PickedAnchor {
  id: string
  label: string
  color: string
  corner: 'tl' | 'tr' | 'bl' | 'br'
  song: string
  artist: string
  desc: string
}

const LYRIC_CATEGORIES: AnchorCategory[] = [
  {
    id: 'romantic', label: 'Romantic', color: '#FF69B4', corner: 'tl',
    songs: [
      { song: 'Perfect', artist: 'Ed Sheeran', desc: 'A timeless declaration of love at its most tender.' },
      { song: 'All of Me', artist: 'John Legend', desc: 'Vulnerability and devotion woven into every line.' },
      { song: 'Lover', artist: 'Taylor Swift', desc: 'Two worlds colliding in a perfect lyrical embrace.' },
      { song: 'Make You Feel My Love', artist: 'Bob Dylan', desc: 'A quiet promise of unconditional affection.' },
      { song: 'Bloom', artist: 'The Paper Kites', desc: 'Intimate and hushed — love at its most poetic.' },
    ],
  },
  {
    id: 'party', label: 'Party Anthems', color: '#FFD700', corner: 'tr',
    songs: [
      { song: 'Blinding Lights', artist: 'The Weeknd', desc: 'Euphoric rush of synth-pop ecstasy.' },
      { song: 'Levitating', artist: 'Dua Lipa', desc: 'An irresistible invitation to lose yourself in the beat.' },
      { song: 'Uptown Funk', artist: 'Bruno Mars', desc: 'Pure groove incarnate — impossible not to move.' },
      { song: "Can't Stop the Feeling!", artist: 'Justin Timberlake', desc: 'The world stops, the music starts.' },
      { song: 'Good as Hell', artist: 'Lizzo', desc: 'A battle cry of confidence and joy.' },
    ],
  },
  {
    id: 'introspective', label: 'Introspective', color: '#8AB4F8', corner: 'bl',
    songs: [
      { song: 'Skinny Love', artist: 'Bon Iver', desc: 'Quiet anguish rendered in perfect musical detail.' },
      { song: 'Liability', artist: 'Lorde', desc: 'Unflinching self-examination set to piano and pain.' },
      { song: 'Motion Picture Soundtrack', artist: 'Radiohead', desc: 'A farewell so tender it aches.' },
      { song: '4:44', artist: 'Jay-Z', desc: 'Confessional rap at its most raw and honest.' },
      { song: 'Lua', artist: 'Bright Eyes', desc: 'Vulnerability and longing in hushed acoustic tones.' },
    ],
  },
  {
    id: 'timeless', label: 'Timeless', color: '#C77DFF', corner: 'br',
    songs: [
      { song: 'Bohemian Rhapsody', artist: 'Queen', desc: 'An opera, a rock ballad, a confession all at once.' },
      { song: 'Hallelujah', artist: 'Leonard Cohen', desc: 'Sacred and broken — poetry in its purest form.' },
      { song: 'Strange Fruit', artist: 'Billie Holiday', desc: 'A protest so devastating it changed everything.' },
      { song: "What's Going On", artist: 'Marvin Gaye', desc: "A question the world still can't answer." },
      { song: 'Yesterday', artist: 'The Beatles', desc: 'The most covered song in history — for good reason.' },
    ],
  },
]

const TASTE_CATEGORIES: AnchorCategory[] = [
  {
    id: 'pop', label: 'Pop / Mainstream', color: '#00E5FF', corner: 'tl',
    songs: [
      { song: 'Anti-Hero', artist: 'Taylor Swift', desc: 'Chart-conquering vulnerability with a wink.' },
      { song: 'As It Was', artist: 'Harry Styles', desc: 'Melancholic pop perfection, inescapable and brilliant.' },
      { song: 'Bad Guy', artist: 'Billie Eilish', desc: 'Cool subversion wrapped in an irresistible pop hook.' },
      { song: 'Shape of You', artist: 'Ed Sheeran', desc: "Billions of streams don't lie." },
      { song: 'Flowers', artist: 'Miley Cyrus', desc: 'Empowerment pop at its most anthemic.' },
    ],
  },
  {
    id: 'electronic', label: 'Electronic / Dance', color: '#FF3EA5', corner: 'tr',
    songs: [
      { song: 'One More Time', artist: 'Daft Punk', desc: 'The sound of electronic music reaching its zenith.' },
      { song: 'Strobe', artist: 'deadmau5', desc: 'Ten minutes of transcendence — no words needed.' },
      { song: 'Midnight City', artist: 'M83', desc: 'A neon-lit chase through a dream of a city.' },
      { song: 'Around the World', artist: 'Daft Punk', desc: "A loop that never grows old — that's the genius." },
      { song: 'Latch', artist: 'Disclosure', desc: 'UK garage warmth and electronic precision combined.' },
    ],
  },
  {
    id: 'indie', label: 'Indie / Folk', color: '#FFBC42', corner: 'bl',
    songs: [
      { song: 'Holocene', artist: 'Bon Iver', desc: 'Small moments expanding to fill the universe.' },
      { song: 'Fast Car', artist: 'Tracy Chapman', desc: 'Folk storytelling that breaks hearts without trying.' },
      { song: 'First Day of My Life', artist: 'Bright Eyes', desc: 'A love song as a quiet revelation.' },
      { song: 'Lua', artist: 'Bright Eyes', desc: 'Perfectly imperfect indie folk at its most honest.' },
      { song: 'Re: Stacks', artist: 'Bon Iver', desc: 'Emotional archaeology set to acoustic guitar.' },
    ],
  },
  {
    id: 'hiphop', label: 'Hip-Hop / R&B', color: '#FF7043', corner: 'br',
    songs: [
      { song: 'HUMBLE.', artist: 'Kendrick Lamar', desc: 'A masterclass in confidence and self-awareness.' },
      { song: 'Alright', artist: 'Kendrick Lamar', desc: "A protest anthem that became a generation's rallying cry." },
      { song: 'Pink Matter', artist: 'Frank Ocean', desc: 'R&B as a meditation on consciousness and desire.' },
      { song: 'All Falls Down', artist: 'Kanye West', desc: 'Social commentary wrapped in an irresistible groove.' },
      { song: 'Superstar', artist: 'Lauryn Hill', desc: 'Neo-soul poetry that never ages.' },
    ],
  },
]

function pickSessionAnchors(categories: AnchorCategory[]): PickedAnchor[] {
  return categories.map(cat => {
    const picked = cat.songs[Math.floor(Math.random() * cat.songs.length)]
    return { id: cat.id, label: cat.label, color: cat.color, corner: cat.corner, ...picked }
  })
}

// Hollow diamond pixel art — 20×20px, origin top-left
const DIAMOND = [
  { x: 8,  y: 0,  w: 4, h: 4 },
  { x: 4,  y: 4,  w: 4, h: 4 },
  { x: 12, y: 4,  w: 4, h: 4 },
  { x: 0,  y: 8,  w: 4, h: 4 },
  { x: 16, y: 8,  w: 4, h: 4 },
  { x: 4,  y: 12, w: 4, h: 4 },
  { x: 12, y: 12, w: 4, h: 4 },
  { x: 8,  y: 16, w: 4, h: 4 },
]

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

interface AnchorInfo {
  label: string
  color: string
  song: string
  artist: string
  desc: string
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
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorInfo | null>(null)

  // Stable random picks per session — initialized once, one set per mode
  const anchorPicksRef = useRef<{ taste: PickedAnchor[]; lyric: PickedAnchor[] } | null>(null)
  if (!anchorPicksRef.current) {
    anchorPicksRef.current = {
      taste: pickSessionAnchors(TASTE_CATEGORIES),
      lyric: pickSessionAnchors(LYRIC_CATEGORIES),
    }
  }

  useEffect(() => {
    if (!svgRef.current) return

    const svgEl = svgRef.current
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    setSelectedNode(null)
    setEdgeLabel(null)
    setSelectedAnchor(null)

    if (!data || data.nodes.length === 0) return

    const { width, height } = svgEl.getBoundingClientRect()
    const cx = width / 2
    const cy = height / 2

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
      .force('center', d3.forceCenter(cx, cy))
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

    // User nodes
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
      .on('click', (_, d) => { setSelectedNode(d); setSelectedAnchor(null) })

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

    // ─── Anchor nodes (embedded archetype markers) ────────────────────────────
    const anchorPicks = mode === 'lyric'
      ? anchorPicksRef.current!.lyric
      : anchorPicksRef.current!.taste

    const marginX = Math.min(cx * 0.72, 340)
    const marginY = Math.min(cy * 0.68, 220)

    const cornerPos: Record<string, { x: number; y: number }> = {
      tl: { x: cx - marginX, y: cy - marginY },
      tr: { x: cx + marginX, y: cy - marginY },
      bl: { x: cx - marginX, y: cy + marginY },
      br: { x: cx + marginX, y: cy + marginY },
    }

    const anchorGroup = g.append('g').attr('class', 'anchors')

    anchorPicks.forEach(anchor => {
      const pos = cornerPos[anchor.corner]
      const grp = anchorGroup.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', 'pointer')
        .attr('opacity', 0.5)

      // Invisible hit area
      grp.append('circle').attr('r', 26).attr('fill', 'transparent')

      // Diamond pixels — centered (DIAMOND is 20×20, offset by -10)
      DIAMOND.forEach(p => {
        grp.append('rect')
          .attr('x', p.x - 10).attr('y', p.y - 10)
          .attr('width', p.w).attr('height', p.h)
          .attr('fill', anchor.color)
          .attr('shape-rendering', 'crispEdges')
          .style('pointer-events', 'none')
      })

      // Category label
      grp.append('text')
        .text(anchor.label.toUpperCase())
        .attr('text-anchor', 'middle')
        .attr('y', 20)
        .attr('fill', anchor.color)
        .attr('font-size', '8')
        .attr('font-weight', '700')
        .attr('font-family', "'Outfit', sans-serif")
        .attr('letter-spacing', '1.2')
        .style('pointer-events', 'none')
        .style('user-select', 'none')

      // Song name
      grp.append('text')
        .text(`"${anchor.song}"`)
        .attr('text-anchor', 'middle')
        .attr('y', 33)
        .attr('fill', 'rgba(255,255,255,0.38)')
        .attr('font-size', '8')
        .attr('font-style', 'italic')
        .attr('font-family', "'Outfit', sans-serif")
        .style('pointer-events', 'none')
        .style('user-select', 'none')

      grp
        .on('mouseenter', function () { d3.select(this).attr('opacity', 1) })
        .on('mouseleave', function () { d3.select(this).attr('opacity', 0.5) })
        .on('click', function (event: MouseEvent) {
          event.stopPropagation()
          setSelectedAnchor({ label: anchor.label, color: anchor.color, song: anchor.song, artist: anchor.artist, desc: anchor.desc })
          setSelectedNode(null)
        })
    })

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

      {selectedAnchor && (
        <div className="node-card">
          <div className="node-card-avatar" style={{
            background: `${selectedAnchor.color}1A`,
            border: `1px solid ${selectedAnchor.color}44`,
            color: selectedAnchor.color,
            fontSize: 16,
          }}>
            ♦
          </div>
          <div className="node-card-info">
            <div className="node-card-name">"{selectedAnchor.song}"</div>
            <div className="node-card-sub">
              {selectedAnchor.artist}
              <span style={{ marginLeft: 6, opacity: 0.55 }}>· {selectedAnchor.label}</span>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5, lineHeight: 1.5 }}>
              {selectedAnchor.desc}
            </div>
          </div>
          <button className="node-card-close" onClick={() => setSelectedAnchor(null)}>×</button>
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
