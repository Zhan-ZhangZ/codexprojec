import type { Buffer } from 'node:buffer'

import type { Result } from '@unbird/result'

import type { LLMConfig, VisionLLMConfig } from '../types/account-settings'

import { Err, Ok } from '@unbird/result'
import { generateText } from '@xsai/generate-text'

export interface DescribeImageResult {
  description: string
}

export async function describeImage(
  imageData: Buffer | Uint8Array,
  visionConfig: VisionLLMConfig | LLMConfig,
): Promise<Result<DescribeImageResult>> {
  try {
    // Fail fast to avoid sending malformed requests to the vision provider.
    if (!visionConfig.apiBase || !visionConfig.model) {
      return Err('Vision LLM apiBase and model are required for photo embedding')
    }

    // Encode image bytes into a data URL payload accepted by multimodal APIs.
    let base64Image: string
    if (imageData instanceof Uint8Array) {
      // NOTICE: Browser runtime does not provide Buffer by default.
      const binaryString = Array.from(imageData)
        .map(byte => String.fromCharCode(byte))
        .join('')
      base64Image = btoa(binaryString)
    }
    else {
      // Node runtime supports direct base64 encoding from Buffer.
      base64Image = (imageData as unknown as Buffer).toString('base64')
    }

    // Infer MIME type from signature bytes to improve model compatibility.
    let mimeType = 'image/jpeg'
    if (imageData[0] === 0x89 && imageData[1] === 0x50) {
      mimeType = 'image/png'
    }
    else if (imageData[0] === 0x47 && imageData[1] === 0x49) {
      mimeType = 'image/gif'
    }
    else if (imageData[0] === 0x52 && imageData[1] === 0x49) {
      mimeType = 'image/webp'
    }

    // Wrap base64 payload into a data URL for the image_url content type.
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    // Call the vision-capable model and request concise scene description.
    const result = await generateText({
      baseURL: visionConfig.apiBase,
      model: visionConfig.model,
      apiKey: visionConfig.apiKey,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in 1-2 sentences. Focus only on the main subject and key details. Be concise and specific.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      maxTokens: visionConfig.maxTokens || 1024,
      temperature: visionConfig.temperature || 0.7,
    })

    const description = result.text

    if (!description) {
      return Err('No description generated from the model')
    }

    return Ok({ description })
  }
  catch (err) {
    return Err(err)
  }
}
