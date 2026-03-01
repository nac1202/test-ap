'use client'

import { generateTags } from "@/actions/admin"
import { useFormStatus } from "react-dom"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-[#5F6F81] text-white px-6 py-2 rounded-lg hover:bg-[#4B5563] transition-colors shadow-sm text-sm font-bold disabled:opacity-50"
        >
            {pending ? '生成中...' : '生成する'}
        </button>
    )
}

export default function TagGeneratorForm() {
    async function handleSubmit(formData: FormData) {
        try {
            console.log("Client submitting...")
            const result = await generateTags(formData)
            console.log("Client result:", result)

            if (result?.success) {
                // Force a reload just in case
                window.location.reload()
                // Router.refresh() is better usually but let's be brute force for debugging
            } else {
                alert("Error: " + (result?.error || "Unknown error"))
            }
        } catch (e) {
            console.error("Client error:", e)
            alert("Client Error")
        }
    }

    return (
        <form action={handleSubmit} className="flex gap-4 items-end">
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">生成数</label>
                <input
                    type="number"
                    name="count"
                    defaultValue={10}
                    min={1}
                    max={100}
                    className="bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg px-4 py-2 w-24 focus:ring-1 focus:ring-[#8D6E63] outline-none"
                />
            </div>
            <SubmitButton />
        </form>
    )
}
