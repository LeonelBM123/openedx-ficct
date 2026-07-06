# Arquitectura General del Proyecto

## Descripción

Plataforma de aprendizaje virtual de la **FICCT-UAGRM** basada en Open edX Ulmo (v21) desplegada con Tutor 21 en un servidor DigitalOcean.

## Infraestructura

| Componente | Detalle |
|------------|---------|
| Servidor | DigitalOcean, Ubuntu |
| IP | 167.172.142.82 |
| Plataforma | Open edX Ulmo (release 21) |
| Gestor | Tutor 21 |
| LMS | http://167.172.142.82.nip.io |
| MFEs (producción) | http://apps.167.172.142.82.nip.io |
| MFEs (desarrollo) | http://apps.167.172.142.82.nip.io:2000 (learning), :1999 (authn), etc. |

## Estructura del Monorepo

```
openedx-ficct/
├── mfes/                        ← Forks de MFEs de Open edX
│   ├── frontend-app-authn/
│   ├── frontend-app-authoring/
│   ├── frontend-app-catalog/
│   ├── frontend-app-learner-dashboard/
│   └── frontend-app-learning/   ← Contiene el módulo avatar/asistente
├── brand-ficct/                 ← Paquete npm @edx/brand con estilos FICCT
├── docker/
│   └── mfe/
│       ├── Dockerfile           ← Dockerfile que construye TODOS los MFEs
│       └── env.config.jsx       ← Registro de plugins por MFE (slot plugins)
├── themes/
│   └── ficct/                   ← Comprehensive Theme para páginas Django legacy
├── tutor-plugins/               ← Plugins de Tutor (fuente de verdad de configuración)
│   ├── brand_ficct.py
│   ├── catalog_mfe.py
│   ├── ficct_config.py
│   └── ficct_theme.py
├── docs/                        ← Esta carpeta
└── CLAUDE.md                    ← Contexto para Claude Code
```

## Dos mundos: MFEs React vs Páginas Legacy

| Contexto | Tecnología | Estilos | Configuración |
|----------|-----------|---------|---------------|
| MFEs React | React + webpack | brand-ficct npm | Tutor MFE_CONFIG → getConfig() |
| Páginas Django | Django templates | Comprehensive Theme | Django settings |

## Flujo de datos de configuración (MFEs)

```
tutor config save --set KEY=valor
        ↓
~/.local/share/tutor/config.yml
        ↓ plugin Python
LMS Django settings → MFE_CONFIG
        ↓ API en runtime
GET /api/mfe_config/v1?mfe=learning
        ↓
getConfig().KEY  (en el código React)
```

**Regla fundamental:** nunca editar `.env` de los MFEs para configuración. Todo va por Tutor config → plugin → MFE_CONFIG.
