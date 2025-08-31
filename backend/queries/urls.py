from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QueryViewSet

app_name = "queries"

router = DefaultRouter()
router.register(r"", QueryViewSet, basename="query")

urlpatterns = [
    path("", include(router.urls)),
]
