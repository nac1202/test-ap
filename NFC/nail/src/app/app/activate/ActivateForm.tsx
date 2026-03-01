'use client'

import { useState } from 'react'
import { activateTag } from '@/actions/tag'
import { useRouter } from 'next/navigation'

export default function ActivateForm({ tagCode, isReplacement }: { tagCode: string, isReplacement: boolean }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function handleActivate() {
        if (!confirm(isReplacement ? "現在のタグを交換してもよろしいですか？" : "このタグを有効化しますか？")) return

        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('tagCode', tagCode)

        const res = await activateTag(formData)

        if (res?.error) {
            setError(res.error)
            setLoading(false)
        } else if (res?.redirectUrl) {
            router.push(res.redirectUrl)
        } else {
            router.push('/app/profile')
        }
    }

    return (
        <div>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <button
                onClick={handleActivate}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition disabled:opacity-50 ${isReplacement ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {loading ? '処理中...' : (isReplacement ? '現在のタグを交換' : 'タグを有効化')}
            </button>
        </div>
    )
}
