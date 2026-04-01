# Guía de Despliegue en Vercel

Este proyecto está configurado para despliegue en Vercel con:
- **Backend**: NestJS (Node runtime)
- **Frontend**: Angular 21
- **Base de Datos**: PostgreSQL (vía Prisma ORM)

## Requisitos Previos

1. **Vercel CLI instalado**: `vercel --version` debe retornar versión
2. **Git configurado**: Commits deben estar en la rama `master` o `main`
3. **Cuenta Vercel**: Crear en https://vercel.com/signup

## Pasos de Despliegue

### 1. Autenticarse en Vercel

```bash
vercel login
```

Esto abrirá navegador para confirmar. Seleccione GitHub (recomendado para sincronización automática).

### 2. Conectar Proyecto Local

```bash
vercel link
```

Opciones:
- "Set up and deploy?" → Yes
- "Which scope should contain your project?" → Tu usuario/equipo
- "Link to existing project?" → No (crear nuevo)
- "What's your project's name?" → `prueba-scrap`
- "In which directory is your code?" → `.` (raíz)
- "Want to modify the settings?" → Yes

Esto genera `.vercel/` con `project.json` y `settings.json`.

### 3. Configurar PostgreSQL

**Opción A: Vercel Postgres (Recomendado)**
```bash
vercel postgres create
```

Luego, la variable `DATABASE_URL` se cargará automáticamente en secrets.

**Opción B: PostgreSQL Externo (Supabase, AWS RDS, etc.)**
```bash
vercel env add DATABASE_URL
# Ingresa la URL postgresql://...
```

### 4. Configurar Variables de Entorno

```bash
vercel env add NODE_ENV production
vercel env add API_URL https://prueba-scrap.vercel.app/api
vercel env add FRONTEND_URL https://prueba-scrap.vercel.app
```

### 5. Hacer Deploy

**Preview (opcional antes de producción)**:
```bash
vercel --confirm
```

**Producción**:
```bash
vercel --prod --confirm
```

El deploy debe tomar 5-15 minutos. Verifica en https://vercel.com/dashboard.

## Post-Despliegue

### Migraciones de BD (si usas Prisma)
```bash
# Localmente, después de cualquier cambio en schema.prisma:
npx prisma migrate dev --name descripcion_cambio

# En Vercel (via webhook o manualmente):
vercel env pull  # Descarga secrets locales
npx prisma migrate deploy  # Ejecuta migraciones en BD remota
```

### GitHub Auto-Deploy
- Conecta tu repo GitHub a Vercel (proyecto settings → Git Integration)
- Cada push a `main` dispara deploy automático

## Troubleshooting

| Problema | Solución |
|---|---|
| `DATABASE_URL not found` | Ejecuta `vercel env list` y asegúrate de que existe |
| Build falla | Verifica logs: `vercel logs` |
| TypeScript errors | Compila localmente: `npm run build` en cada carpeta |
| Angular build lento | Vercel cachea dependencias; 2do deploy es más rápido |
| CORS errors | Configura headers en `vercel.json` si es necesario |

## Estructura Post-Deploy

```
https://prueba-scrap.vercel.app/           → Frontend (Angular)
https://prueba-scrap.vercel.app/api/*      → Backend (NestJS)
```

## Próximos Pasos

1. **Autenticación**: Integrar JWT o OAuth2
2. **Secrets management**: Usar `.vercel/project.json` para sincronizar con teams
3. **Monitoreo**: Habilitar Web Analytics y Error Tracking en dashboard
4. **CI/CD mejorado**: Agregaractually GitHub Actions para tests automatizados
