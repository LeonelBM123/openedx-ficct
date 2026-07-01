import React from 'react';
import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';

class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[AvatarTour] crash:', error, info);
  }

  render() {
    if (this.state.hasError) { return null; }
    return this.props.children;
  }
}

const AvatarTour = React.lazy(() => import('./src/asistente/AvatarTour'));

const config = {
  pluginSlots: {
    'org.openedx.frontend.layout.header_learning.v1': {
      keepDefault: true,
      plugins: [
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
      ],
    },
  },
};

export default config;
