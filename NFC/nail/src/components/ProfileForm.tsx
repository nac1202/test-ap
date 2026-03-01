'use client'

import { useState } from 'react'
import { getCloudinarySignature } from '@/actions/upload'
import { updateProfile } from '@/actions/profile'
import { useRouter } from 'next/navigation'
import { THEMES, ThemeType } from '@/lib/themes'

interface ProfileFormProps {
    initialData: {
        displayName: string | null
        handle: string | null
        bio: string | null
        avatarUrl: string | null
        linksJson: string
        theme?: string | null
    }
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [displayName, setDisplayName] = useState(initialData.displayName || '')
    const [handle, setHandle] = useState(initialData.handle || '')
    const [bio, setBio] = useState(initialData.bio || '')
    const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || '')
    const [theme, setTheme] = useState<string>((initialData.theme as string) || 'STANDARD')
    const [linksJson] = useState(initialData.linksJson || '[]') // Read-only for now or passed through

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            setError(null)

            // 1. Get signature
            const result = await getCloudinarySignature()

            if ('error' in result && result.error) {
                throw new Error(result.error)
            }

            const { signature, timestamp, cloudName, apiKey, transformation } = result as {
                signature: string
                timestamp: number
                cloudName: string
                apiKey: string
                transformation: string
            }

            // 2. Upload to Cloudinary
            const formData = new FormData()
            formData.append('file', file)
            formData.append('api_key', apiKey)
            formData.append('timestamp', timestamp.toString())
            formData.append('signature', signature)
            formData.append('transformation', transformation)
            // Optional: organize in folders if configured in signature generation
            // formData.append('folder', 'avatars') 

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error?.message || 'Upload failed')
            }

            const data = await response.json()
            setAvatarUrl(data.secure_url)
        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : '画像のアップロードに失敗しました')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('displayName', displayName)
        formData.append('handle', handle)
        formData.append('bio', bio)
        formData.append('avatarUrl', avatarUrl)
        formData.append('theme', theme)
        formData.append('linksJson', linksJson)

        const result = await updateProfile(formData)

        if (result?.error) {
            setError(result.error)
        } else {
            router.refresh()
            // Optionally redirect or show success
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    プロフィール画像
                </label>
                <div className="flex items-center space-x-6">
                    <div className="shrink-0 relative">
                        {avatarUrl ? (
                            <img
                                className="h-24 w-24 object-cover rounded-full border border-gray-200"
                                src={avatarUrl}
                                alt="Profile preview"
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                <span className="text-2xl">?</span>
                            </div>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-full">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            </div>
                        )}
                    </div>
                    <label className="block">
                        <span className="sr-only">Choose profile photo</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploading}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100
                                cursor-pointer disabled:opacity-50"
                        />
                    </label>
                </div>
            </div>

            <div>
                <label htmlFor="handle" className="block text-sm font-medium text-gray-700">
                    ユーザーID
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        @
                    </span>
                    <input
                        type="text"
                        name="handle"
                        id="handle"
                        required
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    表示名
                </label>
                <div className="mt-1">
                    <input
                        type="text"
                        name="displayName"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    自己紹介
                </label>
                <div className="mt-1">
                    <textarea
                        id="bio"
                        name="bio"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border"
                    />
                </div>
            </div>

            {/* Theme Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                    デザインテーマ
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {THEMES.map((themeOption) => (
                        <div
                            key={themeOption.id}
                            onClick={() => setTheme(themeOption.id as any)}
                            className={`
                                relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all duration-200
                                ${theme === themeOption.id
                                    ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-600'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                            `}
                        >
                            <div className={`h-12 w-12 rounded-full shrink-0 ${themeOption.color} border shadow-sm mr-4`}></div>
                            <div className="flex-1 min-w-0">
                                <span className={`block text-sm font-medium ${theme === themeOption.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                                    {themeOption.label}
                                </span>
                                <span className={`block text-xs mt-1 ${theme === themeOption.id ? 'text-indigo-700' : 'text-gray-500'}`}>
                                    {themeOption.description}
                                </span>
                            </div>
                            {theme === themeOption.id && (
                                <div className="absolute top-4 right-4 text-indigo-600">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={loading || uploading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? '保存中...' : '変更を保存'}
                </button>
            </div>
        </form>
    )
}
