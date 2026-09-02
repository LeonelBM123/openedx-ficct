

function addPlugins(config, slot_name, plugins) {
  if (slot_name in config.pluginSlots === false) {
    config.pluginSlots[slot_name] = {
      keepDefault: true,
      plugins: []
    };
  }

  config.pluginSlots[slot_name].plugins.push(...plugins);
}

async function setConfig () {
  let config = {
    pluginSlots: {}
  };

  try {
    /* We can't assume FPF exists, as it's not declared as a dependency in all
     * MFEs, so we import it dynamically. In addition, for dynamic imports to
     * work with Webpack all of the code that actually uses the imported module
     * needs to be inside the `try{}` block.
     */
    const { DIRECT_PLUGIN, PLUGIN_OPERATIONS } = await import('@openedx/frontend-plugin-framework');
    if (process.env.APP_ID == 'admin-console') {
    }
    if (process.env.APP_ID == 'authn') {
    }
    if (process.env.APP_ID == 'authoring') {
      const { getConfig } = await import('@edx/frontend-platform');

      addPlugins(config, 'org.openedx.frontend.layout.studio_footer_logo.v1', [
        {
          // Reemplaza el logo "Powered by Open edX" por el de la facultad,
          // enlazando al learner-dashboard en vez de a openedx.org.
          op: PLUGIN_OPERATIONS.Hide,
          widgetId: 'default_contents',
        },
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'ficct_footer_logo',
            type: DIRECT_PLUGIN,
            RenderWidget: () => (
              <a href={`https://${getConfig().BASE_URL}/learner-dashboard/`} className="float-right">
                <img src={getConfig().LOGO_URL} alt="FICCT" width="120" />
              </a>
            ),
          },
        },
      ]);
    }
    if (process.env.APP_ID == 'account') {
    }
    if (process.env.APP_ID == 'communications') {
    }
    if (process.env.APP_ID == 'discussions') {
    }
    if (process.env.APP_ID == 'gradebook') {
    }
    if (process.env.APP_ID == 'learner-dashboard') {
    }
    if (process.env.APP_ID == 'learning') {
      const React = (await import('react')).default;
      const AvatarTour = React.lazy(() => import('./src/asistente/AvatarTour'));

      class AvatarErrorBoundary extends React.Component {
        constructor(props) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError() { return { hasError: true }; }
        render() { return this.state.hasError ? null : this.props.children; }
      }

      addPlugins(config, 'org.openedx.frontend.layout.header_learning.v1', [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'avatar_tour_widget',
            type: DIRECT_PLUGIN,
            priority: 1,
            RenderWidget: () => (
              <AvatarErrorBoundary>
                <React.Suspense fallback={null}>
                  <AvatarTour tourName="learning" />
                </React.Suspense>
              </AvatarErrorBoundary>
            ),
          },
        },
      ]);

      // Oculta el link "Ayuda" del header (usa SUPPORT_URL, que no está configurado en este proyecto).
      addPlugins(config, 'org.openedx.frontend.layout.header_learning_help.v1', [
        {
          op: PLUGIN_OPERATIONS.Hide,
          widgetId: 'default_contents',
        },
      ]);
    }
    if (process.env.APP_ID == 'ora-grading') {
    }
    if (process.env.APP_ID == 'profile') {
    }
    if (process.env.APP_ID == 'catalog') {
    }
  } catch (err) { console.error("env.config.jsx failed to apply: ", err);}

  return config;
}

export default setConfig;