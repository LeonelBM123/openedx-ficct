import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Icon,
  OverlayTrigger,
  Stack,
  Tooltip,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';

import messages from './messages';

const ProgressSummaryHeader = () => {
  const intl = useIntl();

  return (
    <Stack gap={2} className="mb-3">
      <Stack direction="horizontal" gap={2}>
        <h3 className="h4 m-0">{intl.formatMessage(messages.progressSummary)}</h3>
        <OverlayTrigger
          trigger="hover"
          placement="top"
          overlay={(
            <Tooltip>
              {intl.formatMessage(messages.progressSummaryTooltipBody)}
            </Tooltip>
          )}
        >
          <Icon
            alt={intl.formatMessage(messages.progressSummaryTooltipAlt)}
            src={InfoOutline}
            size="sm"
          />
        </OverlayTrigger>
      </Stack>
    </Stack>
  );
};

export default ProgressSummaryHeader;
