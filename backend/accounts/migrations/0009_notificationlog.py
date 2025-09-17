from django.db import migrations, models
import django.conf


class Migration(migrations.Migration):

	dependencies = [
		('accounts', '0008_vendor_bio_vendor_wallet_address_vendor_wallet_chain'),
	]

	operations = [
		migrations.CreateModel(
			name='NotificationLog',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('kind', models.CharField(choices=[('trial_ending', 'Trial Ending Soon'), ('trial_expired', 'Trial Expired'), ('plan_ending', 'Plan Ending Soon'), ('plan_expired', 'Plan Expired')], max_length=32)),
				('created_at', models.DateTimeField(auto_now_add=True)),
				('vendor', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='notification_logs', to=django.conf.settings.AUTH_USER_MODEL)),
			],
			options={
				'ordering': ['-created_at'],
				'unique_together': {('vendor', 'kind')},
			},
		),
	]

