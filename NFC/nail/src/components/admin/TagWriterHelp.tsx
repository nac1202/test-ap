'use client'

import { useState } from 'react'
// import { TagStatus } from '@prisma/client' // TagStatus enum not exported by default in some prisma versions?

interface TagWriterHelpProps {
    tagCode: string
    status: string
    handle?: string | null
}

export default function TagWriterHelp({ tagCode, status, handle }: TagWriterHelpProps) {
    const [copied, setCopied] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    // Determine target URL based on status
    const getTargetUrl = () => {
        const baseUrl = typeof window !== 'undefined'
            ? window.location.origin.includes('localhost')
                ? 'http://192.168.1.2:3000'
                : window.location.origin
            : ''

        if (status === 'ACTIVE' && handle) {
            // If active and linked, write the profile URL
            return `${baseUrl}/u/${handle}`
        }

        // Otherwise (CREATED, etc), write the activation URL
        return `${baseUrl}/app/activate?code=${tagCode}`
    }

    const handleCopy = () => {
        const url = getTargetUrl()
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const isProfileUrl = status === 'ACTIVE' && !!handle

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-bold tracking-wide
                    ${isProfileUrl
                        ? 'bg-[#F2F8F6] text-[#2C7A60] hover:bg-[#D5EFE6] border-[#D5EFE6]'
                        : 'bg-white text-[#5F6F81] hover:bg-gray-50 border-[#E5E5E0]'}`}
            >
                {isProfileUrl ? '書き込み (公開用)' : '書き込み (有効化)'}
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">
                                {isProfileUrl ? '公開ページ用 書き込み' : '新規登録用 書き込み'}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-2">
                                {isProfileUrl
                                    ? 'お客様の公開ページURLです。タグに上書きすることで、スキャン時にこのページが開くようになります。'
                                    : 'まだ紐付けされていないタグです。このURLを書き込んでから、お客様にスキャンしてもらってください。'}
                            </p>

                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={getTargetUrl()}
                                    className="bg-gray-100 border rounded px-3 py-2 text-sm flex-1 font-mono"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-3 py-2 rounded text-sm font-bold text-white transition ${copied ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {copied ? 'コピー完了' : 'コピー'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded p-4 text-sm text-gray-700">
                            <h4 className="font-bold mb-2">手順</h4>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>上記URLをコピー</li>
                                <li>NFC書き込みアプリ (NFC Tools等) を開く</li>
                                <li><strong>Write</strong> &gt; <strong>Add a record</strong> &gt; <strong>URL / URI</strong></li>
                                <li>ペースト &gt; <strong>OK</strong> &gt; <strong>Write</strong></li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
