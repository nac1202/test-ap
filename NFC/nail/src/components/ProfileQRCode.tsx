'use client'

import React, { useState } from 'react'
import { QrCode, X } from 'lucide-react'
import TagQRCode from './TagQRCode'

export default function ProfileQRCode({ url, size }: { url: string, size?: number }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {size ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="hover:scale-105 transition-transform"
                >
                    <TagQRCode value={url} size={size} className="rounded-lg shadow-sm" />
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition"
                >
                    <QrCode className="w-4 h-4 mr-1" />
                    QRコードを表示 (シェア)
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full relative shadow-2xl transform transition-all scale-100">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">プロフィールをシェア</h3>
                            <p className="text-sm text-gray-500 mb-8">カメラで読み取ってアクセス</p>

                            <div className="flex justify-center mb-6">
                                <TagQRCode value={url} size={200} className="shadow-inner rounded-xl p-4 border border-gray-100" />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 break-all">
                                <p className="text-xs text-gray-500 font-mono">{url}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
