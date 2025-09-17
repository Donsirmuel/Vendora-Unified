from django.contrib.sitemaps import Sitemap
from django.urls import reverse

# Static views (landing + legal + auth) that we want indexed
class StaticViewSitemap(Sitemap):
    priority = 0.6
    changefreq = "daily"

    def items(self):
        # These names must correspond to urlpattern names
        return [
            'landing-home',  # landing root page (React index or marketing page)
            'terms',
            'privacy',
        ]

    def location(self, item):  # type: ignore[override]
        return reverse(item)
