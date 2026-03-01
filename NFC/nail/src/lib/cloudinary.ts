import { v2 as cloudinary } from 'cloudinary'

// Configuration handles reading from process.env automatically
// CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
cloudinary.config({
    secure: true
})

export default cloudinary

// Function to generate signature for client-side upload
export function generateUploadSignature() {
    // Current timestamp
    const timestamp = Math.round((new Date).getTime() / 1000)

    // Upload parameters that need signing
    // We can restrict folder or tags here if needed
    const transformation = 'w_500,h_500,c_fill,g_face,q_auto,f_auto'

    const params = {
        timestamp: timestamp,
        transformation: transformation
        // folder: 'avatars', // Optional: Organize in folders
        // eager: 'w_400,h_400,c_fill' // Optional: Generate thumbnail on upload
    }

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)

    return {
        timestamp,
        signature,
        transformation,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY
    }
}
