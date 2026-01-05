# Guía: Proteger Telegram e ImgBB con Edge Functions

## Por qué es necesario

Actualmente los tokens de Telegram e ImgBB están expuestos en `config.js`.
Con Edge Functions, estos tokens quedan en el servidor de Supabase (ocultos).

## Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

## Paso 2: Inicializar en tu proyecto

```bash
cd demo-malteadas
supabase init
supabase login
supabase link --project-ref TU_PROJECT_ID
```

(El project ID está en Supabase > Settings > General)

## Paso 3: Crear función para Telegram

```bash
supabase functions new send-telegram
```

Editar `supabase/functions/send-telegram/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

serve(async (req) => {
  // Verificar origen
  const origin = req.headers.get('origin')
  if (!origin?.includes('madfer93.github.io')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { message } = await req.json()

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    }
  )

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://madfer93.github.io'
    }
  })
})
```

## Paso 4: Configurar secretos

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=tu-token-aqui
supabase secrets set TELEGRAM_CHAT_ID=tu-chat-id-aqui
supabase secrets set IMGBB_API_KEY=tu-api-key-aqui
```

## Paso 5: Desplegar

```bash
supabase functions deploy send-telegram
```

## Paso 6: Usar desde el frontend

En vez de:
```javascript
fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, ...)
```

Usar:
```javascript
const { data } = await supabase.functions.invoke('send-telegram', {
  body: { message: 'Nuevo pedido!' }
})
```

---

## Alternativa simple (sin Edge Functions)

Si no quieres complicarte, puedes:

1. **Crear tokens nuevos** para producción (diferentes al demo)
2. **Limitar el bot de Telegram** solo a tu grupo
3. **Monitorear uso** de ImgBB

Los riesgos reales son bajos:
- Telegram: Alguien podría enviar mensajes a tu grupo (molesto pero no peligroso)
- ImgBB: Alguien podría subir imágenes usando tu cuenta (límite gratuito es alto)
- Supabase: Con RLS + dominio restringido, está protegido
