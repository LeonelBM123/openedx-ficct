"""
URLs de las APIs de FICCT. Se montan bajo `/api/ficct/` (ver apps.py).
"""
from django.urls import path

from ficct_dashboard_api.avatar_views import AvatarAskView, AvatarTtsTokenView
from ficct_dashboard_api.views import PopularCoursesView

app_name = 'ficct_dashboard_api'

urlpatterns = [
    path('popular-courses/', PopularCoursesView.as_view(), name='popular-courses'),
    path('avatar/ask/', AvatarAskView.as_view(), name='avatar-ask'),
    path('avatar/tts-token/', AvatarTtsTokenView.as_view(), name='avatar-tts-token'),
]
