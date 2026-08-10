"""
URLs de las APIs de FICCT en Studio (CMS). Se montan bajo `/api/ficct/` (ver apps.py).
"""
from django.urls import path

from ficct_dashboard_api.cms_views import RequestCourseCreatorView

app_name = 'ficct_dashboard_api'

urlpatterns = [
    path('request-course-creator/', RequestCourseCreatorView.as_view(), name='request-course-creator'),
]
