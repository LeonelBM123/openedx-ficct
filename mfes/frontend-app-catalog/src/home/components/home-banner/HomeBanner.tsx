import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Form, useToggle, SearchField, Container,
} from '@openedx/paragon';

import { ROUTES } from '@src/routes';
import HomeOverlayHtmlSlot from '@src/plugin-slots/HomeOverlayHtmlSlot';
import { HomePromoVideoButtonSlot, HomePromoVideoModalSlot } from '@src/plugin-slots/HomePromoVideoSlots';

import messages from './messages';

const HomeBanner = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, open, close] = useToggle(false);

  const handleSearch = () => navigate(`${ROUTES.COURSES}?search_query=${searchValue}`);

  // La imagen de fondo del hero llega por MFE_CONFIG (ver tutor-plugins/ficct_config.py).
  // El SCSS lee --catalog-home-page-banner-background-image desde el ::before, que hereda
  // la custom property de esta sección. El degradado va delante de la url() como velo:
  // sin él, el título en blanco de HomePageOverlay queda ilegible sobre la foto.
  const bannerImageUrl = getConfig().HOMEPAGE_BANNER_IMAGE_URL;
  const bannerStyle = bannerImageUrl
    ? ({
      '--catalog-home-page-banner-background-image':
        `linear-gradient(rgba(13, 30, 56, 0.6), rgba(13, 30, 56, 0.6)), url("${bannerImageUrl}")`,
    } as CSSProperties)
    : undefined;

  const searchField = getConfig().ENABLE_COURSE_DISCOVERY && (
    <Form.Group className="mt-4.5">
      <SearchField
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        value={searchValue}
        submitButtonLocation="external"
        onChange={(value: string) => setSearchValue(value)}
        onSubmit={handleSearch}
      />
    </Form.Group>
  );

  return (
    <section
      className="home-banner d-flex justify-content-center align-items-center position-relative overflow-hidden"
      data-testid="home-banner"
      style={bannerStyle}
    >
      <div className="animation-wrapper d-flex justify-content-center align-items-center flex-column p-4 my-5">
        <HomeOverlayHtmlSlot />
        <HomePromoVideoButtonSlot onClick={open} />
        <Container size="sm">
          {searchField}
        </Container>
      </div>
      <HomePromoVideoModalSlot
        isOpen={isOpen}
        close={close}
        videoId={getConfig().HOMEPAGE_PROMO_VIDEO_YOUTUBE_ID || ''}
      />
    </section>
  );
};

export default HomeBanner;
