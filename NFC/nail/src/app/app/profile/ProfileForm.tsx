'use client'

import { useState } from 'react'
import { updateProfile } from '@/actions/profile'
import { getCloudinarySignature } from '@/actions/upload'
import { PLATFORMS } from '@/lib/platforms'
import { THEMES } from '@/lib/themes'

interface LinkItem {
    type: string
    label: string
    url: string
}

interface ProfileFormProps {
    initialData: {
        displayName?: string | null
        handle?: string | null
        bio?: string | null
        avatarUrl?: string | null
        linksJson?: string
        theme?: string
    }
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const [links, setLinks] = useState<LinkItem[]>(() => {
        try {
            return initialData.linksJson ? JSON.parse(initialData.linksJson) : []
        } catch {
            return []
        }
    })

    const [theme, setTheme] = useState(initialData.theme || 'STANDARD')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Avatar State
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string>(initialData.avatarUrl || '')

    // Helper to resize image
    function resizeImage(file: File): Promise<File> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let width = img.width
                    let height = img.height
                    const MAX_WIDTH = 1200
                    const MAX_HEIGHT = 1200

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height
                            height = MAX_HEIGHT
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const resizedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(resizedFile)
                        } else {
                            reject(new Error('Canvas is empty'))
                        }
                    }, 'image/jpeg', 0.8)
                }
                img.onerror = reject
            }
            reader.onerror = reject
        })
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            try {
                // Resize image to max 1200px and 80% JPEG quality
                const resized = await resizeImage(file)
                setAvatarFile(resized)
                setAvatarPreview(URL.createObjectURL(resized))
            } catch (err) {
                console.error('Resize failed', err)
                // Fallback
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(file))
            }
        }
    }

    function addLink() {
        setLinks([...links, { type: 'website', label: '', url: '' }])
    }

    function updateLink(index: number, field: keyof LinkItem, value: string) {
        const newLinks = [...links]
        newLinks[index] = { ...newLinks[index], [field]: value }
        setLinks(newLinks)
    }

    function removeLink(index: number) {
        setLinks(links.filter((_, i) => i !== index))
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage('')

        // Append links as JSON
        formData.set('linksJson', JSON.stringify(links))

        // Append Theme
        formData.set('theme', theme)

        // Upload Avatar if new file selected
        if (avatarFile) {
            try {
                // Get Signature
                const sigRes = await getCloudinarySignature()
                if ('error' in sigRes) throw new Error(sigRes.error || 'Signature failed')

                // Upload to Cloudinary
                const uploadData = new FormData()
                uploadData.append('file', avatarFile)
                uploadData.append('api_key', sigRes.apiKey!)
                uploadData.append('timestamp', sigRes.timestamp.toString())
                uploadData.append('signature', sigRes.signature)
                uploadData.append('cloud_name', sigRes.cloudName!)
                uploadData.append('transformation', sigRes.transformation)

                const res = await fetch(`https://api.cloudinary.com/v1_1/${sigRes.cloudName}/image/upload`, {
                    method: 'POST',
                    body: uploadData
                })

                if (!res.ok) {
                    const errData = await res.json()
                    throw new Error(errData.error?.message || `Upload failed: ${res.status}`)
                }

                const data = await res.json()
                formData.set('avatarUrl', data.secure_url) // Add URL to profile update
            } catch (e) {
                console.error(e)
                setMessage('Error: Failed to upload image')
                setLoading(false)
                return
            }
        } else {
            if (initialData.avatarUrl) {
                formData.set('avatarUrl', initialData.avatarUrl)
            }
        }

        const res = await updateProfile(formData)
        setLoading(false)

        if (res.error) {
            setMessage(`Error: ${res.error}`)
        } else {
            setMessage('Profile updated successfully!')
        }
    }

    return (
        <form action={handleSubmit} className="space-y-12">
            <input type="hidden" name="theme" value={theme} />
            <div className="space-y-8">
                {/* Avatar Section */}
                <div>
                    <label className="block text-sm font-bold text-[#5F6F81] mb-4">プロフィール画像</label>
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#F9F9F8] border border-[#E5E5E0] shadow-sm group">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-80" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-[#CACAC8]">
                                    <span className="text-3xl">📷</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                id="avatar-upload"
                                className="hidden"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="cursor-pointer inline-block px-4 py-2 border border-[#E5E5E0] rounded-lg text-sm text-[#5F6F81] font-medium hover:bg-[#F9F9F8] hover:border-[#D5D5D0] transition-all bg-white shadow-sm"
                            >
                                画像を変更する
                            </label>
                            <p className="text-xs text-gray-400 mt-2">推奨: 正方形のJPG/PNG (10MB以下)</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-[#5F6F81] mb-1 uppercase tracking-wide">ユーザーID (URL)</label>
                        <div className="mt-1 flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-[#E5E5E0] bg-[#F5F5F0] text-gray-500 text-sm font-mono">
                                nail.link/u/
                            </span>
                            <input
                                type="text"
                                name="handle"
                                defaultValue={initialData.handle || ''}
                                required
                                pattern="^[a-zA-Z0-9_-]+$"
                                title="英数字、アンダースコア、ハイフンのみ"
                                className="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-r-lg border border-[#E5E5E0] focus:ring-1 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none bg-[#F9F9F8] text-[#5F6F81] transition-all"
                                placeholder="my-salon-name"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 pl-1">※半角英数字とハイフンのみ使用可能</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#5F6F81] mb-1 uppercase tracking-wide">表示名</label>
                        <input
                            type="text"
                            name="displayName"
                            defaultValue={initialData.displayName || ''}
                            required
                            className="w-full px-4 py-3 bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg focus:ring-1 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder-gray-300 text-[#5F6F81]"
                            placeholder="サロン名や担当者名"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#5F6F81] mb-1 uppercase tracking-wide">自己紹介</label>
                        <textarea
                            name="bio"
                            defaultValue={initialData.bio || ''}
                            rows={4}
                            className="w-full px-4 py-3 bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg focus:ring-1 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder-gray-300 text-[#5F6F81] resize-none"
                            placeholder="お店の雰囲気や得意なスタイルなどをご記入ください。"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-[#F5F5F0]" />

            {/* Design Theme Section */}
            <div>
                <h3 className="text-lg font-serif font-medium text-[#5F6F81] mb-6">デザインテーマ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {THEMES.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`cursor-pointer rounded-xl p-4 border transition-all relative overflow-hidden group
                                ${theme === t.id
                                    ? 'border-[#8D6E63] bg-white ring-2 ring-[#8D6E63] ring-opacity-20 shadow-md'
                                    : 'border-[#E5E5E0] bg-white hover:border-[#C5C5C0] hover:shadow-sm'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full border shadow-sm ${t.color}`}></div>
                                <div>
                                    <h4 className={`font-bold text-sm ${theme === t.id ? 'text-[#8D6E63]' : 'text-[#5F6F81]'}`}>{t.label}</h4>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t.description}</p>
                                </div>
                            </div>
                            {theme === t.id && (
                                <div className="absolute top-2 right-2 text-[#8D6E63]">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-[#F5F5F0]" />

            {/* Links Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-serif font-medium text-[#5F6F81]">リンク設定</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Instagram, 公式LINE, 予約サイトなど
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {links.map((link, idx) => (
                        <div key={idx} className="group flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#FAFAF9] p-4 rounded-xl border border-[#F5F5F0] hover:border-[#E5E5E0] transition-colors relative">
                            {/* Platform Selector */}
                            <div className="w-full sm:w-1/3 min-w-[140px]">
                                <select
                                    value={link.type || 'website'}
                                    onChange={e => updateLink(idx, 'type', e.target.value)}
                                    className="block w-full bg-white border border-[#E5E5E0] rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none text-[#5F6F81]"
                                >
                                    {PLATFORMS.map(p => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Inputs */}
                            <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                                <input
                                    type="text"
                                    value={link.label}
                                    onChange={e => updateLink(idx, 'label', e.target.value)}
                                    placeholder="リンク名 (例: Instagram)"
                                    className="block w-full sm:w-1/3 bg-white border border-[#E5E5E0] rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none text-[#5F6F81]"
                                    required
                                />
                                <input
                                    type="url"
                                    value={link.url}
                                    onChange={e => updateLink(idx, 'url', e.target.value)}
                                    placeholder="https://..."
                                    className="block w-full flex-1 bg-white border border-[#E5E5E0] rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-[#8D6E63] outline-none text-[#5F6F81] font-mono text-xs"
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => removeLink(idx)}
                                className="absolute -top-2 -right-2 sm:static sm:text-gray-400 sm:hover:text-[#8D6E63] bg-white sm:bg-transparent rounded-full p-1 shadow-sm sm:shadow-none border sm:border-none border-gray-100"
                                aria-label="削除"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addLink}
                        className="w-full py-3 border-2 border-dashed border-[#E5E5E0] rounded-xl text-sm font-bold text-gray-400 hover:text-[#5F6F81] hover:border-[#D5D5D0] hover:bg-[#FAFAF9] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="text-lg">+</span> リンクを追加する
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium animate-fade-in ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-[#E8F5E9] text-[#2E7D32]'}`}>
                    {message.includes('Error') ? 'エラーが発生しました' : '✨ プロフィールを更新しました'}
                </div>
            )}

            <div className="flex justify-center pt-6">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-12 py-3 rounded-full shadow-lg text-white bg-[#8D6E63] hover:bg-[#7A5E53] hover:shadow-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 font-bold tracking-wide"
                >
                    {loading ? '保存中...' : '変更を保存する'}
                </button>
            </div>
        </form>
    )
}
