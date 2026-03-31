# Scouting FEB - Brief de Diseño para Stitch

## 📋 Resumen Ejecutivo

Necesitamos diseñar una interfaz profesional para **"Scouting FEB"**, una aplicación web de análisis de posesiones y quintetos de baloncesto FEB (Liga Española de Segunda División).

La aplicación sigue un **flujo guiado de 6 pasos bloqueados**, donde cada paso solo se desbloquea cuando el anterior está completado. El usuario selecciona ligas, grupos, equipos, partidos, jugadores, y finalmente ejecuta análisis de posesiones.

---

## 🎯 Objetivo de Diseño

Crear una **interfaz intuitiva, profesional y responsive** que:
- Guíe al usuario a través de un flujo secuencial claro
- Utilice **tarjetas visuales** para selecciones (no desplegables tradicionales)
- Muestre **datos en tiempo real** del baloncesto español
- Sea **accesible** y **amigable para scouts y analistas deportivos**

---

## 🏗️ Arquitectura de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: LIGA (Siempre visible)                              │
│ Selecciona competición (22 ligas: Endesa, Segunda FEB, etc) │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 2: GRUPO (Se desbloquea tras seleccionar liga)         │
│ Selecciona subgrupo (ej: Grupo por defecto, ESTE, OESTE)    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 3: EQUIPO (Se desbloquea tras seleccionar grupo)       │
│ Selecciona equipo (tarjetas con nombres reales)             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 4: PARTIDOS (Se desbloquea tras seleccionar equipo)    │
│ Filtros avanzados:                                          │
│ • Local/Visitante (Todos, Solo local, Solo visitante)       │
│ • Resultado (Todos, Victorias, Derrotas)                    │
│ • Rival específico (dropdown con equipos)                   │
│ • Modo: Todos filtrados vs Selección manual                 │
│                                                              │
│ Visualiza: Foto equipo rival, puntuación, resultado         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 5: JUGADORES (Se desbloquea tras seleccionar partidos) │
│ Muestra roster del equipo con fotos y datos                 │
│ Selector: 1-5 jugadores en pista (quinteto)                 │
│ Opciones: Modo quinteto, Solo victorias, Rival para análisis│
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 6: EJECUTAR (Se desbloquea tras seleccionar jugadores) │
│ Botón "Lanzar análisis" → inicia cálculo de posesiones      │
│ Muestra estado: idle, running, completed, error             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Componentes de UI Clave

### 1. **Tarjetas de Selección (Pasos 1-3)**
- **Diseño**: Tarjeta rectangular con borde sutil, sombra, transición suave
- **Contenido**: 
  - Título en bold (nombre de liga/grupo/equipo)
  - Subtítulo gris (metadato: "Temporada 2025", "Grupo Regular", etc)
- **Estados**:
  - Default: Fondo blanco, cursor pointer
  - Hover: Sombra más pronunciada, ligero cambio de color
  - Active: Fondo de color primario (azul), texto blanco, checkmark visual
  - Disabled: Opacidad 50%, cursor not-allowed
- **Tamaño**: Responsivo; en desktop: ~3-4 columnas; mobile: ~2 columnas

### 2. **Cartas de Partidos (Paso 4)**
- **Diseño**: Contenedor compacto con información del partido
- **Datos mostrados**:
  - Número de partido (ID)
  - Local/Visitante (ícono o etiqueta)
  - Resultado (Victoria/Derrota con icono)
  - Marcador (ej: "85-72")
  - Equipo rival (opcional, con logo si está disponible)
- **Estado interactivo**:
  - Si modo "Todos filtrados": Deshabilitada pero seleccionada (checkmark)
  - Si modo "Manual": Clickeable, toggle on/off con checkbox
- **Filtros**: Dropdowns limpios con opciones claramente etiquetadas

### 3. **Tarjetas de Jugadores (Paso 5)**
- **Diseño**: Tarjeta cuadrada o rectangular con foto, nombre, stats
- **Contenido**:
  - Foto (circular o rectangular, 100-150px)
  - Nombre completo
  - Número de apariciones (acciones en los partidos)
  - Estado de selección: checkbox o toggle visual
- **Estados**:
  - Unselected: Fondo gris claro, foto semi-opaca
  - Selected: Fondo azul, foto con opacidad completa, checkmark
  - Límite visual: Mostrar "1/5", "2/5", etc. al seleccionar
  - Hover: Destacar tarjeta, mostrar tooltip si es necesario

### 4. **Sección de Estado / Logs (Lado derecho o panel flotante)**
- **Información**:
  - Estado del job (idle, running, completed, error)
  - Job ID (si aplica)
  - Log de eventos en tiempo real
  - Botones: Borrar, Exportar
- **Diseño**: Panel oscuro/semi-transparente, tipografía monoespaciada para logs
- **Responsividad**: En mobile, convertir a expandible/modal

### 5. **Botones de Acción**
- **Primario (Lanzar análisis)**: Color azul llamativo, padding generoso, transición suave
- **Secundario (Cargar jugadores, Limpiar)**: Outline o fondo gris claro
- **Deshabilitado**: Opacidad reducida, cursor not-allowed
- **Feedback**: Al hacer click, mostrar loading spinner breve

---

## 🎭 Paleta de Colores Sugerida

| Elemento | Color | Código |
|----------|-------|--------|
| Primario (Botones, Active) | Azul Profesional | #0051BA |
| Secundario (Hover) | Azul Claro | #E3F2FD |
| Fondo | Blanco/Gris muy claro | #FFFFFF / #F5F5F5 |
| Texto Primario | Gris Oscuro | #212121 |
| Texto Secundario | Gris Medio | #757575 |
| Éxito (Victorious) | Verde | #4CAF50 |
| Derrota | Rojo | #F44336 |
| Estado Neutral | Naranja | #FF9800 |
| Sombras | Negro con opacidad | rgba(0,0,0,0.1) |

---

## 📐 Tipografía

- **Headings (H1, H2)**: Bold, 24px-32px, color primario
- **Titles (H3, H4)**: Semi-bold, 16px-18px, gris oscuro
- **Body Text**: Regular, 14px-16px, gris oscuro
- **Labels & Tags**: Medium, 12px-14px, gris medio
- **Monoespaciada (Logs)**: Courier/Monaco, 11px-12px, #212121

---

## 📱 Breakpoints y Responsividad

| Dispositivo | Ancho | Cambios |
|-----------|-------|---------|
| Mobile | 320px - 767px | 1-2 columnas, panel estado en modal, buttons full-width |
| Tablet | 768px - 1023px | 2-3 columnas, panel estado lateral colapsible |
| Desktop | 1024px+ | 3-4 columnas, layout principal + panel estado lado derecho |

---

## 🎬 Interacciones y Animaciones

1. **Transición entre pasos**: Fade-in suave (200-300ms) del nuevo paso
2. **Selección de tarjeta**: Pulse o scale-up animation (100-150ms)
3. **Hover en botones**: Cambio de sombra y color (150ms)
4. **Loading spinner**: Rotation suave infinita (1.5s cycle)
5. **Errores**: Shake animation breve (300ms) + mensaje en rojo
6. **Filtros**: Debounce 300ms antes de recargar resultados

---

## 🌐 Datos de Integración (Backend)

### APIs disponibles:
```
GET /feb/leagues                           → 22+ ligas
GET /feb/leagues/:leagueId/teams           → Grupos y equipos
GET /feb/teams/:teamId/players             → Roster (con fotos)
GET /feb/teams/:teamId/matches             → Partidos con metadatos
GET /feb/teams/:teamId/action-players      → Jugadores por acciones
POST /analysis/jobs                        → Lanzar análisis
GET /analysis/jobs/:jobId                  → Status del job
```

### Datos de ejemplo moqueados (para UI testing sin backend):
- 5 partidos ficticios (1001-1005)
- 12 jugadores del roster (con fotos reales de FEB)
- Scores y resultados randomizados

---

## ✅ Checklist de Diseño

- [ ] Moodboard / Referentes visuales proporcionados
- [ ] Paleta de colores finalizada y documentada
- [ ] Wireframes de los 6 pasos (desktop + mobile)
- [ ] Componentes en Figma (tarjeta, botón, dropdown, etc)
- [ ] Estados interactivos diseñados (hover, active, disabled, loading)
- [ ] Prototipos de animaciones (transiciones, clicks)
- [ ] Guía de espaciado y tipografía (design tokens)
- [ ] Assets (iconos, logos FEB si aplica)
- [ ] Feedback del equipo (iteración 1)
- [ ] Entrega final de diseño en Figma (exportable a componentes)

---

## 📞 Información de Contacto

**Desarrollador Frontend**: Angular 18+, TypeScript, componentes standalone  
**Desarrollador Backend**: NestJS, Node.js, Cheerio para scraping  
**Deploy**: ngServe + npm run start (dev), build en prod

---

## 🚀 Próximos Pasos

1. **Stitch**: Crear proyecto de diseño en Figma
2. **Iteración 1**: Review de wireframes y paleta
3. **Componentes**: Exportar como figma-tokens o design system
4. **Handoff**: Entregar specs de UI a frontend para implementación
5. **Testing**: QA visual en navegador (desktop, tablet, mobile)

---

**Versión**: 1.0  
**Fecha**: 31 de Marzo de 2026  
**Estado**: Listo para Stitch Design
