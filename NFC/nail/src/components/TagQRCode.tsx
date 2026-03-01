'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function TagQRCode({ value, size = 200, className = "" }: { value: string, size?: number, className?: string }) {
    return (
        <div className={`bg-white p-2 inline-block ${className}`}>
            <QRCodeSVG value={value} size={size} />
        </div>
    )
}
