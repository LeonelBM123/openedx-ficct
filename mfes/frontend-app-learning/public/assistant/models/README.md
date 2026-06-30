# Assets del asistente virtual (pendientes)

Esta carpeta debe contener los modelos 3D referenciados en
`src/asistente/AvatarSwitcher.jsx` (`AVATAR_LIST`):

- `avatar-profesora.glb`
- `avatar-profesor.glb`

Cada modelo debe incluir morph targets (blendshapes) ARKit de visema para
que `src/asistente/Avatar.jsx` pueda animar la boca en sincronía con el
audio (`viseme_sil`, `viseme_PP`, `viseme_FF`, `viseme_TH`, `viseme_DD`,
`viseme_kk`, `viseme_CH`, `viseme_SS`, `viseme_nn`, `viseme_RR`,
`viseme_aa`, `viseme_E`, `viseme_I`, `viseme_O`, `viseme_U`).

Estos son archivos binarios provistos por el equipo de 3D (Otsubo) — no se
generan por código y deben copiarse aquí manualmente antes de activar
`AVATAR_ENABLED=true`.
