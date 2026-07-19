# Request Journey — `POST /api/generate`

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js Frontend
    participant API as Express API
    participant Val as Validation Middleware
    participant Svc as GenerationService
    participant AI as Gemini API
    participant Store as Supabase Storage
    participant DB as Supabase PostgreSQL

    User->>FE: Submit prompt + style
    FE->>API: POST /api/generate { prompt, style }
    API->>Val: validate(prompt, style)
    alt invalid (empty or < 5 chars)
        Val-->>FE: 400 "Please describe your interior idea."
    else valid
        Val->>Svc: createGeneration(prompt, style)
        Svc->>DB: INSERT (status = 'processing')
        Svc->>AI: generateContent(finalPrompt)
        alt AI times out (> 45s)
            AI--xSvc: timeout
            Svc->>DB: UPDATE (status = 'failed')
            Svc-->>FE: 504 "The AI service is taking longer than expected. Please try again."
        else AI returns no image data
            AI--xSvc: missing/invalid inline data
            Svc->>DB: UPDATE (status = 'failed')
            Svc-->>FE: 502 "The AI service returned an invalid response. Please try again."
        else AI returns a valid image
            AI-->>Svc: image bytes (base64)
            Svc->>Store: upload(uuid.png, bytes)
            Store-->>Svc: public URL
            Svc->>DB: UPDATE (status = 'completed', image_url)
            Svc-->>FE: 201 { id, prompt, final_prompt, image_url, status, created_at }
            FE->>FE: Prepend result to gallery state
        end
    end
```

## Notes

- The request is **synchronous end-to-end** — the frontend's `fetch` call stays pending for the
  full 10–30 seconds of generation and resolves once the image is uploaded and the database row
  is updated. There's no polling or webhook step; see [`decisions.md`](./decisions.md) for why.
- A database row is created (`status = 'processing'`) **before** the Gemini call, so even if the
  request fails, a `failed` row exists in the gallery — nothing is silently lost.
- `POST /api/generations/:id/regenerate` follows the identical path, except `GenerationService`
  first loads the original record to inherit its prompt/style, then runs a brand-new insert. The
  original row is never updated or deleted.
