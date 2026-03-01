'use client'

import { useEffect } from 'react'

export default function AnalyticsTracker({ handle }: { handle: string }) {
    useEffect(() => {
        // Only track once per session per handle
        const tracked = sessionStorage.getItem(`tracked_view_${handle}`)
        if (tracked) return

        fetch('/api/analytics/view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ handle })
        })
            .then(res => {
                if (res.ok) {
                    sessionStorage.setItem(`tracked_view_${handle}`, 'true')
                }
            })
            .catch(err => console.error('Failed to track view', err))
    }, [handle])

    return null
}
