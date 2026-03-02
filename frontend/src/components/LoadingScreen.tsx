import React, { useState, useEffect } from 'react'

const quotes = [
    "Is this the real life? Is this just fantasy?",
    "We can be heroes, just for one day...",
    "Hello darkness, my old friend...",
    "I bless the rains down in Africa...",
    "And she's buying a stairway to heaven...",
    "Because maybe, you're gonna be the one that saves me...",
    "Here comes the sun...",
    "All you need is love..."
]

interface Props {
    text?: string
}

export default function LoadingScreen({ text }: Props) {
    const [quoteIdx, setQuoteIdx] = useState(0)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        setQuoteIdx(Math.floor(Math.random() * quotes.length))
        const int = setInterval(() => {
            setVisible(false)
            setTimeout(() => {
                setQuoteIdx(prev => (prev + 1) % quotes.length)
                setVisible(true)
            }, 300)
        }, 2500)
        return () => clearInterval(int)
    }, [])

    return (
        <div className="loading-screen" style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            color: 'var(--accent)',
            fontFamily: 'Outfit, system-ui, sans-serif'
        }}>
            <div style={{
                width: 28, height: 28,
                marginBottom: 24,
                border: '3px solid var(--accent)',
                animation: 'spin 0.8s infinite steps(8)' // retro segmented spinning
            }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>
                {text || 'LOADING_'}
            </h2>
            <p style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.3s ease',
                textAlign: 'center',
                maxWidth: '80%'
            }}>
                "{quotes[quoteIdx]}"
            </p>
        </div>
    )
}
