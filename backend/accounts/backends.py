from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using their email address.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Try to find user by email (which could be passed as username)
            user = User.objects.get(Q(email__iexact=username) | Q(email__iexact=kwargs.get('email', '')))
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            # If somehow there are multiple users with the same email, get the first one
            user = User.objects.filter(Q(email__iexact=username) | Q(email__iexact=kwargs.get('email', ''))).first()
        
        if user and user.check_password(password) and user.is_active:
            return user
        return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
