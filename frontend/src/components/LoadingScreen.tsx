import React, { useState, useEffect } from 'react'

const quotes = [
    "Is this the real life? Is this just fantasy?",
    "We can be heroes, just for one day...",
    "Hello darkness, my old friend...",
    "I bless the rains down in Africa...",
    "And she's buying a stairway to heaven...",
    "Because maybe, you're gonna be the one that saves me...",
    "Here comes the sun...",
    "All you need is love...",
    "Every breath you take, every move you make...",
    "Don't stop believin', hold on to the feeling...",
]

// Pixel art grids — 1 = filled, 0 = empty, 4px per cell
const NOTE_GRID = [
    [0,0,1,1,1,0],
    [0,0,1,0,1,0],
    [0,0,1,0,1,0],
    [0,0,1,0,0,0],
    [1,1,1,0,0,0],
    [1,1,0,0,0,0],
] as const

const HEADPHONES_GRID = [
    [0,1,1,1,1,0],
    [1,0,0,0,0,1],
    [1,1,0,0,1,1],
    [1,1,0,0,1,1],
    [1,1,0,0,1,1],
] as const

const PERSON_GRID = [
    [0,1,1,0],
    [0,1,1,0],
    [1,1,1,1],
    [1,1,1,1],
    [1,0,0,1],
    [1,0,0,1],
] as const

const WAVE_GRID = [
    [0,1,0,0,0,1,0],
    [1,0,1,0,1,0,1],
    [0,0,0,1,0,0,0],
    [0,0,0,0,0,0,0],
    [0,1,0,0,0,1,0],
    [1,0,1,0,1,0,1],
] as const

type PixelGrid = readonly (readonly number[])[]

const ICONS: { grid: PixelGrid; label: string }[] = [
    { grid: NOTE_GRID,       label: 'note' },
    { grid: HEADPHONES_GRID, label: 'phones' },
    { grid: PERSON_GRID,     label: 'person' },
    { grid: WAVE_GRID,       label: 'wave' },
]

function PixelArt({ grid, size = 4 }: { grid: PixelGrid; size?: number }) {
    const cols = grid[0].length
    const rows = grid.length
    return (
        <svg
            width={cols * size}
            height={rows * size}
            shapeRendering="crispEdges"
            style={{ display: 'block' }}
        >
            {grid.map((row, r) =>
                row.map((cell, c) =>
                    cell ? (
                        <rect
                            key={`${r}-${c}`}
                            x={c * size}
                            y={r * size}
                            width={size}
                            height={size}
                            fill="rgba(255,255,255,0.88)"
                        />
                    ) : null
                )
            )}
        </svg>
    )
}

interface Props {
    text?: string
}

export default function LoadingScreen({ text }: Props) {
    const [quoteIdx, setQuoteIdx] = useState(0)
    const [quoteVisible, setQuoteVisible] = useState(true)
    const [iconIdx, setIconIdx] = useState(0)
    const [iconVisible, setIconVisible] = useState(true)

    useEffect(() => {
        setQuoteIdx(Math.floor(Math.random() * quotes.length))

        // Quote cycling — every 2.8s
        const quoteInt = setInterval(() => {
            setQuoteVisible(false)
            setTimeout(() => {
                setQuoteIdx(prev => (prev + 1) % quotes.length)
                setQuoteVisible(true)
            }, 350)
        }, 2800)

        // Icon cycling — every 1.4s (twice as fast)
        const iconInt = setInterval(() => {
            setIconVisible(false)
            setTimeout(() => {
                setIconIdx(prev => (prev + 1) % ICONS.length)
                setIconVisible(true)
            }, 250)
        }, 1400)

        return () => {
            clearInterval(quoteInt)
            clearInterval(iconInt)
        }
    }, [])

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            fontFamily: 'Outfit, system-ui, sans-serif',
            gap: 0,
        }}>
            {/* Pixel icon — cycles through note / headphones / person / wave */}
            <div style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: iconVisible ? 1 : 0,
                transition: 'opacity 0.25s ease',
                marginBottom: 22,
            }}>
                <PixelArt grid={ICONS[iconIdx].grid} size={5} />
            </div>

            {/* Label */}
            <h2 style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 3,
                marginBottom: 18,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
            }}>
                {text || 'Loading'}
            </h2>

            {/* Cycling music quote */}
            <p style={{
                fontSize: 17,
                color: 'rgba(255,255,255,0.72)',
                fontStyle: 'italic',
                fontWeight: 300,
                opacity: quoteVisible ? 1 : 0,
                transition: 'opacity 0.35s ease',
                textAlign: 'center',
                maxWidth: '64%',
                lineHeight: 1.55,
                letterSpacing: 0.1,
            }}>
                "{quotes[quoteIdx]}"
            </p>
        </div>
    )
}
