import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PlatformIcon } from '@/components/PlatformIcon';
import ProfileQRCode from '@/components/ProfileQRCode';
import { THEMES } from '@/lib/themes';
import { THEME_CONFIG } from '@/lib/theme-config';
import { Metadata } from 'next';
import AnalyticsTracker from '@/components/AnalyticsTracker';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
    const { handle } = await params
    const user = await prisma.user.findFirst({
        where: { profile: { handle } },
        include: { profile: true }
    })

    if (!user || !user.profile) {
        return {
            title: 'User Not Found | Nail Link System'
        }
    }

    const { displayName, bio, theme } = user.profile
    const title = `${displayName || handle} | Nail Link`
    const description = bio || `Check out ${displayName || handle}'s profile.`

    // Construct OGP URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const ogUrl = new URL('/api/og', baseUrl)
    ogUrl.searchParams.set('handle', handle || '')
    ogUrl.searchParams.set('name', displayName || handle || '')
    ogUrl.searchParams.set('theme', theme || 'STANDARD')

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: `${displayName}'s Profile`,
                }
            ],
            type: 'profile',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogUrl.toString()],
        }
    }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;

    const user = await prisma.user.findFirst({
        where: { profile: { handle } },
        include: { profile: true }
    });

    if (!user || !user.profile) {
        return notFound();
    }

    const { displayName, bio, linksJson, avatarUrl, theme } = user.profile as any;
    let links: any[] = [];
    try {
        links = linksJson ? JSON.parse(linksJson) : [];
    } catch { }

    // Resolve Theme
    const style = THEME_CONFIG[theme] || THEME_CONFIG.STANDARD;

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${style.bg} ${style.font}`}>
            <AnalyticsTracker handle={handle} />
            <div className={`max-w-sm w-full space-y-8 p-10 rounded-2xl relative overflow-hidden ${style.card}`}>

                {/* Background Decoration */}
                {style.decorative && (
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-white to-transparent opacity-40 rounded-full blur-2xl pointer-events-none"></div>
                )}

                {/* Luxury Decorations */}
                {style.customDecoration === 'SAGE' && (
                    <>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#DcedC8] opacity-20 rounded-bl-full pointer-events-none"></div>
                        <div className="absolute bottom-10 left-4 text-3xl opacity-30 rotate-12">🌿</div>
                        <div className="absolute top-10 left-10 text-2xl opacity-20 -rotate-45">🍃</div>
                    </>
                )}
                {style.customDecoration === 'GREIGE' && (
                    <div className="absolute inset-2 border border-dashed border-[#A6A29D] rounded-xl pointer-events-none opacity-30"></div>
                )}
                {style.customDecoration === 'NAVY' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#C5A065] opacity-50"></div>
                )}

                {/* Refined Decorations */}
                {style.customDecoration === 'ELEGANT' && (
                    <>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-100 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-rose-100 to-transparent rounded-tr-full opacity-50 pointer-events-none"></div>
                    </>
                )}
                {style.customDecoration === 'POP' && (
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                )}

                {/* Seasonal Decorations */}
                {style.customDecoration === 'VALENTINE' && (
                    <>
                        <div className="absolute top-0 right-10 w-20 h-20 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
                        <div className="absolute bottom-10 left-4 text-4xl opacity-20 rotate-12">💝</div>
                        <div className="absolute top-4 right-4 text-2xl opacity-20 -rotate-12">🍫</div>
                    </>
                )}
                {style.customDecoration === 'SAKURA' && (
                    <>
                        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-200/30 rounded-full blur-3xl"></div>
                        <div className="absolute top-4 right-8 text-2xl opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>🌸</div>
                        <div className="absolute bottom-20 left-4 text-xl opacity-40 animate-bounce" style={{ animationDuration: '4s' }}>🌸</div>
                    </>
                )}
                {style.customDecoration === 'SUMMER' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 left-4 text-4xl opacity-20">🫧</div>
                        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🌊</div>
                    </>
                )}
                {style.customDecoration === 'HALLOWEEN' && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_#A020F0]"></div>
                        <div className="absolute top-2 right-2 text-3xl opacity-30">🕸️</div>
                        <div className="absolute bottom-2 left-2 text-3xl opacity-30">🎃</div>
                    </>
                )}
                {style.customDecoration === 'CHRISTMAS' && (
                    <>
                        {/* Snowflakes */}
                        <div className="absolute top-4 left-10 text-white opacity-40 text-xl">❄️</div>
                        <div className="absolute bottom-10 right-10 text-white opacity-40 text-2xl">❄️</div>
                        <div className="absolute top-1/2 left-2 text-yellow-300 opacity-60 text-lg">✨</div>
                    </>
                )}
                {style.customDecoration === 'NEW_YEAR' && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-white to-red-600"></div>
                        <div className="absolute top-4 right-4 text-4xl opacity-30">🎍</div>
                        <div className="absolute bottom-4 left-4 text-3xl opacity-30">🌅</div>
                    </>
                )}

                <div className="text-center relative z-10 transition-transform duration-700 ease-out transform translate-y-0">
                    <div className="relative inline-block group">
                        {avatarUrl ? (
                            <img
                                className={`mx-auto h-28 w-28 rounded-full object-cover border-[3px] border-white shadow-md transition-transform duration-500 group-hover:scale-105`}
                                src={avatarUrl}
                                alt={displayName || handle}
                            />
                        ) : (
                            <div className={`mx-auto h-28 w-28 rounded-full flex items-center justify-center text-4xl border-[3px] border-white shadow-md ${style.bg} ${style.subtext}`}>
                                {displayName?.[0] || handle[0]}
                            </div>
                        )}
                    </div>

                    <h1 className={`mt-6 text-xl font-bold tracking-wide ${style.text}`}>{displayName || handle}</h1>
                    <p className={`text-xs ${style.subtext} mt-2 font-mono tracking-wider opacity-80`}>@{handle}</p>
                </div>

                {bio && (
                    <div className={`text-sm text-center relative z-10 leading-relaxed px-2 ${style.subtext}`}>
                        <p className="whitespace-pre-wrap">{bio}</p>
                    </div>
                )}

                <div className="space-y-3 relative z-10 pt-2">
                    {links.map((link: any, idx: number) => (
                        <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center px-5 py-3.5 rounded-xl border transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-md ${style.button}`}
                        >
                            <div className={`mr-4 text-xl group-hover:scale-110 transition-transform ${style.accent}`}>
                                <PlatformIcon id={link.type || 'website'} />
                            </div>
                            <span className="text-sm font-bold tracking-wide flex-1">{link.label}</span>
                            <span className={`text-xs opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 ${style.subtext}`}>
                                OPEN
                            </span>
                        </a>
                    ))}
                    {links.length === 0 && (
                        <div className={`text-center py-8 border-2 border-dashed rounded-xl opacity-50 border-gray-200`}>
                            <p className={`text-xs ${style.subtext}`}>リンクの設定がありません</p>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center space-y-8 relative z-10 pt-6">
                    {/* QR Code Accordion style or subtle footer */}
                    <div className="flex flex-col items-center gap-4">
                        <p className={`text-[10px] uppercase tracking-[0.2em] opacity-40 ${style.text}`}>Scan to Share</p>
                        <div className={`p-3 bg-white rounded-lg shadow-sm w-fit mx-auto opacity-80 hover:opacity-100 transition-opacity`}>
                            <ProfileQRCode url={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/u/${handle}`} size={80} />
                        </div>
                    </div>

                    <Link href="/" className={`block text-[10px] hover:text-[#8D6E63] transition-colors ${style.subtext} relative z-20`}>
                        Powered by Nail Link
                    </Link>
                </div>
            </div>
        </div>
    )
}
