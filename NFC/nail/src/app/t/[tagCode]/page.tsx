import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import TagQRCode from '@/components/TagQRCode';

async function getTag(code: string) {
    const tag = await prisma.tag.findUnique({
        where: { tagCode: code },
        include: {
            profile: true,
            replacedBy: {
                include: {
                    profile: true
                }
            }
        }
    });
    return tag;
}

export default async function TagEntryPage({ params }: { params: Promise<{ tagCode: string }> }) {
    const { tagCode } = await params;
    const tag = await getTag(tagCode);

    if (!tag) {
        return notFound();
    }

    // Logic Branching based on Status
    switch (tag.status) {
        case 'ACTIVE':
            if (tag.profile?.handle) {
                redirect(`/u/${tag.profile.handle}`);
            }
            return (
                <div className="p-8 text-center text-red-500">
                    <h1 className="text-2xl font-bold mb-4">Error</h1>
                    <p>Tag is active but has no linked profile.</p>
                </div>
            );

        case 'CREATED':
        case 'SHIPPED':
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">ようこそ！</h1>
                        <p className="text-gray-600 mb-6">このNFCタグは利用可能です。</p>

                        <div className="space-y-4">
                            <Link
                                href={`/app/activate?code=${tagCode}`}
                                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
                            >
                                タグを有効化する
                            </Link>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <p className="text-sm text-gray-500 mb-2">NFCが読み取れない場合はQRコードをご利用ください:</p>
                            <p className="text-xs text-gray-400 mb-4">※ iPhoneの方は端末の上端をタグにかざしてください</p>
                            <TagQRCode value={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/t/${tagCode}`} />
                        </div>

                        <p className="mt-6 text-xs text-gray-400">Tag ID: {tagCode}</p>
                    </div>
                </div>
            );

        case 'REPLACED':
            return (
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">タグ交換済み</h1>
                        <p className="text-gray-600 mb-6">
                            このタグは新しいタグに交換されたため、無効化されています。
                        </p>

                        {tag.replacedBy?.profile?.handle && (
                            <Link
                                href={`/u/${tag.replacedBy.profile.handle}`}
                                className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition"
                            >
                                現在のプロフィールを見る
                            </Link>
                        )}
                    </div>
                </div>
            );

        case 'DISABLED':
        case 'DEFECT':
            return (
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                        <h1 className="text-xl font-bold text-red-600 mb-2">タグ無効</h1>
                        <p className="text-gray-600">このタグは無効化されています。</p>
                    </div>
                </div>
            );

        default:
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <p>Unknown Tag Status</p>
                </div>
            );
    }
}
