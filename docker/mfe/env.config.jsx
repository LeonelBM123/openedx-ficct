

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
      addPlugins(config, 'org.openedx.frontend.layout.studio_footer_logo.v1', [
        {
          op: PLUGIN_OPERATIONS.Hide,
          widgetId: 'default_contents',
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