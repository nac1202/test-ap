'use server'

import { auth } from "@/auth"
import { generateUploadSignature } from "@/lib/cloudinary"

export async function getCloudinarySignature() {
    const session = await auth()

    if (!session?.user) {
        return { error: "Login required" }
    }

    try {
        const sig = generateUploadSignature()
        return sig
    } catch (e) {
        console.error("Signature generation failed:", e)
        return { error: "Failed to generate signature" }
    }
}
